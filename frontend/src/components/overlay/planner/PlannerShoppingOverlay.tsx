import { useState } from "react";
import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Loader2, ShoppingCart, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { PlannerRangePicker } from "@/components/planner/PlannerRangePicker";
import type { PlannerIngredient } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import { usePlannerIngredientsQuery, usePlannerMealsQuery } from "@/hooks/usePlanner";
import { useAddRecipeToListMutation } from "@/hooks/useListMutations";
import { useAllShoppingListsQuery } from "@/hooks/useLists";
import { showSuccessToast } from "@/utils/toastHandler";
import { toDateKey } from "@/utils/plannerDates";

interface PlannerShoppingOverlayProps {
  // Controlled, because it's opened from the planner's "more" menu
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The day the planner is showing - the week / month presets are taken around it
  anchor: Date;
  // Narrow to this person's meals (+ shared ones); null = everyone's
  personId: string | null;
  personName: string | null;
}

// "2 posiłki", "5 posiłków" (1 is written out separately)
const pluralMeals = (count: number) =>
  count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "posiłki" : "posiłków";

// A row's identity: the backend sums by name + unit, so that pair is unique
const ingredientKey = (ing: PlannerIngredient) => `${ing.name}|${ing.unit ?? ""}`;

// Turns the recipes planned for the week into one shopping list: sums the ingredients,
// lets you untick what's already in the fridge, and adds the rest to a new or existing list
export function PlannerShoppingOverlay({
  open,
  onOpenChange,
  anchor,
  personId,
  personName,
}: PlannerShoppingOverlayProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="bg-background border-border max-h-[90dvh] flex flex-col pb-[max(16px,var(--safe-bottom))]"
      >
        <DrawerHeader className="text-left px-4">
          <DrawerTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Zakupy z planu
          </DrawerTitle>
          <DrawerDescription>
            Składniki z zaplanowanych przepisów{personName ? ` (${personName} i wspólne)` : ""}.
            Wybierz okres i odznacz to, co już masz.
          </DrawerDescription>
        </DrawerHeader>

        {/* Only mounted while open: the ingredients are fetched fresh on every opening */}
        {open && (
          <ShoppingForm anchor={anchor} personId={personId} onDone={() => onOpenChange(false)} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

type RangeMode = "week" | "next" | "days7" | "month" | "custom";

const RANGE_MODES: { mode: RangeMode; label: string }[] = [
  { mode: "week", label: "Tydzień" },
  { mode: "next", label: "Następny tydzień" },
  { mode: "days7", label: "7 dni" },
  { mode: "month", label: "Miesiąc" },
  { mode: "custom", label: "Własny" },
];

interface DayRange {
  from: Date;
  to: Date;
}

const WEEK = { weekStartsOn: 1 } as const; // Monday

// Presets are taken around the day the planner shows; "7 dni" always starts today
const presetRange = (mode: Exclude<RangeMode, "custom">, anchor: Date): DayRange => {
  switch (mode) {
    case "week":
      return { from: startOfWeek(anchor, WEEK), to: endOfWeek(anchor, WEEK) };
    case "next": {
      const nextWeek = addWeeks(anchor, 1);
      return { from: startOfWeek(nextWeek, WEEK), to: endOfWeek(nextWeek, WEEK) };
    }
    case "days7": {
      const today = new Date();
      return { from: today, to: addDays(today, 6) };
    }
    case "month":
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }
};

// Planning ahead is the usual case: from Friday on, this week is mostly gone, so the
// shopping is for the next one
const defaultRangeMode = (anchor: Date): RangeMode => {
  const today = new Date();
  const isLateInWeek = [5, 6, 0].includes(today.getDay());
  return isLateInWeek && isSameWeek(anchor, today, WEEK) ? "next" : "week";
};

interface ShoppingFormProps {
  anchor: Date;
  personId: string | null;
  onDone: () => void;
}

function ShoppingForm({ anchor, personId, onDone }: ShoppingFormProps) {
  const navigate = useNavigate();

  const [rangeMode, setRangeMode] = useState<RangeMode>(() => defaultRangeMode(anchor));
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // A half-picked custom range (only the first day) counts as that one day
  let range: DayRange | null;
  if (rangeMode !== "custom") range = presetRange(rangeMode, anchor);
  else range = customRange?.from ? { from: customRange.from, to: customRange.to ?? customRange.from } : null;

  const isRangeValid = range !== null;
  const from = range ? toDateKey(range.from) : "";
  const to = range ? toDateKey(range.to) : "";
  const rangeLabel = range ? `${format(range.from, "dd.MM")} - ${format(range.to, "dd.MM")}` : "";

  // "Własny" starts from whatever was selected, so the calendar opens on something sensible
  const selectRangeMode = (next: RangeMode) => {
    if (next === "custom" && !customRange && range) setCustomRange({ from: range.from, to: range.to });
    setRangeMode(next);
  };

  const { data: ingredients = [], isLoading } = usePlannerIngredientsQuery(
    from,
    to,
    personId,
    isRangeValid,
  );
  // Meals in this period that add nothing to the list (notes, recipes without ingredients) -
  // for the person's view that's theirs plus the shared ones, same as the ingredients
  const { data: rangeMeals } = usePlannerMealsQuery(from, to, isRangeValid);
  const skippedMeals = (rangeMeals ?? []).filter(
    (meal) =>
      !meal.has_ingredients && (!personId || meal.person_id === null || meal.person_id === personId),
  );
  const skippedTitles = [...new Set(skippedMeals.map((meal) => meal.title))];
  const skippedNames =
    skippedTitles.slice(0, 3).join(", ") +
    (skippedTitles.length > 3 ? ` i jeszcze ${skippedTitles.length - 3}` : "");

  const { data: lists } = useAllShoppingListsQuery();
  const { mutate: addToList, isPending } = useAddRecipeToListMutation();

  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedListId, setSelectedListId] = useState("");
  // null = the user hasn't typed their own name, so it follows the chosen period
  const [customListName, setCustomListName] = useState<string | null>(null);
  const newListName = customListName ?? `Zakupy ${rangeLabel}`.trim();
  // What the user UNticked - so everything starts selected, including ingredients that
  // arrive after the first render
  const [unchecked, setUnchecked] = useState<string[]>([]);

  const selected = ingredients.filter((ing) => !unchecked.includes(ingredientKey(ing)));

  const toggle = (key: string) =>
    setUnchecked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const canSubmit =
    !isPending &&
    isRangeValid &&
    selected.length > 0 &&
    (mode === "existing" ? Boolean(selectedListId) : Boolean(newListName.trim()));

  const handleSubmit = () => {
    if (!canSubmit) return;

    addToList(
      {
        target: {
          mode,
          list_id: mode === "existing" ? selectedListId : undefined,
          new_list_name: mode === "new" ? newListName.trim() : undefined,
        },
        ingredients: selected.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? 1,
          unit: ing.unit ?? "",
        })),
      },
      {
        onSuccess: () => {
          onDone();
          navigate(ROUTES.SHOPPING_LISTS);
          showSuccessToast("Dodano składniki do listy");
        },
      },
    );
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-foreground">Z jakiego okresu?</h3>
          <div className="flex flex-wrap gap-2">
            {RANGE_MODES.map(({ mode: value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={rangeMode === value}
                onClick={() => selectRangeMode(value)}
                className={`h-11 rounded-full border px-4 text-sm font-medium transition-[transform,color,background-color,border-color] duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100 ${
                  rangeMode === value
                    ? "border-transparent bg-highlight text-highlight-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {rangeMode === "custom" ? (
            <PlannerRangePicker value={customRange} onChange={setCustomRange} />
          ) : (
            <p className="text-xs text-muted-foreground">{rangeLabel}</p>
          )}

          {skippedMeals.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                {skippedMeals.length === 1
                  ? "1 posiłek nie ma składników i nie trafi na listę"
                  : `${skippedMeals.length} ${pluralMeals(skippedMeals.length)} nie mają składników i nie trafią na listę`}
                : {skippedNames}. To własne wpisy albo przepisy bez składników.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-sm text-foreground">Gdzie dodać składniki?</h3>
          <Select
            value={mode === "existing" ? selectedListId : "new"}
            onValueChange={(val) => {
              if (val === "new") {
                setMode("new");
                setSelectedListId("");
              } else {
                setMode("existing");
                setSelectedListId(val);
              }
            }}
          >
            <SelectTrigger className="w-full h-12 bg-secondary/30">
              <SelectValue placeholder="Wybierz listę zakupów..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new" className="font-bold text-primary py-3">
                + Utwórz nową listę
              </SelectItem>
              {lists?.map((list) => (
                <SelectItem key={list.id} value={list.id} className="py-3">
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {mode === "new" && (
            <Input
              className="h-12 bg-secondary/30"
              value={newListName}
              onChange={(e) => setCustomListName(e.target.value)}
              placeholder="Podaj nazwę nowej listy..."
            />
          )}
        </div>

        <div className="space-y-3 pb-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm text-foreground">Składniki do kupienia</h3>
            {ingredients.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                {selected.length} z {ingredients.length}
              </span>
            )}
          </div>

          {isLoading && (
            <p className="py-6 text-center text-sm text-muted-foreground">Ładowanie...</p>
          )}
          {!isLoading && ingredients.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              W tym okresie nie ma zaplanowanych przepisów ze składnikami. Własne wpisy nie trafiają na listę zakupów.
            </p>
          )}

          {ingredients.length > 0 && (
            <div className="border border-border/50 rounded-xl divide-y divide-border/50 bg-secondary/10 overflow-hidden">
              {ingredients.map((ing) => {
                const key = ingredientKey(ing);
                const isSelected = !unchecked.includes(key);
                return (
                  <label
                    key={key}
                    className="flex items-center space-x-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(key)}
                      className="w-5 h-5 rounded-md"
                    />
                    <div className="flex-1 flex justify-between items-center text-sm">
                      <span
                        className={isSelected ? "font-medium" : "text-muted-foreground line-through"}
                      >
                        {ing.name}
                      </span>
                      <span
                        className={`font-semibold ${isSelected ? "text-primary" : "text-muted-foreground/50"}`}
                      >
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 mt-2">
        <Button
          variant="raised"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {isPending ? (
            <Loader2 className="animate-spin w-5 h-5 mr-2" />
          ) : (
            <ShoppingCart className="w-5 h-5 mr-2" />
          )}
          Zapisz składniki na listę
        </Button>
      </div>
    </>
  );
}
