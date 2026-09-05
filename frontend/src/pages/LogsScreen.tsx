// TYPES
import { useEffect, useRef } from "react";
import { useItemsCompletedQuery } from "@/hooks/useItems";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";
import { ClockCheckIcon, Loader2Icon, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
      <div className="pt-[max(8px,env(safe-area-inset-top))] px-2 pb-2 bg-background border-b z-50 flex items-center gap-2 shrink-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-highlight/10 text-highlight">
          <ClockCheckIcon size={18} />
        </div>
        <h1 className="font-semibold text-lg">Ostatnio kupione</h1>
      </div>

      {/* CONTENT */}
      {items.length === 0 ? (
        <div className="flex-1 p-4">
          <Empty className="h-full border border-dashed">
            <EmptyHeader>
              <EmptyMedia className="size-14 rounded-2xl bg-highlight/10 text-highlight">
                <ClockCheckIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>Brak historii</EmptyTitle>
              <EmptyDescription>
                Kupione produkty będą się tu pojawiać w miarę odhaczania ich na listach.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 pt-2 space-y-4 scrollbar-gutter-stable pb-4">
          {Object.entries(groupedItems)
            .sort(([dayA], [dayB]) => (dayA < dayB ? 1 : -1))
            .map(([day, items]: [string, HistoryItem[]]) => (
              <div key={day} className="day-group">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1 mb-2">
                  {day}
                </h2>
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
      )}
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
    <Card className="border border-foreground/5 bg-card py-0 shadow-sm ring-0">
      <CardContent className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight">
          <Check className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium">{item.name}</h1>
          <h2 className="font-mono text-[12px] text-muted-foreground">
            {item.quantity} {item.unit}
          </h2>
        </div>

        <span className="shrink-0 font-mono text-sm text-muted-foreground">
          {convertTimeToHHMM(item.completed_at)}
        </span>
      </CardContent>
    </Card>
  );
}
