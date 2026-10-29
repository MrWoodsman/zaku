import { memo, useCallback, useEffect, useRef } from "react";
import { format, isToday } from "date-fns";
import { pl } from "date-fns/locale";

interface PlannerWeekStripProps {
  // Every day that can be scrolled to, consecutive
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
  // Called (debounced) with the day in the middle of the strip while scrolling, so the
  // screen can load the dots for what's on screen
  onViewChange: (day: Date) => void;
  // Colors of the meals planned on a day (yyyy-MM-dd -> colors), shown as dots under the number
  dotsByDay: Record<string, string[]>;
  toKey: (day: Date) => string;
}

const MAX_DOTS = 4;
const GAP_PX = 6;
const VISIBLE_DAYS = 7.25;
const VIEW_DEBOUNCE_MS = 120;

// One shared empty array, so a day without meals gets the same prop every render and its
// memoized card is left alone
const NO_DOTS: string[] = [];

interface DayCardProps {
  day: Date;
  dayKey: string;
  isSelected: boolean;
  dots: string[];
  onSelect: (day: Date) => void;
}

// The strip holds ~550 of these, so a card only re-renders when its own props change -
// a poll or a selection touches the one or two cards that actually differ
const DayCard = memo(function DayCard({
  day,
  dayKey,
  isSelected,
  dots,
  onSelect,
}: DayCardProps) {
  return (
    <button
      type="button"
      data-day={dayKey}
      onClick={() => onSelect(day)}
      aria-pressed={isSelected}
      aria-label={format(day, "EEEE, d MMMM", { locale: pl })}
      style={{
        flex: `0 0 calc((100% - ${(VISIBLE_DAYS - 1) * GAP_PX}px) / ${VISIBLE_DAYS})`,
      }}
      // Only transform and colors animate (never "all"); the shadow just switches with the
      // selection, since animating box-shadow repaints every frame
      // ease-out and short: the card answers the tap at once. Reduced motion keeps the color
      // change but drops the scaling.
      className={`relative flex snap-center flex-col items-center gap-0.5 rounded-xl border py-1.5 transition-[transform,background-color,border-color,color] duration-160 ease-snappy active:scale-95 motion-reduce:transition-colors motion-reduce:active:scale-100 ${
        isSelected
          ? "z-10 scale-110 border-transparent bg-highlight text-highlight-foreground shadow-raised-sm motion-reduce:scale-100"
          : "border-border bg-card"
      }`}
    >
      <span className="text-[10px] font-bold uppercase">
        {format(day, "EEE", { locale: pl })}
      </span>
      <span
        className={`text-base font-semibold ${
          isSelected
            ? ""
            : isToday(day)
              ? "text-highlight"
              : "text-muted-foreground"
        }`}
      >
        {format(day, "d")}
      </span>

      {/* The 1st of a month says which month it is, so a long scroll doesn't get lost.
          Absolute, so it adds no height to the card. */}
      {day.getDate() === 1 && (
        <span className="absolute top-0.5 right-1 text-[8px] leading-none font-bold uppercase opacity-60">
          {format(day, "LLL", { locale: pl })}
        </span>
      )}

      {/* Fixed height, so cards don't change size when a day gets its first meal */}
      <span className="flex h-1.5 items-center gap-0.5">
        {dots.slice(0, MAX_DOTS).map((color, index) => (
          <span
            key={index}
            className={`size-1.5 rounded-full ${isSelected ? "ring-1 ring-white/80" : ""}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    </button>
  );
});

// Free horizontal strip of days: swipe it like a roll, cards snap into place, the selected
// one is orange and a bit bigger. Seven days fit on screen.
export function PlannerWeekStrip({
  days,
  selected,
  onSelect,
  onViewChange,
  dotsByDay,
  toKey,
}: PlannerWeekStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasCenteredRef = useRef(false);
  const viewTimerRef = useRef<number>(undefined);

  const selectedKey = toKey(selected);

  // Bring the selected day to the middle - on first render at once, afterwards smoothly
  // (a tap, the week arrows, "Dziś"). scrollTo is native, so it doesn't run on our JS thread.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const card = scroller?.querySelector<HTMLElement>(
      `[data-day="${selectedKey}"]`,
    );
    if (!scroller || !card) return;

    scroller.scrollTo({
      left: card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2,
      // Reduced motion: jump instead of gliding
      behavior:
        hasCenteredRef.current &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "instant",
    });
    hasCenteredRef.current = true;
  }, [selectedKey]);

  // Not per frame: the timer restarts on every scroll event and fires once the strip rests,
  // so React renders once per swipe instead of once per frame
  const handleScroll = useCallback(() => {
    window.clearTimeout(viewTimerRef.current);
    viewTimerRef.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      const first = scroller?.firstElementChild as HTMLElement | null;
      const second = first?.nextElementSibling as HTMLElement | null;
      if (!scroller || !first || !second) return;

      const pitch = second.offsetLeft - first.offsetLeft;
      const middle =
        scroller.scrollLeft + scroller.clientWidth / 2 - first.offsetLeft;
      const index = Math.min(
        days.length - 1,
        Math.max(0, Math.floor(middle / pitch)),
      );
      onViewChange(days[index]);
    }, VIEW_DEBOUNCE_MS);
  }, [days, onViewChange]);

  useEffect(() => () => window.clearTimeout(viewTimerRef.current), []);

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      // relative: card.offsetLeft is measured from here. Scrollbar hidden, it's a swipe strip.
      className="relative flex snap-x snap-proximity gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const key = toKey(day);

        return (
          <DayCard
            key={key}
            day={day}
            dayKey={key}
            isSelected={key === selectedKey}
            dots={dotsByDay[key] ?? NO_DOTS}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
