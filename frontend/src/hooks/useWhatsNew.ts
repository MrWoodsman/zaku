import { useState } from "react";
import { CHANGELOG, LATEST_VERSION, type Release } from "@/config/changelog";

const STORAGE_KEY = "last-seen-version";
// After a long break don't dump the whole history - just the newest few
const MAX_RELEASES = 3;

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked - the popup may show again next time, nothing worse
  }
};

// Releases this device hasn't seen yet, newest first
const getUnseenReleases = (): Release[] => {
  const lastSeen = readStorage(STORAGE_KEY);
  if (lastSeen === LATEST_VERSION) return [];

  if (!lastSeen) {
    // Older app versions didn't save this, so we can't tell what was already seen.
    // Someone past onboarding is an existing user updating -> show as much as we
    // allow (the latest MAX_RELEASES). A brand new user shouldn't get a "what's new"
    // right after onboarding -> just remember the current version.
    if (readStorage("has-seen-onboarding")) return CHANGELOG.slice(0, MAX_RELEASES);
    writeStorage(STORAGE_KEY, LATEST_VERSION);
    return [];
  }

  const lastSeenIndex = CHANGELOG.findIndex((release) => release.version === lastSeen);
  // Unknown version (e.g. a removed beta) -> just the newest release
  if (lastSeenIndex === -1) return CHANGELOG.slice(0, 1);
  return CHANGELOG.slice(0, Math.min(lastSeenIndex, MAX_RELEASES));
};

// "What's new" after an app update: which releases to show + marking them as seen
export function useWhatsNew() {
  const [releases, setReleases] = useState<Release[]>(getUnseenReleases);

  const markSeen = () => {
    writeStorage(STORAGE_KEY, LATEST_VERSION);
    setReleases([]);
  };

  return { releases, markSeen };
}
