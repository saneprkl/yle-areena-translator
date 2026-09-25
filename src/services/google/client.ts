import type { TranslateRequestPayload } from "../../global/types";
import { createLogger, initLogging } from "../../global/logger";

const log = createLogger("google/http");
void initLogging();

const GOOGLE_TRANSLATE_ENDPOINT =
  "https://translation.googleapis.com/language/translate/v2";

type GoogleTranslateResponse = {
  data: {
    translations: {
      translatedText: string;
      detectedSourceLanguage?: string;
    }[];
  };
};

export const googleTranslateHttp = async (
  key: string,
  payload: TranslateRequestPayload,
): Promise<string[]> => {
  const started = Date.now();

  log.debug("POST /language/translate/v2 -> sending", {
    targetLang: payload.targetLang,
    sourceLang: payload.sourceLang ?? null,
    textCount: payload.texts.length,
    // optional: sizes only, not content
    textLengths: payload.texts.map((t) => t.length),
  });

  const body = {
    q: payload.texts,
    target: payload.targetLang,
    format: "text",
    ...(payload.sourceLang ? { source: payload.sourceLang } : {}),
  };

  const resp = await fetch(GOOGLE_TRANSLATE_ENDPOINT, {
    method: "POST",
    headers: {
      "X-goog-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const ms = Date.now() - started;

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");

    log.warn("POST /language/translate/v2 -> failed", {
      ms,
      status: resp.status,
      bodySnippet: t.slice(0, 200),
    });

    throw new Error(`Google Translate HTTP ${resp.status}: ${t.slice(0, 200)}`);
  }

  log.info("POST /language/translate/v2 -> ok", {
    ms,
    status: resp.status,
  });

  const json = (await resp.json()) as GoogleTranslateResponse;

  return json.data.translations.map((t) => t.translatedText);
};
