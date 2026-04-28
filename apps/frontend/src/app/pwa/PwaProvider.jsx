import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../store/session.store.js";
import {
  createPushSubscription,
  deletePushSubscription,
  getPushPublicKey,
  getPushSubscriptionStatus
} from "../../features/notifications/services/notification.service.js";

const PwaContext = createContext({
  canInstall: false,
  isInstalled: false,
  installApp: async () => false,
  pushSupported: false,
  pushPermission: "default",
  pushEnabled: false,
  pushBusy: false,
  pushConfigured: false,
  enablePush: async () => false,
  disablePush: async () => false
});

const base64UrlToUint8Array = (value) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
};

const isStandaloneDisplay = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;

export const PwaProvider = ({ children }) => {
  const user = useSelector(selectCurrentUser);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [pushPermission, setPushPermission] = useState(typeof Notification === "undefined" ? "default" : Notification.permission);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [isInstalled, setIsInstalled] = useState(typeof window !== "undefined" ? isStandaloneDisplay() : false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }

    let cancelled = false;

    navigator.serviceWorker.register("/sw.js").then((nextRegistration) => {
      if (!cancelled) {
        setRegistration(nextRegistration);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");

    if (!mediaQuery) {
      return undefined;
    }

    const syncInstalledState = () => {
      setIsInstalled(isStandaloneDisplay());
    };

    syncInstalledState();
    mediaQuery.addEventListener?.("change", syncInstalledState);

    return () => {
      mediaQuery.removeEventListener?.("change", syncInstalledState);
    };
  }, []);

  useEffect(() => {
    if (!user || !registration || !("PushManager" in window) || !("Notification" in window)) {
      setPushEnabled(false);
      return;
    }

    let cancelled = false;

    const syncPushState = async () => {
      try {
        const [{ publicKey, pushSupported }, status, localSubscription] = await Promise.all([
          getPushPublicKey(),
          getPushSubscriptionStatus(),
          registration.pushManager.getSubscription()
        ]);

        if (cancelled) {
          return;
        }

        setPushConfigured(Boolean(pushSupported && publicKey));
        setPushEnabled(Boolean(status?.subscribed || localSubscription));
      } catch (_error) {
        if (!cancelled) {
          setPushConfigured(false);
          setPushEnabled(false);
        }
      }
    };

    syncPushState();

    return () => {
      cancelled = true;
    };
  }, [registration, user]);

  const installApp = async () => {
    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice?.outcome === "accepted";
  };

  const enablePush = async () => {
    if (!user || !registration || !("PushManager" in window) || !("Notification" in window)) {
      return false;
    }

    setPushBusy(true);

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        return false;
      }

      const { publicKey, pushSupported } = await getPushPublicKey();

      if (!pushSupported || !publicKey) {
        setPushConfigured(false);
        return false;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(publicKey)
        });
      }

      await createPushSubscription(subscription.toJSON());
      setPushConfigured(true);
      setPushEnabled(true);
      return true;
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    if (!registration) {
      return false;
    }

    setPushBusy(true);

    try {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await deletePushSubscription({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      return true;
    } finally {
      setPushBusy(false);
    }
  };

  const value = useMemo(() => ({
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    installApp,
    pushSupported: Boolean(registration && "PushManager" in window && "Notification" in window),
    pushPermission,
    pushEnabled,
    pushBusy,
    pushConfigured,
    enablePush,
    disablePush
  }), [deferredPrompt, isInstalled, pushPermission, pushEnabled, pushBusy, pushConfigured, registration]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};

export const usePwa = () => useContext(PwaContext);
