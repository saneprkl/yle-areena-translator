import type {
  TranslateRequestPayload,
  TranslateResponse,
} from "../../../../global/types";
import { createLogger, initLogging } from "../../../../global/logger";
import { googleTranslateHttp } from "./googleClient";
import { getGoogleSettingsOrThrow } from "./googleSettings";
import { ensureGoogleUsageAvailable, recordGoogleUsage } from "./googleUsage";

const log = createLogger("google/messages");
void initLogging();

export const MSG_GOOGLE_TRANSLATE = "GOOGLE_TRANSLATE" as const;

export const isGoogleTranslateMessage = (
  msg: unknown,
): msg is {
  type: typeof MSG_GOOGLE_TRANSLATE;
  payload: TranslateRequestPayload;
} => {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    msg.type === MSG_GOOGLE_TRANSLATE &&
    "payload" in msg
  );
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

export const handleGoogleTranslateRequest = async (
  payload: TranslateRequestPayload,
): Promise<TranslateResponse> => {
  try {
    const { key } = await getGoogleSettingsOrThrow();

    await ensureGoogleUsageAvailable(payload.texts);

    const translations = await googleTranslateHttp(key, payload);

    await recordGoogleUsage(payload.texts);

    return {
      ok: true,
      translations,
    };
  } catch (e: unknown) {
    log.error("GOOGLE_TRANSLATE failed", e);

    return {
      ok: false,
      error: String(e instanceof Error ? e.message : e),
    };
  }
};
