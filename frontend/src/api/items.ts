import type { AggregateShoppingItem, HistoryItem } from "@shared/types";
import { fetchWithGroup } from "./api";

// POBIERANIE UKONCZONYCH PRZEDMIOTÓW (stronami)
export interface CompletedItemsPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

export const fetchCompletedItems = async (
  cursor?: string | null,
): Promise<CompletedItemsPage> => {
  const url = cursor
    ? `/api/v1/items/completed?cursor=${encodeURIComponent(cursor)}`
    : "/api/v1/items/completed";
  const response = await fetchWithGroup(url);

  if (!response.ok) throw new Error("Błąd pobierania");

  return response.json();
};

// ZMIANA STANU PRZEDMIOTU
export const toggleItemApi = async (itemId: string, completed: boolean) => {
  const response = await fetchWithGroup(`/api/v1/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy aktualizacji");
  }

  return response.json();
};

// UNIWERSALNA ZMIANA STANU PRZEDMIOTU
export const universalToggleItemApi = async (itemId: string, completed: boolean) => {
  const response = await fetchWithGroup(`/api/v1/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Błąd aktualizacji statusu");
  }

  return response.json();
};

// DODAWNIE PRZEDMIOTÓW (Zostaje w podkategorii list!)
export const addItemApi = async (listId: string, name: string, quantity: number, unit: string) => {
  const response = await fetchWithGroup(`/api/v1/lists/${listId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, quantity, unit }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się dodać produktu");
  }

  return response.json();
};

// USUWANIE PRZEDMIOTÓW
export const deleteItemApi = async (itemId: string) => {
  const response = await fetchWithGroup(`/api/v1/items/${itemId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się usunąć produktu");
  }

  return response.json();
};

// AKTUALIZACJA PRZEDMIOTÓW
export const updateItemApi = async (
  itemId: string,
  data: { name: string; quantity: number; unit: string; completed: boolean },
) => {
  const response = await fetchWithGroup(`/api/v1/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się zapisać zmian");
  }
  return response.json();
};

// POBIERANIE WSZYSTKICH PRZEDMIOTÓW DLA GRUPY
export const fetchAllShoppingItemsApi = async (): Promise<AggregateShoppingItem[]> => {
  const response = await fetchWithGroup(`/api/v1/items`);
  if (!response.ok) throw new Error("Błąd pobierania wszystkich produktów");

  return response.json();
};

// === ZMIANY DLA CAŁYCH LIST ===

// ZAZNACZENIE WSZYSTKICH PRODUKTOW
export const markAllItemsApi = async (listID: string) => {
  const res = await fetchWithGroup(`/api/v1/lists/${listID}/items/mark-all`, {
    method: "PUT",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy aktualizacji");
  }
};

// ODZNACZNEIE WSZYSTKICH PRODUKTOW
export const resetAllItemsApi = async (listID: string) => {
  const res = await fetchWithGroup(`/api/v1/lists/${listID}/items/reset-all`, {
    method: "PUT",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy aktualizacji");
  }
};

// USUWANIE WSZYSTKICH UKONCZONYCH
export const deleteCompletedItemsApi = async (listID: string) => {
  const res = await fetchWithGroup(`/api/v1/lists/${listID}/items/delete-completed`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy aktualizacji");
  }
};

// USUWANIE WSZYSTKICH PRODUKTOW Z LISTY
export const deleteAllItemsApi = async (listID: string) => {
  const res = await fetchWithGroup(`/api/v1/lists/${listID}/items/delete-all`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy aktualizacji");
  }
};
