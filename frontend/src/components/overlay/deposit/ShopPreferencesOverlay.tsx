import { useState } from "react";
import { EyeOffIcon, SearchIcon, StarIcon } from "lucide-react";
import type { ShopStatus } from "@shared/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useSetShopStatusMutation, useShopsQuery } from "@/hooks/useShops";
import { normalizeSearch } from "@/utils/normalizeSearch";

interface ShopPreferencesOverlayProps {
  children: React.ReactNode;
}

// Lets the group mark shops as favorite (shown first in the deposit shop picker)
// or hidden (not shown there at all). Favorite and hidden are mutually exclusive.
export function ShopPreferencesOverlay({ children }: ShopPreferencesOverlayProps) {
  const [search, setSearch] = useState("");
  const { data: shops = [], isLoading } = useShopsQuery();
  const { mutate: setStatus } = useSetShopStatusMutation();

  // Alphabetical here (not favorites-first like the picker), so rows don't
  // jump around while toggling
  const query = normalizeSearch(search.trim());
  const visibleShops = shops
    .filter((shop) => normalizeSearch(shop.name).includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const favoriteCount = shops.filter((shop) => shop.status === "favorite").length;
  const hiddenCount = shops.filter((shop) => shop.status === "hidden").length;

  // Clicking the active state again turns it off
  const toggle = (shopId: number, current: ShopStatus, target: Exclude<ShopStatus, null>) => {
    setStatus({ shopId, status: current === target ? null : target });
  };

  return (
    <Drawer onOpenChange={(open) => !open && setSearch("")}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Twoje sklepy</DrawerTitle>
          <DrawerDescription>
            Ulubione pokażą się na górze przy dodawaniu kuponu, ukryte nie będą się pokazywać wcale.
            Ustawienia są wspólne dla całej grupy.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <StarIcon className="size-3.5 fill-highlight text-highlight" /> Ulubione: {favoriteCount}
            </span>
            <span className="flex items-center gap-1">
              <EyeOffIcon className="size-3.5" /> Ukryte: {hiddenCount}
            </span>
          </div>

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj sklepu..."
              className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* data-vaul-no-drag: swiping the list scrolls it instead of dragging the Drawer down.
              Fixed height (not max-h): the Drawer doesn't resize/jump while filtering */}
          <div
            data-vaul-no-drag
            className="flex h-[50vh] flex-col overflow-y-auto overscroll-contain rounded-lg border border-border"
          >
            {isLoading && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Ładowanie...</div>
            )}
            {!isLoading && visibleShops.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Brak sklepów</div>
            )}
            {visibleShops.map((shop) => {
              const isFavorite = shop.status === "favorite";
              const isHidden = shop.status === "hidden";

              return (
                <div
                  key={shop.id}
                  className="flex items-center gap-1 border-b border-border/50 py-1 pr-1 pl-3 last:border-b-0"
                >
                  <span
                    className={`flex-1 truncate text-sm ${
                      isHidden ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {shop.name}
                  </span>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    aria-pressed={isFavorite}
                    onClick={() => toggle(shop.id, shop.status, "favorite")}
                  >
                    <StarIcon
                      className={isFavorite ? "fill-highlight text-highlight" : "text-muted-foreground"}
                    />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={isHidden ? "Pokaż sklep" : "Ukryj sklep"}
                    aria-pressed={isHidden}
                    onClick={() => toggle(shop.id, shop.status, "hidden")}
                  >
                    <EyeOffIcon className={isHidden ? "text-foreground" : "text-muted-foreground/50"} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
