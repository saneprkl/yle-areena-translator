import { CACHE_PREFIX, CACHE_VERSION } from "../../global/constants";
import type { TranslationProvider } from "../../global/types";

type CacheRecord = {
  v: number;
  updatedAt: number;
  map: Record<string, string>;
};

const MAX_ENTRIES = 1200;
const SAVE_DELAY_MS = 600;

const cacheKey = (
  videoId: string,
  targetLang: string,
  provider: TranslationProvider,
): string => {
  return `${CACHE_PREFIX}:v${CACHE_VERSION}:${provider}:${videoId}:${targetLang}`;
};

export class TranslationCache {
  private cache = new Map<string, string>();
  private saveTimer: number | null = null;

  constructor(
    private readonly targetLang: string,
    private readonly provider: TranslationProvider,
    private videoId: string,
  ) {}

  loadForVideo = async (videoId: string): Promise<void> => {
    const videoChanged = videoId !== this.videoId;

    if (videoChanged) {
      this.videoId = videoId;
      this.cache = await this.load();
      return;
    }

    if (!this.cache.size) {
      this.cache = await this.load();
    }
  };

  has = (text: string): boolean => {
    return this.cache.has(text);
  };

  setTranslations = (
    sourceTexts: string[],
    translatedTexts: string[],
  ): void => {
    for (let i = 0; i < sourceTexts.length; i++) {
      this.cache.set(sourceTexts[i], translatedTexts[i] ?? "");
    }

    this.queueSave();
  };

  resolve = (texts: string[]): string[] => {
    return texts.map((text) => this.cache.get(text) || text);
  };

  private load = async (): Promise<Map<string, string>> => {
    const key = cacheKey(this.videoId, this.targetLang, this.provider);

    const obj = await chrome.storage.local.get([key]);
    const record = obj[key] as CacheRecord | undefined;

    const cache = new Map<string, string>();

    if (record?.map) {
      for (const [source, translation] of Object.entries(record.map)) {
        cache.set(source, translation);
      }
    }

    return cache;
  };

  private queueSave = (): void => {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
    }

    const videoId = this.videoId;
    const cache = this.cache;

    this.saveTimer = window.setTimeout(() => {
      void (async () => {
        const key = cacheKey(videoId, this.targetLang, this.provider);

        const entries = Array.from(cache.entries());

        const trimmed =
          entries.length > MAX_ENTRIES
            ? entries.slice(entries.length - MAX_ENTRIES)
            : entries;

        const capped = new Map(trimmed);

        const record: CacheRecord = {
          v: CACHE_VERSION,
          updatedAt: Date.now(),
          map: Object.fromEntries(capped.entries()),
        };

        await chrome.storage.local.set({
          [key]: record,
        });
      })();
    }, SAVE_DELAY_MS);
  };
}
