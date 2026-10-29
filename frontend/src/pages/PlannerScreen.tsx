import { useCallback, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";
import { PlannerWeekStrip } from "@/components/planner/PlannerWeekStrip";
import { PlannerMealSlot } from "@/components/planner/PlannerMealSlot";
import { PlannerPersonOverlay } from "@/components/overlay/planner/PlannerPersonOverlay";
import { PlannerShoppingOverlay } from "@/components/overlay/planner/PlannerShoppingOverlay";
import { PlannerSlotsOverlay } from "@/components/overlay/planner/PlannerSlotsOverlay";
import { DEFAULT_SLOTS, MEAL_SLOTS, SHARED_COLOR } from "@/config/planner";
import { usePlannerMealsQuery, usePlannerPeopleQuery } from "@/hooks/usePlanner";
import { usePlannerPersonId } from "@/hooks/usePlannerPerson";
import { toDateKey } from "@/utils/plannerDates";

// How far the day strip reaches from this week
const WEEKS_BACK = 26;
const WEEKS_AHEAD = 52;
// Dots are loaded for the days around whatever the strip is showing
const DOTS_WEEKS_AROUND = 3;

export function PlannerScreen() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  // The day in the middle of the strip while it's being scrolled
  const [viewDate, setViewDate] = useState(() => new Date());
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isSlotsOpen, setIsSlotsOpen] = useState(false);
  // Which drawer the "more" menu asked for; opened when the menu has finished closing
  const pendingOverlayRef = useRef<"shopping" | "slots" | null>(null);
  const { personId, setPersonId } = usePlannerPersonId();

  const days = useMemo(() => {
    const start = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -WEEKS_BACK);
    return Array.from({ length: (WEEKS_BACK + WEEKS_AHEAD) * 7 }, (_, index) => addDays(start, index));
  }, []);

  const selectedKey = toDateKey(selectedDate);
  const dotsFrom = toDateKey(addDays(viewDate, -DOTS_WEEKS_AROUND * 7));
  const dotsTo = toDateKey(addDays(viewDate, DOTS_WEEKS_AROUND * 7));

  const { data: people = [] } = usePlannerPeopleQuery();
  const dayQuery = usePlannerMealsQuery(selectedKey, selectedKey);
  const { data: windowMeals } = usePlannerMealsQuery(dotsFrom, dotsTo);

  // A stored person can be gone (deleted on another phone) -> fall back to everyone
  const person = people.find((p) => p.id === personId) ?? null;

  // One person selected: their meals plus the shared ones. Everyone: all of it.
  const isVisible = (meal: { person_id: string | null }) =>
    !person || meal.person_id === null || meal.person_id === person.id;

  // Memoized, so the strip's cards keep the same dots between renders and don't re-render
  const dotsByDay = useMemo(() => {
    const byDay: Record<string, string[]> = {};
    for (const meal of windowMeals ?? []) {
      if (person && meal.person_id !== null && meal.person_id !== person.id) continue;
      const color = people.find((p) => p.id === meal.person_id)?.color ?? SHARED_COLOR;
      (byDay[meal.date] ??= []).push(color);
    }
    return byDay;
  }, [windowMeals, people, person]);

  const dayMeals = (dayQuery.data ?? []).filter((meal) => meal.date === selectedKey && isVisible(meal));

  // Meals the person turned on; everyone sees what anybody turned on. A meal that holds
  // something is shown even if it's turned off, so nothing planned ever disappears.
  const chosenSlots = person
    ? person.slots
    : people.length > 0
      ? people.flatMap((p) => p.slots)
      : DEFAULT_SLOTS;
  const visibleSlots = MEAL_SLOTS.filter(
    ({ slot }) => chosenSlots.includes(slot) || dayMeals.some((meal) => meal.slot === slot),
  );

  const dateLabel = format(selectedDate, "d MMMM", { locale: pl });

  // Stable, so the strip's memoized cards aren't re-rendered by a new function every time
  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setViewDate(date);
  }, []);

  const renderDay = () => {
    if (dayQuery.isLoading)
      return (
        <div className="h-64">
          <Loading
            title="Ładowanie planera posiłków!"
            description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
          />
        </div>
      );
    if (dayQuery.error || !dayQuery.data)
      return (
        <div className="h-64">
          <NotFound
            title="Nie udało się załadować planera!"
            description="Wystąpił problem z połączeniem z serwerem."
          />
        </div>
      );

    return (
      // Dimmed while the next day is still on its way
      <div
        className={`flex flex-col gap-5 transition-opacity duration-150 ease-out ${dayQuery.isPlaceholderData ? "opacity-50" : ""}`}
      >
        {visibleSlots.map(({ slot, label }) => (
          <PlannerMealSlot
            key={slot}
            slot={slot}
            label={label}
            date={selectedKey}
            dateLabel={dateLabel}
            meals={dayMeals.filter((meal) => meal.slot === slot)}
            people={people}
            person={person}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* TOP NAVIGATION */}
      <div className="pt-[max(8px,var(--safe-top))] px-2 pb-2 bg-background border-b z-50 flex items-center gap-2 shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight">
            <CalendarDaysIcon size={18} />
          </div>
          <h1 className="font-semibold text-lg">Planer</h1>
        </div>

        <PlannerPersonOverlay people={people} selectedId={person?.id ?? null} onSelect={setPersonId}>
          <Button
            variant="accent"
            className="max-w-[55%] shrink-0"
            // Person's color; the "accent" variant's orange stays for everyone / nobody added
            style={person ? { backgroundColor: person.color } : undefined}
            onClick={(e) => e.currentTarget.blur()}
          >
            {person ? (
              <span className="size-2 rounded-full bg-white/90" />
            ) : people.length === 0 ? (
              <UserPlusIcon />
            ) : (
              <UsersIcon />
            )}
            <span className="truncate">
              {person ? person.name : people.length === 0 ? "Dodaj osobę" : "Wszyscy"}
            </span>
            <ChevronDownIcon />
          </Button>
        </PlannerPersonOverlay>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="secondary" aria-label="Więcej">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            // A drawer opened while the menu is still closing hides the page (aria-hidden) while
            // focus is still inside the menu / on its trigger. So the drawer opens only once the
            // menu is gone, and focus isn't handed back to the trigger - the drawer takes it.
            onCloseAutoFocus={(e) => {
              if (!pendingOverlayRef.current) return;
              e.preventDefault();
              if (pendingOverlayRef.current === "shopping") setIsShoppingOpen(true);
              else setIsSlotsOpen(true);
              pendingOverlayRef.current = null;
            }}
          >
            <DropdownMenuItem
              className="gap-2 py-2.5"
              onSelect={() => {
                pendingOverlayRef.current = "shopping";
              }}
            >
              <ShoppingCartIcon /> Lista zakupów z planu
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 py-2.5"
              disabled={!person}
              onSelect={() => {
                pendingOverlayRef.current = "slots";
              }}
            >
              <SlidersHorizontalIcon />
              {person ? "Posiłki w ciągu dnia" : "Posiłki (wybierz osobę)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PlannerShoppingOverlay
        open={isShoppingOpen}
        onOpenChange={setIsShoppingOpen}
        anchor={selectedDate}
        personId={person?.id ?? null}
        personName={person?.name ?? null}
      />
      <PlannerSlotsOverlay open={isSlotsOpen} onOpenChange={setIsSlotsOpen} person={person} />

      <div className="flex-1 overflow-y-auto scrollbar-gutter-stable">
        {/* The strip stays on top while the day scrolls under it - the content fades into the
            background just below it instead of being cut off */}
        <div className="sticky top-0 z-10 bg-background">
          <PlannerWeekStrip
            days={days}
            selected={selectedDate}
            onSelect={selectDate}
            onViewChange={setViewDate}
            dotsByDay={dotsByDay}
            toKey={toDateKey}
          />
          <div className="pointer-events-none absolute inset-x-0 top-full h-6 bg-linear-to-b from-background to-transparent" />
        </div>

        <div className="px-2 pb-6">
          <div className="flex items-center justify-between py-3">
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-bold text-muted-foreground">
                {format(selectedDate, "EEEE, yyyy", { locale: pl })}
              </p>
              <h2 className="truncate text-xl font-semibold tracking-tight">{dateLabel}</h2>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!isSameDay(selectedDate, new Date()) && (
                <Button size="sm" variant="secondary" onClick={() => selectDate(new Date())}>
                  Dziś
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Poprzedni tydzień"
                onClick={() => selectDate(addWeeks(selectedDate, -1))}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Następny tydzień"
                onClick={() => selectDate(addWeeks(selectedDate, 1))}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>

          {renderDay()}
        </div>
      </div>
    </div>
  );
}
