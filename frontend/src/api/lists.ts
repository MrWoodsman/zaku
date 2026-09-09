import type { AddRecipeToListPayload, ShoppingListData } from "@shared/types";
import { fetchWithGroup } from "./api";

// DODAWANIE LISTY
export const addListApi = async (name: string) => {
  const response = await fetchWithGroup(`/api/v1/lists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się utworzyć listy");
  }

  return response.json();
};

// USUWANIE LISTY
export const deleteListApi = async (listId: string) => {
  const response = await fetchWithGroup(`/api/v1/lists/${listId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się usunąć listy");
  }

  return response.json();
};

// ZMIANA NAZWY LISTY
export const renameListApi = async (listId: string, updatedName: string) => {
  const response = await fetchWithGroup(`/api/v1/lists/${listId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: updatedName }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się zmienić nazwy");
  }

  return response.json();
};

// POBIERANIE WSZYSTKICH LIST
export const fetchAllShoppingListsApi = async (): Promise<ShoppingListData[]> => {
  const response = await fetchWithGroup("/api/v1/lists");

  if (!response.ok) throw new Error("Błąd pobierania");

  return response.json();
};

// POBRANIE WYBRANEJ LISTY
export const fetchShoppingListApi = async (listId: string): Promise<ShoppingListData> => {
  const response = await fetchWithGroup(`/api/v1/lists/${listId}`);

  if (!response.ok) throw new Error("Błąd pobierania");

  return response.json();
};

// MARK LIST AS SEEN (resets the unread/new-items count for this device)
export const markListAsSeenApi = async (listId: string, deviceId: string) => {
  const response = await fetchWithGroup(`/api/v1/lists/${listId}/seen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) throw new Error("Failed to mark list as seen");

  return response.json();
};

// DODAWANIE PRZEPISU DO LISTY
export const addRecipeToListApi = async (payload: AddRecipeToListPayload) => {
  const response = await fetchWithGroup("/api/v1/lists/add-from-recipe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Błąd podczas dodawania przepisu do listy");

  return response.json();
};
