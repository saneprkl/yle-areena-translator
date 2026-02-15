import { TranslateRequestPayload, TranslateResponse, UsageResponse, UsageWireResponse } from "../global/types";

export const MSG_DEEPL_TRANSLATE = "DEEPL_TRANSLATE" as const;
export const MSG_DEEPL_USAGE = "DEEPL_USAGE" as const;

export async function sendDeeplTranslate(payload: TranslateRequestPayload): Promise<string[]> {
  const resp = (await chrome.runtime.sendMessage({
    type: MSG_DEEPL_TRANSLATE,
    payload
  })) as TranslateResponse;

  if (!resp?.ok) throw new Error(resp?.error || "DeepL translation failed");
  return resp.translations;
}

export async function sendDeeplUsage(): Promise<UsageResponse> {
  const resp = (await chrome.runtime.sendMessage({
    type: MSG_DEEPL_USAGE
  })) as UsageWireResponse;

  if (!resp?.ok) throw new Error(resp?.error || "DeepL usage failed");
  return resp.usage;
}
