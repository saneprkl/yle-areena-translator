import type {
  TranslateRequestPayload,
  TranslateResponse,
  UsageResponse,
  UsageWireResponse,
} from "../../../../global/types";
import { createLogger, initLogging } from "../../../../global/logger";
import { deeplTranslateHttp, deeplUsageHttp } from "./deeplClient";
import { getDeeplSettingsOrThrow } from "./deeplSettings";

const log = createLogger("deepl/messages");
void initLogging();

export const MSG_DEEPL_TRANSLATE = "DEEPL_TRANSLATE" as const;
export const MSG_DEEPL_USAGE = "DEEPL_USAGE" as const;

export const isDeeplTranslateMessage = (
  msg: unknown,
): msg is {
  type: typeof MSG_DEEPL_TRANSLATE;
  payload: TranslateRequestPayload;
} => {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    msg.type === MSG_DEEPL_TRANSLATE &&
    "payload" in msg
  );
};

export const isDeeplUsageMessage = (
  msg: unknown,
): msg is {
  type: typeof MSG_DEEPL_USAGE;
} => {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    msg.type === MSG_DEEPL_USAGE
  );
};

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

export const handleDeeplTranslateRequest = async (
  payload: TranslateRequestPayload,
): Promise<TranslateResponse> => {
  try {
    const { key, origin } = await getDeeplSettingsOrThrow();

    const translations = await deeplTranslateHttp(origin, key, payload);

    return {
      ok: true,
      translations,
    };
  } catch (e: unknown) {
    log.error("DEEPL_TRANSLATE failed", e);

    return {
      ok: false,
      error: String(e instanceof Error ? e.message : e),
    };
  }
};

export const handleDeeplUsageRequest = async (): Promise<UsageWireResponse> => {
  try {
    const { key, origin } = await getDeeplSettingsOrThrow();

    const usage = await deeplUsageHttp(origin, key);

    return {
      ok: true,
      usage,
    };
  } catch (e: unknown) {
    log.error("DEEPL_USAGE failed", e);

    return {
      ok: false,
      error: String(e instanceof Error ? e.message : e),
    };
  }
};
