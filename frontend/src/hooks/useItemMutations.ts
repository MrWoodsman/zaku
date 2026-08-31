import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addItemApi,
  deleteAllItemsApi,
  deleteCompletedItemsApi,
  deleteItemApi,
  markAllItemsApi,
  resetAllItemsApi,
  toggleItemApi,
  universalToggleItemApi,
  updateItemApi,
} from "@/api/items";
import { type ShoppingListData } from "@shared/types";
import { showErrorToast } from "@/utils/toastHandler";

// DODAWANIE PRZEDMIOTÓW
export const useAddItemMutation = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, quantity, unit }: { name: string; quantity: number; unit: string }) =>
      addItemApi(listId, name, quantity, unit),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList", listId] });
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
    onError: showErrorToast,
  });
};

// USUWANIE PRZEDMIOTÓW
export const useDeleteItemMutation = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItemApi(itemId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList", listId] });
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
    onError: showErrorToast,
  });
};

// ZMIANA STANU KUPIENIA
export const useToggleItemMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      toggleItemApi(itemId, completed),

    onMutate: async ({ itemId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList", id] });
      const previousList = queryClient.getQueryData<ShoppingListData>(["shoppingList", id]);

      queryClient.setQueryData<ShoppingListData>(["shoppingList", id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((item) => (item.id === itemId ? { ...item, completed } : item)),
        };
      });

      return { previousList };
    },

    onError: (err, _newTodo, context) => {
      queryClient.setQueryData(["shoppingList", id], context?.previousList);
      showErrorToast(err);
    },
    // Bez invalidate na sukces - optymistyczny update już ma poprawny stan,
    // a refetchInterval w useShoppingListQuery i tak zsynchronizuje z serwerem
  });
};

// UNIWERSALNA ZMIANA STANU KUPIENIA
export const useUniversalToggleItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // ZMIANA: Wywalamy listId z argumentów
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      universalToggleItemApi(itemId, completed), // <--- Tutaj podajemy tylko 2 argumenty!

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingItems", "all"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
    },
    onError: showErrorToast,
  });
};

// AKTUALIZACJA PRZEDMIOTU
export const useUpdateItemMutation = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: { name: string; quantity: number; unit: string; completed: boolean };
    }) => updateItemApi(itemId, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList", listId] });
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
    },
    onError: showErrorToast,
  });
};

// === ZMIANY DLA CAŁYCH LIST ===

export const useMarkAllMutation = (listID: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllItemsApi(listID),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList", listID] });
      const previousData = queryClient.getQueryData<ShoppingListData>(["shoppingList", listID]);
      queryClient.setQueryData(
        ["shoppingList", listID],
        (oldData: ShoppingListData | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item) => ({ ...item, completed: true })),
            completedCount: oldData.items.length,
          };
        },
      );
      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData)
        queryClient.setQueryData(["shoppingList", listID], context.previousData);
      showErrorToast(err);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shoppingList", listID] }),
  });
};

export const useResetAllMutation = (listID: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetAllItemsApi(listID),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList", listID] });
      const previousData = queryClient.getQueryData<ShoppingListData>(["shoppingList", listID]);
      queryClient.setQueryData(
        ["shoppingList", listID],
        (oldData: ShoppingListData | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item) => ({ ...item, completed: false })),
            completedCount: 0,
          };
        },
      );
      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData)
        queryClient.setQueryData(["shoppingList", listID], context.previousData);
      showErrorToast(err);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shoppingList", listID] }),
  });
};

export const useDeleteCompletedMutation = (listID: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCompletedItemsApi(listID),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList", listID] });
      const previousData = queryClient.getQueryData<ShoppingListData>(["shoppingList", listID]);
      queryClient.setQueryData(
        ["shoppingList", listID],
        (oldData: ShoppingListData | undefined) => {
          if (!oldData) return oldData;
          const remainingItems = oldData.items.filter((item) => !item.completed);
          return {
            ...oldData,
            items: remainingItems,
            itemsIn: remainingItems.length,
            completedCount: 0,
          };
        },
      );
      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData)
        queryClient.setQueryData(["shoppingList", listID], context.previousData);
      showErrorToast(err);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shoppingList", listID] }),
  });
};

export const useDeleteAllMutation = (listID: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllItemsApi(listID),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList", listID] });
      const previousData = queryClient.getQueryData<ShoppingListData>(["shoppingList", listID]);
      queryClient.setQueryData(
        ["shoppingList", listID],
        (oldData: ShoppingListData | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: [],
            itemsIn: 0,
            completedCount: 0,
          };
        },
      );
      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData)
        queryClient.setQueryData(["shoppingList", listID], context.previousData);
      showErrorToast(err);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shoppingList", listID] }),
  });
};
