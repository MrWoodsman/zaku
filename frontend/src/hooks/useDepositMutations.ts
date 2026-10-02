import { useMutation } from "@tanstack/react-query";
import { sendRequestToProcesPhoto } from "@/api/deposit";

// WYSYŁANEI ZAPYTANIA O ODCZYTNAIE KODU KRESKOWEGO
export const useScanPhotoMutation = () => {
  return useMutation({
    mutationFn: (file: File) => sendRequestToProcesPhoto(file),
  });
};

// DODAWNIE KUPONU
