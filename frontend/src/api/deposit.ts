import type {
  AddDepositPayload,
  DepositListParams,
  DepositPage,
  DepositSummaryData,
  UpdateDepositPayload,
} from "@shared/types";
import { fetchWithGroup } from "./api";

// ODCZYTYWANIE KODU KRESKOWEGO NA ZDJECIU
export const sendRequestToProcesPhoto = async (image: File) => {
  const formData = new FormData();
  formData.append("barcodeImage", image);

  const response = await fetch(`/api/v1/scan`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || "Wystąpił błąd podczas analizy zdjęcia",
    );
  }

  return response.json();
};

// DODAWANIE DEPOZYTU DO BAZY
export const createDepositApi = async (payload: AddDepositPayload) => {
  // Dopiero tutaj budujemy FormData dla backendu
  const formData = new FormData();
  formData.append("depositNumber", payload.depositNumber);
  formData.append("depositValue", String(payload.depositValue));
  formData.append("depositDate", payload.depositDate);
  formData.append("depositShop", String(payload.depositShop));
  formData.append("image", payload.image); // Dodajemy plik

  const response = await fetchWithGroup("/api/v1/scan/deposit", {
    method: "POST",
    body: formData,
  });

  // Without this, a 400/500 from the server would still land in onSuccess
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił błąd podczas dodawania kuponu");
  }

  return response.json();
};

export const DEPOSITS_PAGE_SIZE = 30;

// Fetch one page of the group's deposits, sorted/filtered on the server
export const fetchDepositsPageApi = async (
  params: DepositListParams,
  offset: number,
): Promise<DepositPage> => {
  const query = new URLSearchParams({
    sort: params.sort,
    order: params.order,
    used: params.showUsed ? "1" : "0",
    limit: String(DEPOSITS_PAGE_SIZE),
    offset: String(offset),
  });

  const response = await fetchWithGroup(`/api/v1/deposits?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy pobieraniu danych");
  }

  return response.json();
};

// Totals over all vouchers that can still be used
export const fetchDepositSummaryApi = async (): Promise<DepositSummaryData> => {
  const response = await fetchWithGroup(`/api/v1/deposits/summary`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Wystąpił nieznany błąd przy pobieraniu danych");
  }

  return response.json();
};

// Mark a deposit as used / not used
export const setDepositUsedApi = async (depositId: number, used: boolean) => {
  const response = await fetchWithGroup(`/api/v1/deposits/${depositId}/used`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ used }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się zapisać zmiany kuponu");
  }

  return response.json();
};

// Edit a deposit (value, expiry date, shop, code)
export const updateDepositApi = async (depositId: number, payload: UpdateDepositPayload) => {
  const response = await fetchWithGroup(`/api/v1/deposits/${depositId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się zapisać zmian kuponu");
  }

  return response.json();
};

// Delete a deposit (soft delete on the server)
export const deleteDepositApi = async (depositId: number) => {
  const response = await fetchWithGroup(`/api/v1/deposits/${depositId}`, { method: "DELETE" });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Nie udało się usunąć kuponu");
  }

  return response.json();
};
