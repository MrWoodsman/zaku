import { Skeleton } from "@/components/ui/skeleton";

// Same delay as ScreenSkeleton: nothing for the first moment, then it fades in
const SHOW_AFTER_MS = 200;

// Placeholder for the planner: header, the strip of days and three meals of the day
export function PlannerSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Ładowanie"
      className="h-full animate-in fade-in-0 duration-300 overflow-hidden"
      style={{ animationDelay: `${SHOW_AFTER_MS}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-2 border-b px-2 pt-[max(8px,var(--safe-top))] pb-2">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-5 w-16" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </div>

      <div className="grid grid-cols-7 gap-1.5 px-2 py-3">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-[4.25rem] rounded-xl" />
        ))}
      </div>

      <div className="space-y-5 px-2 pt-2">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
