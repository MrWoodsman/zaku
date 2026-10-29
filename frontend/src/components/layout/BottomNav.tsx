import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { EllipsisIcon, PencilIcon, CheckIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MAX_PINNED_TABS, NAV_TABS } from "@/config/navTabs";
import { useNavTabs } from "@/hooks/useNavTabs";

const itemClassName =
  "w-full flex flex-col items-center -space-y-1.5 transition-transform duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100";

// Icon + label, orange when active - shared by the links and the "Więcej" button
function NavItemContent({
  label,
  isActive,
  children,
}: {
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={`[&>svg]:size-6 ${isActive ? "text-highlight" : "text-neutral-400"}`}>
        {children}
      </div>
      <span className={`text-[10px] ${isActive ? "text-highlight font-medium" : "text-neutral-400"}`}>
        {label}
      </span>
    </>
  );
}

export function BottomNav() {
  const path = useLocation().pathname;
  const { pinnedTabs, moreTabs, toggle, canPinMore } = useNavTabs();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // "Więcej" lights up when you're on a screen that lives inside it
  const isMoreActive = moreTabs.some((tab) => tab.isActive(path));

  const handleOpenChange = (open: boolean) => {
    setIsMoreOpen(open);
    if (!open) setIsEditing(false);
  };

  return (
    <nav className="border-t bg-background pt-3 pb-[max(8px,var(--safe-bottom))] px-4">
      <div className="flex justify-around items-center">
        {pinnedTabs.map((tab) => (
          <Link key={tab.id} to={tab.to} className={itemClassName}>
            <NavItemContent label={tab.label} isActive={tab.isActive(path)}>
              <tab.icon />
            </NavItemContent>
          </Link>
        ))}

        <Drawer open={isMoreOpen} onOpenChange={handleOpenChange}>
          <DrawerTrigger asChild>
            <button type="button" className={itemClassName}>
              <NavItemContent label="Więcej" isActive={isMoreActive}>
                <EllipsisIcon />
              </NavItemContent>
            </button>
          </DrawerTrigger>

          <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle>{isEditing ? "Dostosuj pasek" : "Więcej"}</DrawerTitle>
              <DrawerDescription>
                {isEditing
                  ? `Wybierz, co ma być na dolnym pasku (do ${MAX_PINNED_TABS}). Reszta zostaje tutaj. Ustawienie dotyczy tylko tego telefonu.`
                  : "Pozostałe zakładki aplikacji."}
              </DrawerDescription>
            </DrawerHeader>

            {isEditing ? (
              <div className="flex flex-col gap-2 py-2">
                {NAV_TABS.map((tab) => {
                  const isPinned = pinnedTabs.some((pinned) => pinned.id === tab.id);
                  // A full bar can't take another one; a lone tab can't be taken off
                  const isLocked = isPinned ? pinnedTabs.length === 1 : !canPinMore;

                  return (
                    <label
                      key={tab.id}
                      className={`flex h-12 items-center gap-3 rounded-xl border border-border px-3 ${
                        isLocked && !isPinned ? "opacity-50" : ""
                      }`}
                    >
                      <tab.icon className="size-5 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">{tab.label}</span>
                      <Switch
                        checked={isPinned}
                        disabled={isLocked}
                        onCheckedChange={() => toggle(tab.id)}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 py-2">
                {moreTabs.map((tab) => (
                  <Link
                    key={tab.id}
                    to={tab.to}
                    onClick={() => handleOpenChange(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 transition-transform active:scale-95 ${
                      tab.isActive(path) ? "border-highlight/40 bg-highlight/10 text-highlight" : "border-border"
                    }`}
                  >
                    <tab.icon className="size-6" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </Link>
                ))}
                {moreTabs.length === 0 && (
                  <p className="col-span-3 py-4 text-center text-sm text-muted-foreground">
                    Wszystko jest na dolnym pasku.
                  </p>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              className="mt-2 h-11 w-full"
              onClick={() => setIsEditing((editing) => !editing)}
            >
              {isEditing ? (
                <>
                  <CheckIcon /> Gotowe
                </>
              ) : (
                <>
                  <PencilIcon /> Dostosuj pasek
                </>
              )}
            </Button>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
