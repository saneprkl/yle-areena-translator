import { MSG_DEEPL_TRANSLATE, MSG_DEEPL_USAGE } from "../protocol/messages";
import type { TranslateRequestPayload, TranslateResponse, UsageWireResponse } from "../global/types";
import { getSettingsOrThrow } from "./settings";
import { deeplTranslateHttp, deeplUsageHttp } from "../services/deepl/client";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === MSG_DEEPL_TRANSLATE) {
    return (async (): Promise<TranslateResponse> => {
      try {
        const { key, origin } = await getSettingsOrThrow();
        const translations = await deeplTranslateHttp(origin, key, msg.payload as TranslateRequestPayload);
        return { ok: true, translations };
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) };
      }
    })();
  }

  if (msg?.type === MSG_DEEPL_USAGE) {
    return (async (): Promise<UsageWireResponse> => {
      try {
        const { key, origin } = await getSettingsOrThrow();
        const usage = await deeplUsageHttp(origin, key);
        return { ok: true, usage };
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) };
      }
    })();
  }
});
