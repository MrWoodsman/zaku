// TYPES
import { useEffect, useRef } from "react";
import { useItemsCompletedQuery } from "@/hooks/useItems";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";
import { Plus, SortDescIcon, TicketSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepositAddOverlay } from "@/components/overlay/deposit/depositAddOverlay";
import { EmptyDepositPrompt } from "@/components/deposit/EmptyDepositPrompt";

export function DepositVouchersScreen() {
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
        title="Ładowanie listy kuponów kaucyjnych!"
        description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
      />
    );
  if (error || !data)
    return (
      <NotFound
        title="Nie udało się załadować listy kuponów kaucyjnych!"
        description="Ta lista nie istnieje lub wystąpił problem z połączeniem z serwerem."
      />
    );

  // const items = data.pages.flatMap((page) => page.items);

  return (
    <div className="deposit-list h-full flex flex-col bg-background">
      {/* TOP NAVIGATION */}
      <div className="pt-[max(8px,var(--safe-top))] px-2 pb-2 bg-background border-b z-50 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 w-full">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-highlight/10 text-highlight">
          <TicketSlash size={18} />
        </div>
        <h1 className="font-semibold text-lg">Kaucja</h1>
        </div>

        <div className="flex gap-2">
          <Button size="icon" variant={"secondary"}>
            <SortDescIcon />
          </Button>
          <DepositAddOverlay>
            <Button variant="accent" onClick={(e) => e.currentTarget.blur()}>
              Dodaj <Plus className="size-4" />
            </Button>
          </DepositAddOverlay>
        </div>
      </div>

      {/* CONTENT */}
      <EmptyDepositPrompt />
    </div>
  );
}