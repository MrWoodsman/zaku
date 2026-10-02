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
