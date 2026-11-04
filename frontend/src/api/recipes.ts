import type { RecipeItem } from "@shared/types";
import { fetchWithGroup } from "./api";
import type { ImportedRecipeResponse } from "@/utils/recipeImport";

// POBRANIE WSZYSTKICH DOSTPENYCH PRZEPDEISOW DLA GRUPY
export const fetchAllRecipesApi = async (): Promise<RecipeItem[]> => {
  const response = await fetchWithGroup(`/api/v1/recipes/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy pobieraniu danych");
  }

  return response.json();
};

// POBIERANIE DETALI WYBRANEGO PRZEPISU
export const fetchRecipeDetailsApi = async (id: string): Promise<RecipeItem> => {
  const response = await fetchWithGroup(`/api/v1/recipes/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy pobieraniu danych");
  }

  return response.json();
};

// IMPORT PRZEPISU ZE STRONY (nic nie zapisuje - zwraca dane do edytora)
export const importRecipeFromUrlApi = async (url: string): Promise<ImportedRecipeResponse> => {
  const response = await fetchWithGroup(`/api/v1/recipes/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się zaimportować przepisu");
  }

  return response.json();
};

// POBRANIE ZDJĘCIA Z ADRESU (przeglądarka nie może - blokuje to CORS) -> data URL albo null
export const importRecipeImageApi = async (url: string): Promise<string | null> => {
  const response = await fetchWithGroup(`/api/v1/recipes/import-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) return null;
  return (await response.json()).imageDataUrl ?? null;
};

// TWORZENIE PRZEPISU
export const createRecipeApi = async (formData: FormData) => {
  const response = await fetchWithGroup(`/api/v1/recipes/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił błąd podczas dodawania przepisu");
  }

  return response.json();
};

// AKTUALIZACJA PRZEPISU
export const updateRecipeApi = async ({ id, formData }: { id: string; formData: FormData }) => {
  const response = await fetchWithGroup(`/api/v1/recipes/${id}`, {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił błąd podczas aktualizowania przepisu");
  }

  return response.json();
};

// USUWANIE PRZEPISU
export const deleteRecipeApi = async (id: string) => {
  const response = await fetchWithGroup(`/api/v1/recipes/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił błąd podczas usuwania przepisu");
  }

  return response.json();
};
