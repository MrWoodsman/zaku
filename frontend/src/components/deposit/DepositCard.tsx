import { AlertTriangleIcon, CheckIcon, ClockIcon } from "lucide-react";
import type { Deposit } from "@shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { DepositDetailsOverlay } from "@/components/overlay/deposit/DepositDetailsOverlay";
import { cn } from "@/lib/utils";
import { formatDepositValue, getDepositState, getExpiryLabel } from "./depositStatus";

interface DepositCardProps {
  deposit: Deposit;
}

export function DepositCard({ deposit }: DepositCardProps) {
  const state = getDepositState(deposit);
  const isUsed = state === "used";
  const isExpiring = state === "expiring";
  const isExpired = state === "expired";

  return (
    <DepositDetailsOverlay deposit={deposit}>
      <Card
        className={cn(
          // overflow-visible: see ItemCard (iOS Safari shadow corners)
          "cursor-pointer overflow-visible border py-3 ring-0 transition-transform active:scale-[0.98]",
          isExpiring ? "border-amber-500/30 bg-amber-500/5" : "border-foreground/5 bg-card",
          (isUsed || isExpired) && "opacity-50",
        )}
      >
        <CardContent className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl font-medium",
              isUsed ? "bg-foreground/5 text-muted-foreground" : "bg-highlight/15 text-highlight",
            )}
          >
            {isUsed ? <CheckIcon className="size-5" /> : (deposit.shop_name?.[0] ?? "?")}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <p className={cn("truncate text-base font-medium", isUsed && "line-through")}>
              {deposit.shop_name ?? "Bez sklepu"}
            </p>
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs",
                isExpiring ? "text-amber-600 dark:text-amber-400" : isExpired ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {isExpiring || isExpired ? (
                <AlertTriangleIcon className="size-3.5 shrink-0" />
              ) : (
                !isUsed && <ClockIcon className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{getExpiryLabel(deposit)}</span>
              {/* Last 4 digits to tell similar vouchers apart */}
              {deposit.code && !isUsed && (
                <span className="shrink-0 rounded-sm bg-foreground/5 px-1.5 font-mono text-muted-foreground">
                  …{deposit.code.slice(-4)}
                </span>
              )}
            </div>
          </div>

          <span
            className={cn(
              "shrink-0 font-mono text-base font-medium",
              isUsed && "text-muted-foreground line-through",
            )}
          >
            {formatDepositValue(deposit.value)}
          </span>
        </CardContent>
      </Card>
    </DepositDetailsOverlay>
  );
}
