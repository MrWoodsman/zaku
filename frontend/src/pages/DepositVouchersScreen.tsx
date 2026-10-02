// TYPES
import { useEffect, useRef } from "react";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";
import { Loader2Icon, Plus, StarIcon, TicketSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepositAddOverlay } from "@/components/overlay/deposit/depositAddOverlay";
import { EmptyDepositPrompt } from "@/components/deposit/EmptyDepositPrompt";
import { ShopPreferencesOverlay } from "@/components/overlay/deposit/ShopPreferencesOverlay";
import { DepositCard } from "@/components/deposit/DepositCard";
import { DepositSummary } from "@/components/deposit/DepositSummary";
import { DepositSortPopover } from "@/components/deposit/DepositSortPopover";
import { useDepositSummaryQuery, useDepositsInfiniteQuery } from "@/hooks/useDeposits";
import { useDepositListParams } from "@/hooks/useDepositListParams";

export function DepositVouchersScreen() {
  const { params, setParams, isDefault } = useDepositListParams();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDepositsInfiniteQuery(params);
  const { data: summary } = useDepositSummaryQuery();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Progressive loading: next page when the sentinel at the bottom comes into view
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

  const deposits = data?.pages.flatMap((page) => page.items) ?? [];

  const renderContent = () => {
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
    // Nothing at all (not just filtered out) -> the regular empty state
    if (deposits.length === 0 && params.showUsed) return <EmptyDepositPrompt />;

    return (
      // Order comes from the backend (valid -> expired -> used, chosen sort inside)
      <div className="flex-1 space-y-3 overflow-y-auto px-2 pt-3 pb-[env(safe-area-inset-bottom)] scrollbar-gutter-stable">
        <DepositSummary summary={summary} />

        {deposits.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Brak kuponów do wykorzystania. Włącz „Pokaż wykorzystane”, żeby zobaczyć historię.
          </p>
        )}

        {deposits.map((deposit) => (
          <DepositCard key={deposit.id} deposit={deposit} />
        ))}

        <div ref={sentinelRef} className="flex justify-center py-2">
          {isFetchingNextPage && <Loader2Icon className="size-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    );
  };

  return (
    <div className="deposit-list h-full flex flex-col bg-background">
      {/* TOP NAVIGATION */}
      <div className="pt-[max(8px,var(--safe-top))] px-2 pb-2 bg-background border-b z-50 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 w-full">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight">
          <TicketSlash size={18} />
        </div>
        <h1 className="font-semibold text-lg">Kaucja</h1>
        </div>

        <div className="flex gap-2">
          <ShopPreferencesOverlay>
            <Button size="icon" variant={"secondary"} aria-label="Twoje sklepy">
              <StarIcon />
            </Button>
          </ShopPreferencesOverlay>
          <DepositSortPopover params={params} onChange={setParams} isDefault={isDefault} />
          <DepositAddOverlay>
            <Button variant="accent" onClick={(e) => e.currentTarget.blur()}>
              Dodaj <Plus className="size-4" />
            </Button>
          </DepositAddOverlay>
        </div>
      </div>

      {/* CONTENT */}
      {renderContent()}
    </div>
  );
}
