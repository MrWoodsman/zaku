import { useState } from "react";
import { DEFAULT_PINNED_TABS, MAX_PINNED_TABS, NAV_TABS, type NavTabId } from "@/config/navTabs";

const STORAGE_KEY = "pinnedNavTabs";

const isTabId = (value: unknown): value is NavTabId =>
  NAV_TABS.some((tab) => tab.id === value);

const readStored = (): NavTabId[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!Array.isArray(parsed)) return DEFAULT_PINNED_TABS;

    // Unknown ids (a tab that was renamed / removed) are dropped; never more than fits
    const ids = parsed.filter(isTabId).slice(0, MAX_PINNED_TABS);
    return ids.length > 0 ? ids : DEFAULT_PINNED_TABS;
  } catch {
    return DEFAULT_PINNED_TABS;
  }
};

// Which tabs this device keeps on the bottom bar; the rest live under "Więcej".
// Per device, like the other display preferences (there are no accounts).
export function useNavTabs() {
  const [pinned, setPinned] = useState<NavTabId[]>(readStored);

  const toggle = (id: NavTabId) => {
    setPinned((current) => {
      let next: NavTabId[];
      if (current.includes(id)) {
        // The bar keeps at least one tab
        if (current.length === 1) return current;
        next = current.filter((tabId) => tabId !== id);
      } else {
        if (current.length >= MAX_PINNED_TABS) return current;
        next = [...current, id];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Natural order, whatever order they were pinned in
  const pinnedTabs = NAV_TABS.filter((tab) => pinned.includes(tab.id));
  const moreTabs = NAV_TABS.filter((tab) => !pinned.includes(tab.id));

  return { pinnedTabs, moreTabs, toggle, canPinMore: pinned.length < MAX_PINNED_TABS };
}
