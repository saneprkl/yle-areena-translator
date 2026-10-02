import { STORAGE_GOOGLE_KEY } from "../../../../global/constants";

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
