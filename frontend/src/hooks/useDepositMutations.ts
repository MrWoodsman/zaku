import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDepositApi,
  deleteDepositApi,
  sendRequestToProcesPhoto,
  setDepositUsedApi,
  updateDepositApi,
} from "@/api/deposit";
import { showErrorToast } from "@/utils/toastHandler";
import type { AddDepositPayload, UpdateDepositPayload } from "@shared/types";

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

// OZNACZANIE KUPONU JAKO WYKORZYSTANY / COFNIĘCIE
export const useSetDepositUsedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ depositId, used }: { depositId: number; used: boolean }) =>
      setDepositUsedApi(depositId, used),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: showErrorToast,
  });
};

// EDYCJA KUPONU
export const useUpdateDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ depositId, payload }: { depositId: number; payload: UpdateDepositPayload }) =>
      updateDepositApi(depositId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: showErrorToast,
  });
};

// USUWANIE KUPONU
export const useDeleteDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (depositId: number) => deleteDepositApi(depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: showErrorToast,
  });
};
