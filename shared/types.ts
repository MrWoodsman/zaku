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

export interface HistoryItem extends ShoppingItem {
  completed_at: string;
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

// INTERRFACE DO addDepositApi
// Barcode type read from the voucher photo: "gs1" = GS1-128 (Code128 with a leading
// FNC1, e.g. Lidl), null = plain Code128
export type DepositCodeFormat = "gs1" | null;

export interface AddDepositPayload {
  depositNumber: string;
  depositCodeFormat: DepositCodeFormat;
  depositValue: number;
  depositDate: string;
  depositShop: number;
  image: File;
}

// Deposit voucher from GET /api/v1/deposits
export interface Deposit {
  id: number;
  shop_id: number | null;
  shop_name: string | null;
  value: number;
  code: string | null;
  code_format: DepositCodeFormat;
  expiring_date: string | null; // yyyy-MM-dd
  image_url: string | null; // light display version
  image_original_url: string | null; // full-quality original (null for older uploads)
  added_at: string;
  used_at: string | null;
}

// Body of PUT /api/v1/deposits/:id
export interface UpdateDepositPayload {
  value: number;
  expiring_date: string | null; // yyyy-MM-dd
  shop_id: number | null;
  code: string | null;
}

// Sort / filter options for GET /api/v1/deposits
export type DepositSort = "expiry" | "value" | "shop" | "added";

export interface DepositListParams {
  sort: DepositSort;
  order: "asc" | "desc";
  showUsed: boolean;
}

// One page of GET /api/v1/deposits (nextOffset = null -> last page)
export interface DepositPage {
  items: Deposit[];
  nextOffset: number | null;
}

// GET /api/v1/deposits/summary - only vouchers that can still be used
export interface DepositSummaryData {
  total: number;
  count: number;
  expiringCount: number;
}

// This group's preference for a shop (null = normal)
export type ShopStatus = "favorite" | "hidden" | null;

// Shop from GET /api/v1/shops
export interface Shop {
  id: number;
  name: string;
  status: ShopStatus;
}

// MEAL PLANNER
export type MealSlot = "breakfast" | "second_breakfast" | "lunch" | "snack" | "dinner";

// Someone the group plans meals for (no accounts - just a name and a color)
export interface PlannerPerson {
  id: string;
  name: string;
  color: string; // #rrggbb
  slots: MealSlot[]; // the meals of the day this person wants to see, in day order
}

// slots not sent on update = unchanged; on create = the default three
export interface PlannerPersonPayload {
  name: string;
  color: string;
  slots?: MealSlot[];
}

// Meal from GET /api/v1/planner/meals
export interface PlannerMeal {
  id: string;
  date: string; // yyyy-MM-dd
  slot: MealSlot;
  title: string;
  person_id: string | null; // null = shared (for everyone)
  recipe_id: string | null; // null = a plain note, not a recipe
  image_url: string | null;
}

// Body of POST /api/v1/planner/meals - needs a recipe_id or a title
export interface AddMealPayload {
  date: string; // yyyy-MM-dd
  slot: MealSlot;
  person_id?: string | null;
  recipe_id?: string;
  title?: string;
}

// GET /api/v1/planner/ingredients - summed over the planned recipes in a date range
export interface PlannerIngredient {
  name: string;
  unit: string | null;
  quantity: number | null;
}
