import { TranslateRequestPayload, TranslateResponse, UsageResponse, UsageWireResponse } from "../global/types";

export const MSG_DEEPL_TRANSLATE = "DEEPL_TRANSLATE" as const;
export const MSG_DEEPL_USAGE = "DEEPL_USAGE" as const;

export async function sendDeeplTranslate(payload: TranslateRequestPayload): Promise<string[]> {
  let resp: TranslateResponse | undefined;

  try {
    resp = (await chrome.runtime.sendMessage({
      type: MSG_DEEPL_TRANSLATE,
      payload
    })) as TranslateResponse | undefined;
  } catch (e: any) {
    throw new Error(`DEEPL_TRANSLATE sendMessage failed: ${String(e?.message || e)}`);
  }

  if (!resp) {
    throw new Error("DEEPL_TRANSLATE: no response from background (handler didn't reply).");
  }

  if (!resp.ok) {
    throw new Error(resp.error || "DeepL translation failed (no error provided).");
  }

  return resp.translations;
}

export async function sendDeeplUsage(): Promise<UsageResponse> {
  let resp: UsageWireResponse | undefined;

  try {
    resp = (await chrome.runtime.sendMessage({
      type: MSG_DEEPL_USAGE
    })) as UsageWireResponse | undefined;
  } catch (e: any) {
    throw new Error(`DEEPL_USAGE sendMessage failed: ${String(e?.message || e)}`);
  }

  if (!resp) {
    throw new Error("DEEPL_USAGE: no response from background (handler didn't reply).");
  }

  if (!resp.ok) {
    throw new Error(resp.error || "DeepL usage failed (no error provided).");
  }

  return resp.usage;
}