import { STORAGE_STATE_KEY } from "../../global/constants";
import type { ToggleState } from "../../global/types";

const DEFAULT_STATE: ToggleState = { enabled: false, targetLang: "EN" };

export const loadState = async (): Promise<ToggleState> => {
  const stored = await chrome.storage.sync.get([STORAGE_STATE_KEY]);
  const v = stored[STORAGE_STATE_KEY] as Partial<ToggleState> | undefined;

  if (!v || typeof v.enabled !== "boolean" || typeof v.targetLang !== "string")
    return DEFAULT_STATE;
  return { enabled: v.enabled, targetLang: v.targetLang };
};

export const saveState = async (state: ToggleState): Promise<void> => {
  await chrome.storage.sync.set({ [STORAGE_STATE_KEY]: state });
};
