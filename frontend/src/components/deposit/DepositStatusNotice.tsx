import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { AlertTriangleIcon, CircleCheckIcon, ClockAlertIcon } from "lucide-react";
import type { Deposit } from "@shared/types";
import { cn } from "@/lib/utils";
import { getDaysLeft, getDepositState, parseDbDate } from "./depositStatus";

interface DepositStatusNoticeProps {
  deposit: Deposit;
}

// Plain-language status above the ticket, so a used or expired voucher is obvious
// before anyone tries to scan it. Nothing is shown for a normal valid voucher.
export function DepositStatusNotice({ deposit }: DepositStatusNoticeProps) {
  const state = getDepositState(deposit);
  if (state === "active") return null;

  const daysLeft = getDaysLeft(deposit) ?? 0;
  const validUntil = deposit.expiring_date
    ? format(parseISO(deposit.expiring_date), "d MMMM", { locale: pl })
    : "";

  const content = {
    used: {
      icon: CircleCheckIcon,
      title: "Kupon wykorzystany",
      text: deposit.used_at
        ? `Oznaczony ${format(parseDbDate(deposit.used_at), "d MMMM 'o' HH:mm", { locale: pl })}.`
        : "",
      className: "border-foreground/10 bg-foreground/5 text-foreground",
    },
    expired: {
      icon: AlertTriangleIcon,
      title: "Kupon po terminie",
      text: `Był ważny do ${validUntil} (${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "dzień" : "dni"} temu). Sklep może go nie przyjąć.`,
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
    expiring: {
      icon: ClockAlertIcon,
      title: daysLeft === 0 ? "Ostatni dzień ważności" : "Wkrótce wygaśnie",
      text:
        daysLeft === 0
          ? "Kupon jest ważny tylko dzisiaj."
          : `Ważny jeszcze ${daysLeft} ${daysLeft === 1 ? "dzień" : "dni"}, do ${validUntil}.`,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
  }[state];

  return (
    <div className={cn("flex gap-3 rounded-xl border p-3", content.className)}>
      <content.icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{content.title}</p>
        {content.text && <p className="text-sm opacity-80">{content.text}</p>}
      </div>
    </div>
  );
}
