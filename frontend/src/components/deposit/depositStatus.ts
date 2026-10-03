import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import type { Deposit } from "@shared/types";

// Below this many days left a voucher is highlighted as "expiring soon"
export const EXPIRING_SOON_DAYS = 7;

export type DepositState = "active" | "expiring" | "expired" | "used";

// SQLite datetime ("2026-09-28 10:00:00") -> Date. The "T" keeps it parseable on iOS Safari.
export const parseDbDate = (value: string) => parseISO(value.replace(" ", "T"));

export const getDaysLeft = (deposit: Deposit) =>
  deposit.expiring_date
    ? differenceInCalendarDays(parseISO(deposit.expiring_date), new Date())
    : null;

export const getDepositState = (deposit: Deposit): DepositState => {
  if (deposit.used_at) return "used";
  const daysLeft = getDaysLeft(deposit);
  if (daysLeft === null) return "active";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring";
  return "active";
};

const currencyFormatter = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

// 0.5 -> "0,50 zł"
export const formatDepositValue = (value: number) => currencyFormatter.format(value);

// Short, human text for the card's second line
export const getExpiryLabel = (deposit: Deposit) => {
  if (deposit.used_at) {
    return `wykorzystany ${format(parseDbDate(deposit.used_at), "d MMM", { locale: pl })}`;
  }

  const daysLeft = getDaysLeft(deposit);
  if (daysLeft === null || !deposit.expiring_date) return "bez daty ważności";

  // "wygasł 21 wrz" read like "valid until 21 Sep" - say clearly it's past the date
  if (daysLeft < 0) return `po terminie · ważny był do ${format(parseISO(deposit.expiring_date), "d MMM", { locale: pl })}`;
  if (daysLeft === 0) return "wygasa dzisiaj";
  if (daysLeft === 1) return "wygasa jutro";
  if (daysLeft <= EXPIRING_SOON_DAYS) return `wygasa za ${daysLeft} dni`;

  return `do ${format(parseISO(deposit.expiring_date), "d MMM", { locale: pl })} · za ${daysLeft} dni`;
};

// Amount typed with the decimal keypad: keep digits and a single separator,
// so "0,50" / "0.50" both work and nothing else can be typed in
export const sanitizeAmountInput = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, "");
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex === -1) return cleaned;
  return (
    cleaned.slice(0, separatorIndex + 1) + cleaned.slice(separatorIndex + 1).replace(/[.,]/g, "")
  );
};

// "0,50" -> 0.5 (Polish keyboards type a comma); empty / invalid -> NaN
export const parseAmount = (value: string | number) => Number(String(value).replace(",", "."));

// Pre-filled "valid for" days when adding a voucher - change it here if most vouchers
// use a different period
export const DEFAULT_VALID_DAYS = 30;

// Expiry = received date + valid days, or undefined while the input is incomplete
export const computeExpiryDate = (receivedDate: Date | undefined, validDays: number | string) =>
  receivedDate && Number.isInteger(Number(validDays)) && Number(validDays) > 0
    ? addDays(receivedDate, Number(validDays))
    : undefined;
