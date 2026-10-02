import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDepositApi, sendRequestToProcesPhoto } from "@/api/deposit";
import { showErrorToast } from "@/utils/toastHandler";
import type { AddDepositPayload } from "@shared/types";

// WYSYŁANEI ZAPYTANIA O ODCZYTNAIE KODU KRESKOWEGO
export const useScanPhotoMutation = () => {
  return useMutation({
    mutationFn: (file: File) => sendRequestToProcesPhoto(file),
  });
};

// DODAWNIE KUPONU
export const useCreateDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: AddDepositPayload) => createDepositApi(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: showErrorToast,
  });
};
