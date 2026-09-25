import {
  STORAGE_DEEPL_ENDPOINT,
  STORAGE_DEEPL_KEY,
  STORAGE_GOOGLE_KEY,
} from "../../global/constants";
import { sendDeeplUsage } from "../../protocol/messages";

const deeplKeyEl = document.getElementById("deeplKey") as HTMLInputElement;
const endpointEl = document.getElementById("endpoint") as HTMLSelectElement;
const showDeeplKeyEl = document.getElementById(
  "showDeeplKey",
) as HTMLInputElement;
const clearDeeplKeyBtn = document.getElementById(
  "clearDeeplKey",
) as HTMLButtonElement;

const googleKeyEl = document.getElementById("googleKey") as HTMLInputElement;
const showGoogleKeyEl = document.getElementById(
  "showGoogleKey",
) as HTMLInputElement;
const clearGoogleKeyBtn = document.getElementById(
  "clearGoogleKey",
) as HTMLButtonElement;

const saveBtn = document.getElementById("save") as HTMLButtonElement;
const saveStatus = document.getElementById("saveStatus") as HTMLDivElement;

const refreshUsageBtn = document.getElementById(
  "refreshUsage",
) as HTMLButtonElement;
const usageText = document.getElementById("usageText") as HTMLDivElement;

const setSaveStatus = (msg: string): void => {
  saveStatus.textContent = msg;

  setTimeout(() => {
    saveStatus.textContent = "";
  }, 2500);
};

const fmt = (n: number): string => {
  return new Intl.NumberFormat().format(n);
};

const load = async (): Promise<void> => {
  const stored = await chrome.storage.sync.get([
    STORAGE_DEEPL_KEY,
    STORAGE_DEEPL_ENDPOINT,
    STORAGE_GOOGLE_KEY,
  ]);

  deeplKeyEl.value = typeof stored.deeplKey === "string" ? stored.deeplKey : "";

  endpointEl.value =
    typeof stored.deeplEndpoint === "string"
      ? stored.deeplEndpoint
      : "https://api-free.deepl.com";

  googleKeyEl.value =
    typeof stored.googleKey === "string" ? stored.googleKey : "";

  deeplKeyEl.type = showDeeplKeyEl.checked ? "text" : "password";
  googleKeyEl.type = showGoogleKeyEl.checked ? "text" : "password";
};

showDeeplKeyEl.addEventListener("change", () => {
  deeplKeyEl.type = showDeeplKeyEl.checked ? "text" : "password";
});

showGoogleKeyEl.addEventListener("change", () => {
  googleKeyEl.type = showGoogleKeyEl.checked ? "text" : "password";
});

clearDeeplKeyBtn.addEventListener("click", () => {
  void (async () => {
    deeplKeyEl.value = "";

    await chrome.storage.sync.set({
      [STORAGE_DEEPL_KEY]: "",
    });

    setSaveStatus("DeepL key cleared.");
    usageText.textContent = "No DeepL key set.";
  })();
});

clearGoogleKeyBtn.addEventListener("click", () => {
  void (async () => {
    googleKeyEl.value = "";

    await chrome.storage.sync.set({
      [STORAGE_GOOGLE_KEY]: "",
    });

    setSaveStatus("Google key cleared.");
  })();
});

saveBtn.addEventListener("click", () => {
  void (async () => {
    await chrome.storage.sync.set({
      [STORAGE_DEEPL_KEY]: deeplKeyEl.value.trim(),
      [STORAGE_DEEPL_ENDPOINT]: endpointEl.value,
      [STORAGE_GOOGLE_KEY]: googleKeyEl.value.trim(),
    });

    setSaveStatus("Saved.");
    await refreshUsage();
  })();
});

const refreshUsage = async (): Promise<void> => {
  const stored = await chrome.storage.sync.get([STORAGE_DEEPL_KEY]);

  if (!stored.deeplKey) {
    usageText.textContent = "No DeepL key set.";
    return;
  }

  usageText.textContent = "Loading usage…";

  try {
    const u = await sendDeeplUsage();

    const used =
      typeof u.api_key_character_count === "number"
        ? u.api_key_character_count
        : u.character_count;

    const limit =
      typeof u.api_key_character_limit === "number" &&
      u.api_key_character_limit > 0
        ? u.api_key_character_limit
        : u.character_limit;

    if (typeof used === "number" && typeof limit === "number") {
      usageText.textContent = `Characters used: ${fmt(used)} / ${fmt(limit)} (${Math.round(
        (used / limit) * 100,
      )}%)`;
    } else {
      usageText.textContent =
        "Usage data returned, but fields were unexpected.";
    }
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);

    usageText.textContent = `Usage error: ${message}`;
  }
};

refreshUsageBtn.addEventListener("click", () => void refreshUsage());

void load().then(() => refreshUsage());
