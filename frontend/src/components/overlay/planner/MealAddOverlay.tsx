import { useState } from "react";
import {
  ChefHatIcon,
  ClockIcon,
  PencilLineIcon,
  SearchIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import type { MealSlot, PlannerPerson, RecipeItem } from "@shared/types";
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
import { formatPortions } from "@/utils/plural";
import { ServingsStepper } from "@/components/common/ServingsStepper";

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
  // A recipe waiting for its servings to be chosen (second step of adding a recipe)
  const [picked, setPicked] = useState<RecipeItem | null>(null);
  const { mutate: addMeal, isPending } = useAddPlannerMealMutation();

  const add = (payload: { recipe_id?: string; title?: string; servings?: number }) => {
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
        if (next) {
          setMode("recipe");
          setPicked(null);
        }
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

        {picked ? (
          <ServingsStep
            recipe={picked}
            disabled={isPending}
            onBack={() => setPicked(null)}
            onConfirm={(servings) =>
              // Unchanged = the meal just follows the recipe, so it isn't pinned to a number
              add({
                recipe_id: picked.id,
                servings: servings === picked.servings ? undefined : servings,
              })
            }
          />
        ) : (
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
            <RecipePicker
              disabled={isPending}
              // A recipe with servings asks how many first; one without has nothing to ask
              onPick={(recipe) => (recipe.servings ? setPicked(recipe) : add({ recipe_id: recipe.id }))}
            />
          ) : (
            <NoteForm disabled={isPending} onSubmit={(title) => add({ title })} />
          )}
        </div>
        )}
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
  onPick: (recipe: RecipeItem) => void;
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
            onClick={() => onPick(recipe)}
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
            {(recipe.time_to_make > 0 || recipe.servings) && (
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
                {recipe.time_to_make > 0 && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="size-3.5" /> {recipe.time_to_make} min
                  </span>
                )}
                {recipe.servings ? (
                  <span className="flex items-center gap-1">
                    <UtensilsCrossedIcon className="size-3.5" /> {formatPortions(recipe.servings)}
                  </span>
                ) : null}
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

// Second step for a recipe that says how many servings it is for: how many should this meal be
function ServingsStep({
  recipe,
  disabled,
  onBack,
  onConfirm,
}: {
  recipe: RecipeItem;
  disabled: boolean;
  onBack: () => void;
  onConfirm: (servings: number) => void;
}) {
  const [servings, setServings] = useState(recipe.servings ?? 1);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm text-muted-foreground">Na ile porcji?</p>
        <p className="text-base font-semibold">{recipe.name}</p>
      </div>

      <ServingsStepper value={servings} onChange={setServings} fullWidth />
      {/* Fixed height whether the hint shows or not, so the buttons below don't jump */}
      <p className="-mt-2 min-h-8 text-center text-xs text-muted-foreground">
        {recipe.servings && servings !== recipe.servings ? (
          <>
            Oryginał: {formatPortions(recipe.servings)} - składniki w zakupach się przeliczą.
          </>
        ) : null}
      </p>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" className="h-12 px-4" onClick={onBack}>
          Wróć
        </Button>
        <Button
          type="button"
          variant="raised"
          className="h-12 flex-1 text-base font-semibold"
          disabled={disabled}
          onClick={() => onConfirm(servings)}
        >
          Dodaj do planu
        </Button>
      </div>
    </div>
  );
}
