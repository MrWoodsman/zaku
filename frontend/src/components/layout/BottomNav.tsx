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
    <Link to={to} className="w-full flex flex-col items-center -space-y-1.5">
      <div className={`[&>svg]:size-6 ${isActive ? "text-primary" : "text-neutral-400"}`}>
        {children}
      </div>
      <span className={`text-[10px] ${isActive ? "text-primary font-medium" : "text-neutral-400"}`}>
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
    <nav className="border-t bg-background pt-3 pb-[max(8px,env(safe-area-inset-bottom))] px-4">
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

        <BottomNavItem
          to={ROUTES.AUTO_LIST}
          label="Uzupełnianie"
          isActive={path === ROUTES.AUTO_LIST}
        >
          <Bot />
        </BottomNavItem>

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
