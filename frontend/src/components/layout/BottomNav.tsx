import React from "react";
import { ROUTES } from "@/config/routes";
import { ListChecks, ChefHat, Settings, Bot, LogsIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

// Definicja Propsów
interface NavItemProps {
  to: string;
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}

// Komponent pomocniczy
function BottomNavItem({ to, label, isActive, children }: NavItemProps) {
  return (
    <Link
      to={to}
      className="w-full flex flex-col items-center -space-y-1.5 transition-transform active:scale-90"
    >
      <div className={`[&>svg]:size-6 ${isActive ? "text-highlight" : "text-neutral-400"}`}>
        {children}
      </div>
      <span className={`text-[10px] ${isActive ? "text-highlight font-medium" : "text-neutral-400"}`}>
        {label}
      </span>
    </Link>
  );
}

// Główny komponent
export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="border-t bg-background pt-3 pb-[max(8px,var(--safe-bottom))] px-4">
      <div className="flex justify-around items-center">
        <BottomNavItem
          to={ROUTES.SHOPPING_LISTS}
          label="Listy"
          isActive={path.startsWith(ROUTES.SHOPPING_LISTS)}
        >
          <ListChecks />
        </BottomNavItem>

        <BottomNavItem to={ROUTES.LOGS} label="Historia" isActive={path === ROUTES.LOGS}>
          <LogsIcon />
        </BottomNavItem>

{
  // eslint-disable-next-line no-constant-condition
  0 ? 
    <BottomNavItem
      to={ROUTES.AUTO_LIST}
      label="Uzupełnianie"
      isActive={path === ROUTES.AUTO_LIST}
    >
      <Bot />
    </BottomNavItem>
  : null
}

        <BottomNavItem
          to={ROUTES.RECIPES}
          label="Przepisy"
          isActive={path.startsWith(ROUTES.RECIPES)}
        >
          <ChefHat />
        </BottomNavItem>

        <BottomNavItem to={ROUTES.SETTINGS} label="Ustawienia" isActive={path === ROUTES.SETTINGS}>
          <Settings />
        </BottomNavItem>
      </div>
    </nav>
  );
}
