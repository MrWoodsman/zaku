import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseVoiceCommandApi } from "@/api/voice";
import { addListApi } from "@/api/lists";
import { addItemApi } from "@/api/items";
import type { VoiceCommandItem } from "@shared/types";

// KROK 1: PARSOWANIE TEKSTU PRZEZ AI (nie zapisuje niczego do bazy)
export const useParseVoiceCommandMutation = () => {
  return useMutation({
    mutationFn: (text: string) => parseVoiceCommandApi(text),
  });
};

interface ConfirmVoiceItemsInput {
  list: { id: string; name: string } | null;
  newListName: string | null;
  items: VoiceCommandItem[];
}

// KROK 2: ZATWIERDZENIE PRZEZ USERA -> DOPIERO TERAZ ZAPIS DO BAZY
// (tworzy listę jeśli trzeba, potem dodaje zaznaczone produkty przez istniejące endpointy)
export const useConfirmVoiceItemsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ list, newListName, items }: ConfirmVoiceItemsInput) => {
      const targetList: { id: string; name: string } =
        list ?? (await addListApi(newListName || "Zakupy")).list;

      for (const item of items) {
        await addItemApi(targetList.id, item.name, item.quantity || 1, item.unit || "szt.");
      }

      return targetList;
    },
    onSuccess: (targetList) => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingList", targetList.id] });
    },
  });
};
