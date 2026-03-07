import { MSG_DEEPL_TRANSLATE, MSG_DEEPL_USAGE } from "../protocol/messages";
import type {
  TranslateRequestPayload,
  TranslateResponse,
  UsageWireResponse,
} from "../global/types";
import { getSettingsOrThrow } from "./settings";
import { deeplTranslateHttp, deeplUsageHttp } from "../services/deepl/client";
import { createLogger, initLogging } from "../global/logger";

const log = createLogger("background/index");
void initLogging();

const isTranslateMessage = (
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

const isUsageMessage = (
  msg: unknown,
): msg is { type: typeof MSG_DEEPL_USAGE } => {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    msg.type === MSG_DEEPL_USAGE
  );
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (isTranslateMessage(msg)) {
    void (async () => {
      try {
        const { key, origin } = await getSettingsOrThrow();
        const translations = await deeplTranslateHttp(origin, key, msg.payload);
        const out: TranslateResponse = { ok: true, translations };
        sendResponse(out);
      } catch (e: unknown) {
        log.error("DEEPL_TRANSLATE failed", e);
        const out: TranslateResponse = {
          ok: false,
          error: String(e instanceof Error ? e.message : e),
        };
        sendResponse(out);
      }
    })();

    return true;
  }

  if (isUsageMessage(msg)) {
    void (async () => {
      try {
        const { key, origin } = await getSettingsOrThrow();
        const usage = await deeplUsageHttp(origin, key);
        const out: UsageWireResponse = { ok: true, usage };
        sendResponse(out);
      } catch (e: unknown) {
        log.error("DEEPL_USAGE failed", e);
        const out: UsageWireResponse = {
          ok: false,
          error: String(e instanceof Error ? e.message : e),
        };
        sendResponse(out);
      }
    })();

    return true;
  }
});
