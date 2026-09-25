import {
  MSG_DEEPL_TRANSLATE,
  MSG_DEEPL_USAGE,
  MSG_GOOGLE_TRANSLATE,
} from "../protocol/messages";

import type {
  TranslateRequestPayload,
  TranslateResponse,
  UsageWireResponse,
} from "../global/types";

import { getSettingsOrThrow, getGoogleSettingsOrThrow } from "./settings";

import { deeplTranslateHttp, deeplUsageHttp } from "../services/deepl/client";

import { googleTranslateHttp } from "../services/google/client";

import { createLogger, initLogging } from "../global/logger";

const log = createLogger("background/index");
void initLogging();

const isDeeplTranslateMessage = (
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

const isDeeplUsageMessage = (
  msg: unknown,
): msg is { type: typeof MSG_DEEPL_USAGE } => {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    msg.type === MSG_DEEPL_USAGE
  );
};

const isGoogleTranslateMessage = (
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (isDeeplTranslateMessage(msg)) {
    void (async () => {
      try {
        const { key, origin } = await getSettingsOrThrow();

        const translations = await deeplTranslateHttp(origin, key, msg.payload);

        const out: TranslateResponse = {
          ok: true,
          translations,
        };

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

  if (isDeeplUsageMessage(msg)) {
    void (async () => {
      try {
        const { key, origin } = await getSettingsOrThrow();

        const usage = await deeplUsageHttp(origin, key);

        const out: UsageWireResponse = {
          ok: true,
          usage,
        };

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

  if (isGoogleTranslateMessage(msg)) {
    void (async () => {
      try {
        const { key } = await getGoogleSettingsOrThrow();

        const translations = await googleTranslateHttp(key, msg.payload);

        const out: TranslateResponse = {
          ok: true,
          translations,
        };

        sendResponse(out);
      } catch (e: unknown) {
        log.error("GOOGLE_TRANSLATE failed", e);

        const out: TranslateResponse = {
          ok: false,
          error: String(e instanceof Error ? e.message : e),
        };

        sendResponse(out);
      }
    })();

    return true;
  }
});
