import { fetchDepositSummaryApi, fetchDepositsPageApi } from "@/api/deposit";
import type { DepositListParams } from "@shared/types";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

// POBIERANIE KUPONÓW KAUCJI GRUPY (stronami, sortowanie po stronie serwera)
// Params are part of the key, so changing the sort starts from page 1.
// Polling refetches every loaded page, hence a calmer interval than the summary.
export const useDepositsInfiniteQuery = (params: DepositListParams) => {
  return useInfiniteQuery({
    queryKey: ["deposits", "list", params],
    queryFn: ({ pageParam }) => fetchDepositsPageApi(params, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    // Keep showing the old list while the new sort loads, instead of a full-screen loader
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
  });
};

// PODSUMOWANIE (suma i liczba kuponów do wykorzystania)
export const useDepositSummaryQuery = () => {
  return useQuery({
    queryKey: ["deposits", "summary"],
    queryFn: fetchDepositSummaryApi,
    refetchInterval: 5000,
  });
};
