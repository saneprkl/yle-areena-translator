import {
  STORAGE_DEEPL_ENDPOINT,
  STORAGE_DEEPL_KEY,
  STORAGE_GOOGLE_KEY,
} from "../global/constants";

import { normalizeOriginFromEndpoint } from "../services/deepl/client";

export const getSettingsOrThrow = async (): Promise<{
  key: string;
  origin: string;
}> => {
  const stored = await chrome.storage.sync.get([
    STORAGE_DEEPL_KEY,
    STORAGE_DEEPL_ENDPOINT,
  ]);

  const deeplKey =
    typeof stored.deeplKey === "string" ? stored.deeplKey : undefined;

  const deeplEndpoint =
    typeof stored.deeplEndpoint === "string" ? stored.deeplEndpoint : undefined;

  if (!deeplKey) {
    throw new Error("Missing DeepL API key (set it in Options).");
  }

  return {
    key: deeplKey,
    origin: normalizeOriginFromEndpoint(deeplEndpoint),
  };
};

export const getGoogleSettingsOrThrow = async (): Promise<{
  key: string;
}> => {
  const stored = await chrome.storage.sync.get([STORAGE_GOOGLE_KEY]);

  const googleKey =
    typeof stored.googleKey === "string" ? stored.googleKey : undefined;

  if (!googleKey) {
    throw new Error("Missing Google API key (set it in Options).");
  }

  return {
    key: googleKey,
  };
};
