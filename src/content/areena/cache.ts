import { CACHE_PREFIX, CACHE_VERSION } from "../../global/constants";


type CacheRecord = {
  v: number;
  updatedAt: number;
  map: Record<string, string>;
};

function cacheKey(videoId: string, targetLang: string) {
  return `${CACHE_PREFIX}:v${CACHE_VERSION}:${videoId}:${targetLang}`;
}

export async function loadCache(videoId: string, targetLang: string): Promise<Map<string, string>> {
  const key = cacheKey(videoId, targetLang);
  const obj = await chrome.storage.local.get([key]);
  const rec = obj[key] as CacheRecord | undefined;

  const m = new Map<string, string>();
  if (rec?.map) for (const [k, v] of Object.entries(rec.map)) m.set(k, v);
  return m;
}

let saveTimer: number | null = null;

export function queueSaveCache(videoId: string, targetLang: string, cache: Map<string, string>) {
  if (saveTimer) window.clearTimeout(saveTimer);

  saveTimer = window.setTimeout(async () => {
    const key = cacheKey(videoId, targetLang);

    const MAX_ENTRIES = 1200;
    const entries = Array.from(cache.entries());
    const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
    const capped = new Map(trimmed);

    const rec: CacheRecord = {
      v: CACHE_VERSION,
      updatedAt: Date.now(),
      map: Object.fromEntries(capped.entries())
    };

    await chrome.storage.local.set({ [key]: rec });
  }, 600);
}
