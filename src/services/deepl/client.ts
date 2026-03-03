import { TranslateRequestPayload, UsageResponse } from "../../global/types";
import { createLogger, initLogging } from "../../global/logger";

const log = createLogger("deepl/http");
void initLogging();

function safeSnippet(s: string, max = 400) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

async function readBody(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

export function normalizeOriginFromEndpoint(endpoint?: string) {
  const fallback = "https://api-free.deepl.com";
  if (!endpoint) return fallback;

  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fallback;
  }
}

export async function deeplTranslateHttp(
  origin: string,
  key: string,
  payload: TranslateRequestPayload
): Promise<string[]> {
  const started = Date.now();

  log.debug("POST /v2/translate -> sending", {
    origin,
    targetLang: payload.targetLang,
    sourceLang: payload.sourceLang ?? null,
    textCount: payload.texts.length,
    // optional: sizes only, not content
    textLengths: payload.texts.map((t) => t.length),
  });

  const body = {
    text: payload.texts,
    target_lang: payload.targetLang,
    split_sentences: "nonewlines",
    preserve_formatting: true,
    ...(payload.sourceLang ? { source_lang: payload.sourceLang } : {})
  };

  const resp = await fetch(`${origin}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const ms = Date.now() - started;

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    log.warn("POST /v2/translate -> failed", {
      ms,
      status: resp.status,
      bodySnippet: t.slice(0, 200),
    });
    throw new Error(`DeepL translate HTTP ${resp.status}: ${t.slice(0, 200)}`);
  }

  log.info("POST /v2/translate -> ok", { ms, status: resp.status });

  const json = (await resp.json()) as { translations: { text: string }[] };
  return json.translations.map((t) => t.text);
}

export async function deeplUsageHttp(origin: string, key: string): Promise<UsageResponse> {
  const resp = await fetch(`${origin}/v2/usage`, {
    method: "GET",
    headers: { Authorization: `DeepL-Auth-Key ${key}` }
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`DeepL usage HTTP ${resp.status}: ${t.slice(0, 200)}`);
  }

  return (await resp.json()) as UsageResponse;
}
