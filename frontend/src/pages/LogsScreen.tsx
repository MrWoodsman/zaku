// TYPES
import { useEffect, useRef } from "react";
import { useItemsCompletedQuery } from "@/hooks/useItems";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";
import { ClockCheckIcon, Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoryItem, ShoppingItem } from "@shared/types";
import { convertTimeToHHMM } from "@/utils/convertTimetoHHMM";
import { groupByDay } from "@/utils/groupByDay";

export function LogsScreen() {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useItemsCompletedQuery();

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" }, // ładuje kolejną paczkę zanim user dojedzie do dołu
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading)
    return (
      <Loading
        title="Ładowanie listy przedmiotów do kupienia!"
        description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
      />
    );
  if (error || !data)
    return (
      <NotFound
        title="Nie udało się załadować przedmiotów do kupienia!"
        description="Ta lista nie istnieje lub wystąpił problem z połączeniem z serwerem."
      />
    );

  const items = data.pages.flatMap((page) => page.items);
  const groupedItems = groupByDay(items);

  return (
    <div className="shopping-lists-list h-full flex flex-col bg-background">
      {/* TOP NAVIGATION */}
      <div className="pt-[max(8px,env(safe-area-inset-top))] px-2 pb-2 bg-background border-b z-50 flex items-center justify-between gap-3 shrink-0">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <ClockCheckIcon size={20} />
          Ostatnio kupione
        </h1>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 space-y-2 scrollbar-gutter-stable pb-4">
        {Object.entries(groupedItems)
          .sort(([dayA], [dayB]) => (dayA < dayB ? 1 : -1))
          .map(([day, items]: [string, HistoryItem[]]) => (
            <div key={day} className="day-group">
              <h2 className="text-xs text-foreground/50 pl-2 mb-2">{day}</h2>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <HistoryItem item={item} key={item.id} />
                ))}
              </div>
            </div>
          ))}

        {/* SENTINEL - ładuje kolejną stronę gdy wjedzie w viewport */}
        <div ref={sentinelRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4 text-foreground/50">
            <Loader2Icon size={18} className="animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

interface HistoryItemProps {
  item: ShoppingItem & {
    completed_at: string;
  };
}

export function HistoryItem({ item }: HistoryItemProps) {
  return (
    <Card
      className={`border border-foreground/5 overflow-hidden transition-colors duration-200 ${
        item.completed ? "bg-foreground/7.5 text-primary" : "bg-foreground/7.5"
      } py-0`}
    >
      <CardContent className="px-2 pr-0 flex gap-2 items-stretch relative">
        <div className="left-wrap w-full py-1 flex items-center cursor-pointer select-none">
          <div className="column flex flex-col">
            <h1 className={`font-medium text-sm`}>{item.name}</h1>
            {/* <h2 className="text-[10px] text-neutral-500">ID: {item.id}</h2> */}
            <h2 className="text-[12px] text-primary/60">
              {item.quantity} {item.unit}
            </h2>
          </div>
        </div>
        <div className="right-wrap px-2 flex flex-col justify-center">
          <h2 className="text-sm">{convertTimeToHHMM(item.completed_at)}</h2>
        </div>
      </CardContent>
    </Card>
  );
}
