import type { Shop, ShopStatus } from "@shared/types";
import { fetchWithGroup } from "./api";

// Fetch all shops with this group's status (favorites first, hidden last)
export const fetchShopsApi = async (): Promise<Shop[]> => {
  const response = await fetchWithGroup(`/api/v1/shops`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy pobieraniu danych");
  }

  return response.json();
};

// Set this group's status for a shop (null = back to normal)
export const setShopStatusApi = async (shopId: number, status: ShopStatus) => {
  const response = await fetchWithGroup(`/api/v1/shops/${shopId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się zapisać ustawień sklepu");
  }

  return response.json();
};
