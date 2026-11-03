import { Skeleton } from "@/components/ui/skeleton";

// Shapes of the rows a screen is about to show
type RowShape = "card" | "recipe" | "row" | "detail";
// "search" = search field + two buttons (lists, recipes), "title" = icon + title + a button
// (deposit, history, ...), "none" = the screen has no header of its own
type HeaderShape = "search" | "title" | "none";

interface ScreenSkeletonProps {
  header?: HeaderShape;
  shape?: RowShape;
  rows?: number;
}

// Wait this long before showing anything: most loads are faster, and a placeholder that
// flashes for a few frames reads as a flicker. Pure CSS (delay + fill), so no state or timer.
const SHOW_AFTER_MS = 200;

function HeaderSkeleton({ header }: { header: HeaderShape }) {
  if (header === "none") return null;

  if (header === "search") {
    return (
      <div className="flex gap-2 px-2 pt-[max(8px,var(--safe-top))]">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-9 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b px-2 pt-[max(8px,var(--safe-top))] pb-2">
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="h-5 w-28" />
      <div className="flex-1" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

function RowSkeleton({ shape }: { shape: RowShape }) {
  if (shape === "card") {
    // shopping list / deposit voucher: icon + name + progress bar
    return (
      <div className="flex items-center gap-3 rounded-xl border border-foreground/5 p-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
    );
  }

  if (shape === "recipe") {
    return (
      <div className="flex gap-3 rounded-xl border border-foreground/5 p-2">
        <Skeleton className="size-20 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    );
  }

  // "row" and "detail" rows are plain bars
  return <Skeleton className="h-14 w-full rounded-xl" />;
}

// Placeholder for a screen that is still loading. Same job as <Loading>, but it shows the
// screen's own layout, so the content arrives into the right place instead of replacing a spinner.
export function ScreenSkeleton({ header = "search", shape = "card", rows = 6 }: ScreenSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Ładowanie"
      className="h-full animate-in fade-in-0 duration-300 overflow-hidden"
      style={{ animationDelay: `${SHOW_AFTER_MS}ms`, animationFillMode: "both" }}
    >
      <HeaderSkeleton header={header} />

      <div className="space-y-3 px-2 pt-3">
        {shape === "detail" && <Skeleton className="h-48 w-full rounded-2xl" />}
        {Array.from({ length: shape === "detail" ? 3 : rows }, (_, index) => (
          <RowSkeleton key={index} shape={shape} />
        ))}
      </div>
    </div>
  );
}
