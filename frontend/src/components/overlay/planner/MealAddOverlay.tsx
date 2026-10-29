import { useState } from "react";
import { ChefHatIcon, ClockIcon, PencilLineIcon, SearchIcon } from "lucide-react";
import type { MealSlot, PlannerPerson } from "@shared/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllRecipesQuery } from "@/hooks/useRecipes";
import { useAddPlannerMealMutation } from "@/hooks/usePlanner";
import { normalizeSearch } from "@/utils/normalizeSearch";

interface MealAddOverlayProps {
  children: React.ReactNode;
  date: string; // yyyy-MM-dd
  dateLabel: string;
  slot: MealSlot;
  slotLabel: string;
  // Who the meal is for; null = shared
  person: PlannerPerson | null;
}

type Mode = "recipe" | "note";

// Add a meal to a day: pick one of the group's recipes (so it can feed the shopping list)
// or just type what's planned
export function MealAddOverlay({
  children,
  date,
  dateLabel,
  slot,
  slotLabel,
  person,
}: MealAddOverlayProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("recipe");
  const { mutate: addMeal, isPending } = useAddPlannerMealMutation();

  const add = (payload: { recipe_id?: string; title?: string }) => {
    addMeal(
      { date, slot, person_id: person?.id ?? null, ...payload },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMode("recipe");
      }}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{slotLabel}</DrawerTitle>
          <DrawerDescription>
            {dateLabel} · dla: {person ? person.name : "wszystkich"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
            <ModeButton active={mode === "recipe"} onClick={() => setMode("recipe")}>
              <ChefHatIcon /> Przepis
            </ModeButton>
            <ModeButton active={mode === "note"} onClick={() => setMode("note")}>
              <PencilLineIcon /> Własny wpis
            </ModeButton>
          </div>

          {mode === "recipe" ? (
            <RecipePicker disabled={isPending} onPick={(recipeId) => add({ recipe_id: recipeId })} />
          ) : (
            <NoteForm disabled={isPending} onSubmit={(title) => add({ title })} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-[transform,color,background-color] duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100 [&_svg]:size-4 ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// Only mounted while the drawer is open, so the recipes aren't polled in the background
function RecipePicker({
  onPick,
  disabled,
}: {
  onPick: (recipeId: string) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const { data: recipes = [], isLoading } = useAllRecipesQuery();

  const query = normalizeSearch(search.trim());
  const visible = recipes
    .filter((recipe) => recipe.status === "published")
    .filter((recipe) => normalizeSearch(recipe.name).includes(query));

  return (
    <>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj przepisu..."
          className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-base outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* data-vaul-no-drag: swiping the list scrolls it instead of dragging the Drawer down.
          Fixed height: the Drawer doesn't resize while filtering */}
      <div
        data-vaul-no-drag
        className="flex h-[45vh] flex-col overflow-y-auto overscroll-contain rounded-lg border border-border"
      >
        {isLoading && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">Ładowanie...</div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {recipes.length === 0
              ? "Nie masz jeszcze żadnych przepisów - dodaj je w zakładce Przepisy lub wpisz posiłek ręcznie."
              : "Brak pasujących przepisów"}
          </div>
        )}
        {visible.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(recipe.id)}
            className="flex items-center gap-3 border-b border-border/50 p-2 text-left transition-colors last:border-b-0 active:bg-muted disabled:opacity-50"
          >
            {recipe.image_url ? (
              <img src={recipe.image_url} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight">
                <ChefHatIcon className="size-5" />
              </span>
            )}
            <span className="flex-1 truncate text-sm font-medium">{recipe.name}</span>
            {recipe.time_to_make > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="size-3.5" /> {recipe.time_to_make} min
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function NoteForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (title: string) => void;
  disabled: boolean;
}) {
  const [title, setTitle] = useState("");
  const trimmed = title.trim();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && !disabled) onSubmit(trimmed);
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Np. pizza na mieście"
        maxLength={120}
        className="h-12 bg-secondary/30 text-base"
      />
      <p className="text-xs text-muted-foreground">
        Własny wpis trafia do planu, ale nie dodaje składników do listy zakupów.
      </p>
      <Button
        type="submit"
        variant="raised"
        className="h-12 w-full text-base font-semibold"
        disabled={!trimmed || disabled}
      >
        Dodaj do planu
      </Button>
    </form>
  );
}
