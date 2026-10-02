import { useState } from "react";
import type { DepositListParams } from "@shared/types";

const STORAGE_KEY = "deposit-list-params";

export const DEFAULT_DEPOSIT_LIST_PARAMS: DepositListParams = {
  sort: "expiry",
  order: "asc",
  showUsed: true,
};

const readStored = (): DepositListParams => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_DEPOSIT_LIST_PARAMS, ...JSON.parse(raw) } : DEFAULT_DEPOSIT_LIST_PARAMS;
  } catch {
    return DEFAULT_DEPOSIT_LIST_PARAMS;
  }
};

// Sort/filter choice for the deposit list, remembered per device
export function useDepositListParams() {
  const [params, setParamsState] = useState<DepositListParams>(readStored);

  const setParams = (next: DepositListParams) => {
    setParamsState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private mode etc.) - the choice just won't be remembered
    }
  };

  const isDefault =
    params.sort === DEFAULT_DEPOSIT_LIST_PARAMS.sort &&
    params.order === DEFAULT_DEPOSIT_LIST_PARAMS.order &&
    params.showUsed === DEFAULT_DEPOSIT_LIST_PARAMS.showUsed;

  return { params, setParams, isDefault };
}
