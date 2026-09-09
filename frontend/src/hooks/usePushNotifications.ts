import { useEffect, useState } from "react";
import { useDeviceId } from "./useDeviceId";
import { fetchVapidPublicKeyApi, subscribeToPushApi, unsubscribeFromPushApi } from "@/api/push";

const isSupported =
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

// pushManager.subscribe() needs the VAPID public key as a Uint8Array, not the
// base64url string the backend sends it as.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const deviceId = useDeviceId();
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : "denied",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setIsSubscribed(!!subscription));
  }, []);

  const subscribe = async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = await fetchVapidPublicKeyApi();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await subscribeToPushApi(deviceId, subscription);
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await unsubscribeFromPushApi(deviceId);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
