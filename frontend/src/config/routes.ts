export const ROUTES = {
  HOME: "/",
  SHOPPING_LISTS: "/shopping",
  SHOPPING_ALL: "/shopping/all",
  AUTO_LIST: "/auto-list",
  LOGS: "/logs",
  RECIPES: "/recipes",
  RECIPES_ALL_MY: "/recipes/all",
  RECIPES_VIEW: (id: string) => `/recipes/view/${id}`,
  RECIPES_EDITOR: "/recipes/editor",
  RECIPES_DRAFTS: "/recipes/drafts",
  SETTINGS: "/settings",

  // SCIEZKI DYNAMICZNE
  LIST_DETAIL: (id: string) => `/shopping/${id}`,
} as const;
