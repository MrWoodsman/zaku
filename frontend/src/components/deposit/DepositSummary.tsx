import type { DepositSummaryData } from "@shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { formatDepositValue } from "./depositStatus";

interface DepositSummaryProps {
  summary: DepositSummaryData | undefined;
}

// "How much money is waiting" - computed on the server over ALL usable vouchers,
// because the list below is loaded page by page
export function DepositSummary({ summary }: DepositSummaryProps) {
  return (
    <Card className="overflow-visible border border-foreground/5 py-3 ring-0">
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Do odebrania</p>
          <p className="font-mono text-2xl font-medium text-highlight">
            {summary ? formatDepositValue(summary.total) : "–"}
          </p>
        </div>
        {summary && (
          <div className="text-right text-xs leading-relaxed text-muted-foreground">
            <p>Kupony: {summary.count}</p>
            {summary.expiringCount > 0 && (
              <p className="text-amber-600 dark:text-amber-400">
                Wygasa wkrótce: {summary.expiringCount}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
