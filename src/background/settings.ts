
import { STORAGE_DEEPL_ENDPOINT, STORAGE_DEEPL_KEY } from "../global/constants";
import type { Settings } from "../global/types";
import { normalizeOriginFromEndpoint } from "../services/deepl/client";

export async function getSettingsOrThrow(): Promise<{ key: string; origin: string }> {
  const { deeplKey, deeplEndpoint } = (await chrome.storage.sync.get([
    STORAGE_DEEPL_KEY,
    STORAGE_DEEPL_ENDPOINT
  ])) as Settings;

  if (!deeplKey) throw new Error("Missing DeepL API key (set it in Options).");

  return {
    key: deeplKey,
    origin: normalizeOriginFromEndpoint(deeplEndpoint)
  };
}
