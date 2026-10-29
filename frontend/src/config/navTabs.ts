import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChefHat, ListChecks, LogsIcon, Settings, TicketSlash } from "lucide-react";
import { ROUTES } from "@/config/routes";

export type NavTabId = "lists" | "history" | "deposit" | "planner" | "recipes" | "settings";

export interface NavTab {
  id: NavTabId;
  label: string;
  to: string;
  icon: LucideIcon;
  isActive: (path: string) => boolean;
}

// Every screen reachable from the bottom bar / the "Więcej" sheet, in their natural order
export const NAV_TABS: NavTab[] = [
  {
    id: "lists",
    label: "Listy",
    to: ROUTES.SHOPPING_LISTS,
    icon: ListChecks,
    isActive: (path) => path.startsWith(ROUTES.SHOPPING_LISTS),
  },
  {
    id: "history",
    label: "Historia",
    to: ROUTES.LOGS,
    icon: LogsIcon,
    isActive: (path) => path === ROUTES.LOGS,
  },
  {
    id: "deposit",
    label: "Kaucja",
    to: ROUTES.DEPOSIT_SCREEN,
    icon: TicketSlash,
    isActive: (path) => path.startsWith(ROUTES.DEPOSIT_SCREEN),
  },
  {
    id: "planner",
    label: "Planer",
    to: ROUTES.PLANNER,
    icon: CalendarDays,
    isActive: (path) => path.startsWith(ROUTES.PLANNER),
  },
  {
    id: "recipes",
    label: "Przepisy",
    to: ROUTES.RECIPES,
    icon: ChefHat,
    isActive: (path) => path.startsWith(ROUTES.RECIPES),
  },
  {
    id: "settings",
    label: "Ustawienia",
    to: ROUTES.SETTINGS,
    icon: Settings,
    isActive: (path) => path === ROUTES.SETTINGS,
  },
];

// With "Więcej" that makes 5 buttons - the most that fit comfortably on a phone
export const MAX_PINNED_TABS = 4;

export const DEFAULT_PINNED_TABS: NavTabId[] = ["lists", "deposit", "planner", "recipes"];
