import { TranslateRequestPayload, UsageResponse } from "../../global/types";


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

export async function deeplTranslateHttp(origin: string, key: string, payload: TranslateRequestPayload) {
  const body: any = {
    text: payload.texts,
    target_lang: payload.targetLang,
    split_sentences: "nonewlines",
    preserve_formatting: true
  };
  if (payload.sourceLang) body.source_lang = payload.sourceLang;

  const resp = await fetch(`${origin}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`DeepL translate HTTP ${resp.status}: ${t.slice(0, 200)}`);
  }

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
