import dayjs from "dayjs";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useNotifications } from "../../features/notifications/hooks/useNotifications.js";

export const NotificationsPage = () => {
  const { notificationsQuery, markReadMutation } = useNotifications();
  const notifications = notificationsQuery.data || [];

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow="Notifications"
        title="Centre de notifications"
        description="Messages systeme, confirmations de visite, nouvelles annonces et activite commerciale."
      />
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card key={notification._id} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">{notification.title}</p>
              <p className="mt-2 text-sm text-stone-300">{notification.body}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                {notification.type} • {dayjs(notification.createdAt).format("DD/MM/YYYY HH:mm")}
              </p>
            </div>
            <Button
              variant="secondary"
              className="px-4 py-2"
              disabled={markReadMutation.isPending || notification.isRead}
              onClick={() => markReadMutation.mutate(notification._id)}
            >
              {notification.isRead ? "Lue" : "Marquer comme lue"}
            </Button>
          </Card>
        ))}
        {!notifications.length ? (
          <Card>
            <p className="text-sm text-stone-300">Aucune notification pour le moment.</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};
