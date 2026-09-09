import { fetchWithGroup } from "./api";

export const fetchVapidPublicKeyApi = async (): Promise<string> => {
  const response = await fetchWithGroup("/api/v1/push/vapid-public-key");
  if (!response.ok) throw new Error("Nie udało się pobrać klucza VAPID");

  const { publicKey } = await response.json();
  return publicKey;
};

export const subscribeToPushApi = async (deviceId: string, subscription: PushSubscription) => {
  const response = await fetchWithGroup("/api/v1/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, subscription: subscription.toJSON() }),
  });

  if (!response.ok) throw new Error("Nie udało się zapisać subskrypcji powiadomień");

  return response.json();
};

export const unsubscribeFromPushApi = async (deviceId: string) => {
  const response = await fetchWithGroup("/api/v1/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) throw new Error("Nie udało się wyłączyć powiadomień");

  return response.json();
};
