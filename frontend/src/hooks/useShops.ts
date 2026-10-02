import { fetchShopsApi, setShopStatusApi } from "@/api/shops";
import { showErrorToast } from "@/utils/toastHandler";
import type { Shop, ShopStatus } from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// groupId is part of the key, so switching groups doesn't show the old group's favorites
const shopsQueryKey = () => ["shops", localStorage.getItem("groupId")];

// The shop list is static and preferences only change through useSetShopStatusMutation
// (which updates this cache), so no polling and never stale.
export const useShopsQuery = () => {
  return useQuery({
    queryKey: shopsQueryKey(),
    queryFn: fetchShopsApi,
    staleTime: Infinity,
  });
};

// Favorite / hide / reset a shop. Optimistic, so the star/eye toggles react instantly.
export const useSetShopStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, status }: { shopId: number; status: ShopStatus }) =>
      setShopStatusApi(shopId, status),

    onMutate: async ({ shopId, status }) => {
      const key = shopsQueryKey();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Shop[]>(key);

      queryClient.setQueryData<Shop[]>(key, (shops) =>
        shops?.map((shop) => (shop.id === shopId ? { ...shop, status } : shop)),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(shopsQueryKey(), context.previous);
      showErrorToast(error);
    },

    // Refetch to get the backend's ordering (favorites first) for the shop picker
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shopsQueryKey() });
    },
  });
};
