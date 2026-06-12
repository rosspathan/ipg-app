import { useCallback, useState } from "react";

const STORAGE_KEY = "ipg_scratch_popup_seen_v1";

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore quota / privacy mode errors
  }
}

/**
 * UI-only repeat control for the scratch card popup. Tracks which card ids the
 * user has already been shown a popup for, so the popup never re-opens for the
 * same card on every page load. No backend changes required.
 */
export function useScratchPopupSeen() {
  const [seen, setSeen] = useState<Set<string>>(() => readSeen());

  const isSeen = useCallback((id: string) => seen.has(id), [seen]);

  const markSeen = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setSeen((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (changed) writeSeen(next);
      return changed ? next : prev;
    });
  }, []);

  return { isSeen, markSeen };
}
