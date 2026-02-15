import { STORAGE_DEEPL_ENDPOINT, STORAGE_DEEPL_KEY } from "../../global/constants";
import type { Settings } from "../../global/types";
import { sendDeeplUsage } from "../../protocol/messages";

const keyEl = document.getElementById("key") as HTMLInputElement;
const endpointEl = document.getElementById("endpoint") as HTMLSelectElement;
const showKeyEl = document.getElementById("showKey") as HTMLInputElement;
const clearKeyBtn = document.getElementById("clearKey") as HTMLButtonElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const saveStatus = document.getElementById("saveStatus") as HTMLDivElement;

const refreshUsageBtn = document.getElementById("refreshUsage") as HTMLButtonElement;
const usageText = document.getElementById("usageText") as HTMLDivElement;

function setSaveStatus(msg: string) {
  saveStatus.textContent = msg;
  setTimeout(() => (saveStatus.textContent = ""), 2500);
}

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

async function load() {
  const { deeplKey, deeplEndpoint } = (await chrome.storage.sync.get([
    STORAGE_DEEPL_KEY,
    STORAGE_DEEPL_ENDPOINT
  ])) as Settings;

  keyEl.value = deeplKey ?? "";
  endpointEl.value = deeplEndpoint ?? "https://api-free.deepl.com";
  keyEl.type = showKeyEl.checked ? "text" : "password";
}

showKeyEl.addEventListener("change", () => {
  keyEl.type = showKeyEl.checked ? "text" : "password";
});

clearKeyBtn.addEventListener("click", async () => {
  keyEl.value = "";
  await chrome.storage.sync.set({ [STORAGE_DEEPL_KEY]: "" });
  setSaveStatus("Key cleared.");
  usageText.textContent = "No key set.";
});

saveBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    [STORAGE_DEEPL_KEY]: keyEl.value.trim(),
    [STORAGE_DEEPL_ENDPOINT]: endpointEl.value
  });
  setSaveStatus("Saved.");
  await refreshUsage();
});

async function refreshUsage() {
  const { deeplKey } = (await chrome.storage.sync.get([STORAGE_DEEPL_KEY])) as Settings;
  if (!deeplKey) {
    usageText.textContent = "No key set.";
    return;
  }

  usageText.textContent = "Loading usage…";

  try {
    const u = await sendDeeplUsage();

    const used =
      typeof (u as any).api_key_character_count === "number"
        ? (u as any).api_key_character_count
        : (u as any).character_count;

    const limit =
      typeof (u as any).api_key_character_limit === "number" && (u as any).api_key_character_limit > 0
        ? (u as any).api_key_character_limit
        : (u as any).character_limit;

    if (typeof used === "number" && typeof limit === "number") {
      usageText.textContent = `Characters used: ${fmt(used)} / ${fmt(limit)} (${Math.round(
        (used / limit) * 100
      )}%)`;
    } else {
      usageText.textContent = "Usage data returned, but fields were unexpected.";
    }
  } catch (e: any) {
    usageText.textContent = `Usage error: ${String(e?.message || e)}`;
  }
}

refreshUsageBtn.addEventListener("click", () => void refreshUsage());

load().then(() => void refreshUsage());
