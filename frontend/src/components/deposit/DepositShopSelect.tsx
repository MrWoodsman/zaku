import { ChevronDownIcon, CheckIcon, SearchIcon, StarIcon, StoreIcon } from "lucide-react";
import type { Shop } from "@shared/types";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { normalizeSearch } from "@/utils/normalizeSearch";

interface DepositShopSelectProps {
  value: number | null;
  onChange: (value: number) => void;
  shops: Shop[];
  isLoading?: boolean;
}


export function DepositShopSelect({
  value,
  onChange,
  shops,
  isLoading = false,
}: DepositShopSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Popover is portaled into this wrapper (inside the Drawer) instead of <body>,
  // otherwise the Drawer's scroll lock blocks scrolling the list
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  // Hidden shops are not offered in the picker. Order (favorites first)
  // already comes sorted from the backend.
  const query = normalizeSearch(search.trim());
  const visibleShops = shops.filter(
    (shop) => shop.status !== "hidden" && normalizeSearch(shop.name).includes(query),
  );
  const selectedShop = shops.find((shop) => shop.id === value);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setSearch("");
  };

  const selectShop = (shopId: number) => {
    onChange(shopId); // Aktualizujemy stan w głównym komponencie
    handleOpenChange(false); // Zamykamy dymek
  };

  return (
    <div ref={setContainer}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isLoading}
            // dark:bg-background overrides outline's dark:bg-input/30, which looked like a disabled field
            className={`w-full h-11 justify-between font-normal border-input bg-background dark:bg-background px-3 ${
              !selectedShop ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            <div className="flex items-center min-w-0">
              <StoreIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">
                {isLoading ? "Ładowanie..." : selectedShop ? selectedShop.name : "Wybierz sklep"}
              </span>
            </div>
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        {/* Magiczna klasa w-[--radix-popover-trigger-width] sprawia, że dymek
            będzie miał DOKŁADNIE taką samą szerokość jak przycisk, z którego się otworzył */}
        <PopoverContent
          container={container}
          // flex-col-reverse: search input sits at the bottom, right above the button,
          // so it doesn't end up under the notch/Dynamic Island on phones
          className="flex-col-reverse gap-1 p-1"
          align="start"
          // Prefer opening upwards - otherwise it jumps below the button once
          // filtering makes the list short enough to fit there
          side="top"
          style={{ width: "max(var(--radix-popover-trigger-width), 12rem)" }}
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // Enter picks the first match
                if (e.key === "Enter" && visibleShops.length > 0) {
                  e.preventDefault();
                  selectShop(visibleShops[0].id);
                }
              }}
              placeholder="Szukaj sklepu..."
              className="h-9 w-full rounded-md border border-input bg-background pr-2 pl-8 text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* data-vaul-no-drag: swiping the list scrolls it instead of dragging the Drawer down.
              Max height also shrinks to the space left above the button (minus safe area + input) */}
          <div
            data-vaul-no-drag
            className="flex max-h-[min(15rem,calc(var(--radix-popover-content-available-height)-var(--safe-top)-3.5rem))] flex-col gap-1 overflow-y-auto overscroll-contain"
          >
            {visibleShops.length === 0 && (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                Brak sklepów
              </div>
            )}
            {visibleShops.map((shop, index) => (
              <div
                key={shop.id}
                onClick={() => selectShop(shop.id)}
                className={`flex items-center justify-between px-2 py-2 text-sm rounded-md cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${
                  value === shop.id ? "bg-accent/50 font-medium" : ""
                } ${
                  // Separator line after the last favorite
                  shop.status === "favorite" && visibleShops[index + 1]?.status !== "favorite"
                    ? "border-b border-border rounded-b-none"
                    : ""
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {shop.status === "favorite" && (
                    <StarIcon className="h-3.5 w-3.5 shrink-0 fill-highlight text-highlight" />
                  )}
                  {shop.name}
                </span>
                {/* Jeśli to jest wybrany sklep, pokaż małego ptaszka po prawej */}
                {value === shop.id && <CheckIcon className="h-4 w-4 shrink-0" />}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
