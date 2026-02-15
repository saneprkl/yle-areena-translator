import { MSG_DEEPL_TRANSLATE, MSG_DEEPL_USAGE } from "../protocol/messages";
import type { TranslateRequestPayload, TranslateResponse, UsageWireResponse } from "../global/types";
import { getSettingsOrThrow } from "./settings";
import { deeplTranslateHttp, deeplUsageHttp } from "../services/deepl/client";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === MSG_DEEPL_TRANSLATE) {
    (async () => {
      try {
        const { key, origin } = await getSettingsOrThrow();
        const translations = await deeplTranslateHttp(origin, key, msg.payload as TranslateRequestPayload);
        const out: TranslateResponse = { ok: true, translations };
        sendResponse(out);
      } catch (e: any) {
        const out: TranslateResponse = { ok: false, error: String(e?.message || e) };
        sendResponse(out);
      }
    })();

    return true;
  }

  if (msg?.type === MSG_DEEPL_USAGE) {
    (async () => {
      try {
        const { key, origin } = await getSettingsOrThrow();
        const usage = await deeplUsageHttp(origin, key);
        const out: UsageWireResponse = { ok: true, usage };
        sendResponse(out);
      } catch (e: any) {
        const out: UsageWireResponse = { ok: false, error: String(e?.message || e) };
        sendResponse(out);
      }
    })();

    return true;
  }
});
