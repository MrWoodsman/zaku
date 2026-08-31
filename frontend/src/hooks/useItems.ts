import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchAllShoppingItemsApi, fetchCompletedItems } from "@/api/items";

// POBIERANIE WSZYSTKICH PRZEDMIOTÓW DLA GRUPY
export const useAllShoppingItemsQuery = () => {
  return useQuery({
    queryKey: ["shoppingItems", "all"],
    queryFn: fetchAllShoppingItemsApi,
    refetchInterval: 3000,
  });
};

// POBIERANIE UKONCZONYCH PRZEDMIOTÓW GRUPY (stronami, po 50)
export const useItemsCompletedQuery = () => {
  return useInfiniteQuery({
    queryKey: ["shoppingItems", "completed"],
    queryFn: ({ pageParam }) => fetchCompletedItems(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};
