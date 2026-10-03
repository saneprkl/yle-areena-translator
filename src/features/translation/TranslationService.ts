import type { TranslationProvider } from "../../global/types";
import { createLogger, initLogging } from "../../global/logger";
import type { Translator } from "./Translator";
import { TranslationCache } from "./TranslationCache";
import { getTranslator } from "./translators";

const log = createLogger("translation/TranslationService");
void initLogging();

export class TranslationService {
  private readonly translator: Translator;
  private readonly cache: TranslationCache;

  constructor(
    private readonly targetLang: string,
    private readonly provider: TranslationProvider,
    videoId: string,
  ) {
    this.translator = getTranslator(provider);

    this.cache = new TranslationCache(targetLang, provider, videoId);
  }

  loadForVideo = async (videoId: string): Promise<void> => {
    await this.cache.loadForVideo(videoId);
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

      this.cache.setTranslations(missing, translated);
    }

    return this.cache.resolve(texts);
  };
}
