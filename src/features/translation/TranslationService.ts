import type { TranslationProvider } from "../../global/types";
import { createLogger, initLogging } from "../../global/logger";
import type { Translator } from "./Translator";
import { getTranslator } from "./translators";

type TranslationCache = Map<string, string>;

type LoadTranslationCache = (
  videoId: string,
  targetLang: string,
  provider: TranslationProvider,
) => Promise<TranslationCache>;

type QueueSaveTranslationCache = (
  videoId: string,
  targetLang: string,
  cache: TranslationCache,
  provider: TranslationProvider,
) => void;

const log = createLogger("translation/TranslationService");
void initLogging();

export class TranslationService {
  private readonly translator: Translator;

  private cache: TranslationCache = new Map();

  constructor(
    private readonly targetLang: string,
    private readonly provider: TranslationProvider,
    private videoId: string,
    private readonly loadCache: LoadTranslationCache,
    private readonly queueSaveCache: QueueSaveTranslationCache,
  ) {
    this.translator = getTranslator(provider);
  }

  loadForVideo = async (videoId: string): Promise<void> => {
    const videoChanged = videoId !== this.videoId;

    if (videoChanged) {
      this.videoId = videoId;

      this.cache = await this.loadCache(
        this.videoId,
        this.targetLang,
        this.provider,
      );

      return;
    }

    if (!this.cache.size) {
      this.cache = await this.loadCache(
        this.videoId,
        this.targetLang,
        this.provider,
      );
    }
  };

  translate = async (texts: string[]): Promise<string[]> => {
    const missing = Array.from(
      new Set(texts.filter((text) => !this.cache.has(text))),
    );

    log.info("cache status", {
      textsCount: texts.length,
      missingCount: missing.length,
      missing,
    });

    if (missing.length) {
      log.info("calling translation provider", {
        provider: this.provider,
        targetLang: this.targetLang,
        missing,
      });

      const translated = await this.translator.translate(
        missing,
        this.targetLang,
      );

      log.info("translation provider returned", {
        provider: this.provider,
        translated,
      });

      for (let i = 0; i < missing.length; i++) {
        this.cache.set(missing[i], translated[i] ?? "");
      }

      this.queueSaveCache(
        this.videoId,
        this.targetLang,
        this.cache,
        this.provider,
      );
    }

    return texts.map((text) => this.cache.get(text) || text);
  };
}
