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

// "Main" release = x.y.0 (also a x.y.0-beta.N); everything else is a patch on top of it
const isMainRelease = (release: Release) => /^\d+\.\d+\.0(-|$)/.test(release.version);

// From the unseen releases (newest first) pick the newest main release together with all
// patches released after it, so skipping 0.59.0 still shows its features, not only the
// 0.59.x fixes. Without a missed main release fall back to the latest MAX_RELEASES.
const pickReleases = (unseen: Release[]): Release[] => {
  const mainIndex = unseen.findIndex(isMainRelease);
  const count = Math.max(MAX_RELEASES, mainIndex + 1);
  return unseen.slice(0, count);
};

// Releases this device hasn't seen yet, newest first
const getUnseenReleases = (): Release[] => {
  const lastSeen = readStorage(STORAGE_KEY);
  if (lastSeen === LATEST_VERSION) return [];

  if (!lastSeen) {
    // Older app versions didn't save this, so we can't tell what was already seen.
    // Someone past onboarding is an existing user updating -> show as much as we
    // allow (see pickReleases). A brand new user shouldn't get a "what's new"
    // right after onboarding -> just remember the current version.
    if (readStorage("has-seen-onboarding")) return pickReleases(CHANGELOG);
    writeStorage(STORAGE_KEY, LATEST_VERSION);
    return [];
  }

  const lastSeenIndex = CHANGELOG.findIndex((release) => release.version === lastSeen);
  // Unknown version (e.g. a removed beta) -> can't tell what was seen, same as no saved version
  if (lastSeenIndex === -1) return pickReleases(CHANGELOG);
  return pickReleases(CHANGELOG.slice(0, lastSeenIndex));
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
