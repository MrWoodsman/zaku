export interface ShoppingListData {
  id: string;
  name: string;
  createdAt: string;
  itemsIn: number;
  completedCount: number;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  completed: boolean;
}

export interface AggregateShoppingItem extends ShoppingItem {
  list_id: string;
  list_name?: string;
}

// PRZEPISY
export interface RecipeItem {
  id: string;
  name: string;
  group_id?: string;
  description: string;
  time_to_make: number;
  is_global: boolean | number;
  status: "draft" | "published";
  image_url?: string | null;

  // DODAJ TE DWA POLA TUTAJ:
  ingredients?: Array<{
    id?: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  steps?: Array<{
    id?: string;
    order: number;
    title?: string;
    description: string;
    image_url?: string | null;
  }>;
}

// INTERFACE DO AddRecipeToListAPI
export interface AddRecipeToListPayload {
  target: {
    mode: "new" | "existing";
    list_id?: string;
    new_list_name?: string;
  };
  ingredients: {
    name: string;
    quantity: number | string;
    unit: string;
  }[];
}

// KOMENDY GŁOSOWE / AI (BETA)
export interface VoiceCommandItem {
  name: string;
  quantity: number;
  unit: string;
}

// Odpowiedź /api/v1/voice/parse gdy AI rozwiązał docelową listę - NIC jeszcze nie jest
// zapisane w bazie, to tylko propozycja do zatwierdzenia przez usera.
export interface VoiceParseResolvedResponse {
  list: { id: string; name: string } | null;
  new_list_name: string | null;
  items: VoiceCommandItem[];
}

export interface VoiceCommandClarificationResponse {
  needs_clarification: true;
  message: string;
  candidates: { id: string; name: string }[];
  items: VoiceCommandItem[];
}

export type VoiceParseResponse = VoiceParseResolvedResponse | VoiceCommandClarificationResponse;
