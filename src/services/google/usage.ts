import {
  GOOGLE_MONTHLY_APP_LIMIT,
  STORAGE_GOOGLE_USAGE,
} from "../../global/constants";
import type { GoogleUsage } from "../../global/types";

const getCurrentMonth = (): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Failed to determine current Google usage month.");
  }

  return `${year}-${month}`;
};

const countCharacters = (texts: string[]): number => {
  return texts.reduce((total, text) => {
    return total + Array.from(text).length;
  }, 0);
};

export const getGoogleUsage = async (): Promise<GoogleUsage> => {
  const currentMonth = getCurrentMonth();

  const stored = await chrome.storage.local.get([STORAGE_GOOGLE_USAGE]);

  const usage = stored[STORAGE_GOOGLE_USAGE] as GoogleUsage | undefined;

  if (
    !usage ||
    usage.month !== currentMonth ||
    typeof usage.characterCount !== "number"
  ) {
    return {
      month: currentMonth,
      characterCount: 0,
    };
  }

  return usage;
};

export const ensureGoogleUsageAvailable = async (
  texts: string[],
): Promise<void> => {
  const usage = await getGoogleUsage();
  const requestedCharacters = countCharacters(texts);

  if (usage.characterCount + requestedCharacters > GOOGLE_MONTHLY_APP_LIMIT) {
    throw new Error(
      `Google monthly translation limit reached (${usage.characterCount}/${GOOGLE_MONTHLY_APP_LIMIT} characters used).`,
    );
  }
};

export const recordGoogleUsage = async (texts: string[]): Promise<void> => {
  const usage = await getGoogleUsage();
  const translatedCharacters = countCharacters(texts);

  const updated: GoogleUsage = {
    month: usage.month,
    characterCount: usage.characterCount + translatedCharacters,
  };

  await chrome.storage.local.set({
    [STORAGE_GOOGLE_USAGE]: updated,
  });
};
