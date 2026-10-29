import { useState } from "react";

const STORAGE_KEY = "plannerPersonId";

// Whose plan this device is looking at / adding meals for. Per device (there are no
// accounts), so two phones in one group can each have their own person selected.
// null = everyone.
export function usePlannerPersonId() {
  const [personId, setPersonIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  const setPersonId = (id: string | null) => {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    setPersonIdState(id);
  };

  return { personId, setPersonId };
}
