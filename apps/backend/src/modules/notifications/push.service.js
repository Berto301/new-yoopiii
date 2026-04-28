import webpush from "web-push";
import { env } from "../../config/env.js";
import { PushSubscription } from "./push-subscription.model.js";
import { User } from "../users/user.model.js";

const isPushConfigured = () => Boolean(env.pushVapidPublicKey && env.pushVapidPrivateKey && env.pushVapidSubject);

if (isPushConfigured()) {
  webpush.setVapidDetails(env.pushVapidSubject, env.pushVapidPublicKey, env.pushVapidPrivateKey);
}

export const getPushPublicKeyDescriptor = () => ({
  pushSupported: isPushConfigured(),
  publicKey: env.pushVapidPublicKey || ""
});

export const upsertPushSubscription = async ({ userId, subscription, userAgent = "" }) => {
  const nextValues = {
    userId,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    },
    userAgent
  };

  return PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { $set: nextValues },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
};

export const removePushSubscription = async ({ userId, endpoint }) =>
  PushSubscription.findOneAndDelete({ userId, endpoint }).lean();

export const getPushSubscriptionStatus = async ({ userId }) => {
  const subscription = await PushSubscription.findOne({ userId }).lean();

  return {
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint || ""
  };
};

export const dispatchPushNotifications = async (notifications = []) => {
  if (!isPushConfigured() || !notifications.length) {
    return;
  }

  const userIds = [...new Set(notifications.map((item) => String(item.userId)).filter(Boolean))];
  const [subscriptions, users] = await Promise.all([
    PushSubscription.find({ userId: { $in: userIds } }).lean(),
    User.find({ _id: { $in: userIds }, "preferences.pushNotificationsEnabled": true, "preferences.notificationsEnabled": true })
      .select("_id")
      .lean()
  ]);
  const allowedUserIds = new Set(users.map((user) => String(user._id)));

  const subscriptionsByUserId = subscriptions.reduce((collection, subscription) => {
    const key = String(subscription.userId);

    if (!collection.has(key)) {
      collection.set(key, []);
    }

    collection.get(key).push(subscription);
    return collection;
  }, new Map());

  await Promise.all(
    notifications.flatMap((notification) => {
      const userId = String(notification.userId);

      if (!allowedUserIds.has(userId)) {
        return [];
      }

      const userSubscriptions = subscriptionsByUserId.get(userId) || [];

      return userSubscriptions.map(async (subscription) => {
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          type: notification.type,
          tag: notification.type,
          data: {
            ...notification.data,
            url: notification.data?.conversationId
              ? `/messages?conversationId=${notification.data.conversationId}`
              : "/notifications"
          }
        });

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime).getTime() : null,
              keys: subscription.keys
            },
            payload
          );

          await PushSubscription.updateOne({ _id: subscription._id }, { $set: { lastSuccessAt: new Date() } });
        } catch (error) {
          const statusCode = error?.statusCode;

          if ([404, 410].includes(statusCode)) {
            await PushSubscription.deleteOne({ _id: subscription._id });
            return;
          }

          await PushSubscription.updateOne({ _id: subscription._id }, { $set: { lastFailureAt: new Date() } });
        }
      });
    })
  );
};
