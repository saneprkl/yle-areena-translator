import type {
  TranslateRequestPayload,
  TranslateResponse,
  UsageResponse,
  UsageWireResponse,
} from "../global/types";

export const MSG_DEEPL_TRANSLATE = "DEEPL_TRANSLATE" as const;
export const MSG_DEEPL_USAGE = "DEEPL_USAGE" as const;

export const MSG_GOOGLE_TRANSLATE = "GOOGLE_TRANSLATE" as const;

export const sendDeeplTranslate = async (
  payload: TranslateRequestPayload,
): Promise<string[]> => {
  let resp: TranslateResponse | undefined;

  try {
    resp = await chrome.runtime.sendMessage({
      type: MSG_DEEPL_TRANSLATE,
      payload,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
    throw new Error(`DEEPL_TRANSLATE sendMessage failed: ${message}`, {
      cause: e,
    });
  }

  if (!resp) {
    throw new Error(
      "DEEPL_TRANSLATE: no response from background (handler didn't reply).",
    );
  }

  if (!resp.ok) {
    throw new Error(
      resp.error || "DeepL translation failed (no error provided).",
    );
  }

  return resp.translations;
};

export const sendDeeplUsage = async (): Promise<UsageResponse> => {
  let resp: UsageWireResponse | undefined;

  try {
    resp = await chrome.runtime.sendMessage({
      type: MSG_DEEPL_USAGE,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
    throw new Error(`DEEPL_USAGE sendMessage failed: ${message}`, {
      cause: e,
    });
  }

  if (!resp) {
    throw new Error(
      "DEEPL_USAGE: no response from background (handler didn't reply).",
    );
  }

  if (!resp.ok) {
    throw new Error(resp.error || "DeepL usage failed (no error provided).");
  }

  return resp.usage;
};

export const sendGoogleTranslate = async (
  payload: TranslateRequestPayload,
): Promise<string[]> => {
  let resp: TranslateResponse | undefined;

  try {
    resp = await chrome.runtime.sendMessage({
      type: MSG_GOOGLE_TRANSLATE,
      payload,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);

    throw new Error(`GOOGLE_TRANSLATE sendMessage failed: ${message}`, {
      cause: e,
    });
  }

  if (!resp) {
    throw new Error(
      "GOOGLE_TRANSLATE: no response from background (handler didn't reply).",
    );
  }

  if (!resp.ok) {
    throw new Error(
      resp.error || "Google translation failed (no error provided).",
    );
  }

  return resp.translations;
};
