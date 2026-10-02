import type { AddDepositPayload } from "@shared/types";
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
