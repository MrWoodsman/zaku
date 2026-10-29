import { ChefHatIcon, PencilLineIcon, PlusIcon, XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { MealSlot, PlannerMeal, PlannerPerson } from "@shared/types";
import { MealAddOverlay } from "@/components/overlay/planner/MealAddOverlay";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { SHARED_COLOR } from "@/config/planner";
import { useDeletePlannerMealMutation } from "@/hooks/usePlanner";

interface PlannerMealSlotProps {
  slot: MealSlot;
  label: string;
  date: string; // yyyy-MM-dd
  dateLabel: string;
  meals: PlannerMeal[];
  people: PlannerPerson[];
  // Who new meals are added for; null = shared. Also decides whether names are shown on the rows.
  person: PlannerPerson | null;
}

// One meal of the day (breakfast / lunch / dinner): its planned meals and a "+" to add another
export function PlannerMealSlot({
  slot,
  label,
  date,
  dateLabel,
  meals,
  people,
  person,
}: PlannerMealSlotProps) {
  const navigate = useNavigate();
  const { mutate: deleteMeal, isPending: isDeleting } = useDeletePlannerMealMutation();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="border-b border-dashed border-border pb-1 text-xs font-medium text-muted-foreground">
        {label}
      </h2>

      {meals.map((meal) => {
        const owner = people.find((p) => p.id === meal.person_id);
        const isRecipe = Boolean(meal.recipe_id);
        // Who it's for (only when it's not obvious) and whether it feeds the shopping list
        const subtitle = [
          !person ? (owner ? owner.name : "Wspólne") : null,
          meal.has_ingredients ? null : "bez składników",
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <div key={meal.id} className="flex items-stretch gap-1 rounded-xl border border-border bg-card">
            {/* Person's color; grey = shared */}
            <span
              className="w-1.5 shrink-0 rounded-l-xl"
              style={{ backgroundColor: owner?.color ?? SHARED_COLOR }}
            />

            <button
              type="button"
              disabled={!isRecipe}
              onClick={() => meal.recipe_id && navigate(ROUTES.RECIPES_VIEW(meal.recipe_id))}
              className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-1 text-left"
            >
              {meal.image_url ? (
                <img src={meal.image_url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
              ) : isRecipe ? (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight">
                  <ChefHatIcon className="size-5" />
                </span>
              ) : (
                // A note, not a recipe: a dashed pencil tile says "just a reminder, no ingredients"
                <span
                  role="img"
                  aria-label="Własny wpis"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
                >
                  <PencilLineIcon className="size-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{meal.title}</span>
                {/* With one person selected every row is theirs or shared - a name would be noise */}
                {subtitle && (
                  <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
                )}
              </span>
            </button>

            <Button
              size="icon"
              variant="ghost"
              className="self-center"
              aria-label={`Usuń z planu: ${meal.title}`}
              disabled={isDeleting}
              onClick={() => deleteMeal(meal.id)}
            >
              <XIcon className="text-muted-foreground" />
            </Button>
          </div>
        );
      })}

      <MealAddOverlay date={date} dateLabel={dateLabel} slot={slot} slotLabel={label} person={person}>
        <Button
          variant="secondary"
          className="h-11 w-full"
          aria-label={`Dodaj: ${label}`}
          onClick={(e) => e.currentTarget.blur()}
        >
          <PlusIcon className="size-5 text-muted-foreground" />
        </Button>
      </MealAddOverlay>
    </section>
  );
}
