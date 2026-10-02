import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarClockIcon,
  CheckIcon,
  CoinsIcon,
  HistoryIcon,
  SortDescIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react";
import type { DepositListParams, DepositSort } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DEFAULT_DEPOSIT_LIST_PARAMS } from "@/hooks/useDepositListParams";

// Each sort has its own wording for the direction, "A–Z" makes no sense for amounts
const SORT_OPTIONS: { value: DepositSort; label: string; icon: LucideIcon; asc: string; desc: string }[] = [
  { value: "expiry", label: "Data ważności", icon: CalendarClockIcon, asc: "Najbliższe", desc: "Najdalsze" },
  { value: "value", label: "Kwota", icon: CoinsIcon, asc: "Od najmniejszej", desc: "Od największej" },
  { value: "shop", label: "Sklep", icon: StoreIcon, asc: "A–Z", desc: "Z–A" },
  { value: "added", label: "Data dodania", icon: HistoryIcon, asc: "Najstarsze", desc: "Najnowsze" },
];

interface DepositSortPopoverProps {
  params: DepositListParams;
  onChange: (params: DepositListParams) => void;
  isDefault: boolean;
}

export function DepositSortPopover({ params, onChange, isDefault }: DepositSortPopoverProps) {
  const current = SORT_OPTIONS.find((option) => option.value === params.sort) ?? SORT_OPTIONS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="secondary" aria-label="Sortowanie i filtry" className="relative">
          <SortDescIcon />
          {/* Dot = something differs from the default view */}
          {!isDefault && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-highlight" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 gap-3 p-2">
        <div className="flex flex-col gap-0.5">
          <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">Sortuj według</p>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...params, sort: option.value })}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                params.sort === option.value && "bg-accent/50 font-medium",
              )}
            >
              <option.icon className="size-4 opacity-70" />
              <span className="flex-1 text-left">{option.label}</span>
              {params.sort === option.value && <CheckIcon className="size-4 text-highlight" />}
            </button>
          ))}
        </div>

        {/* Direction as a segmented control, labels depend on the chosen sort */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-foreground/5 p-1">
          {(["asc", "desc"] as const).map((order) => (
            <button
              key={order}
              type="button"
              onClick={() => onChange({ ...params, order })}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md py-1.5 text-xs transition-colors",
                params.order === order
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {order === "asc" ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />}
              {current[order]}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-border px-2 pt-3 text-sm">
          Pokaż wykorzystane
          <Switch
            checked={params.showUsed}
            onCheckedChange={(showUsed) => onChange({ ...params, showUsed })}
          />
        </label>

        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onChange(DEFAULT_DEPOSIT_LIST_PARAMS)}
          >
            Przywróć domyślne
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
