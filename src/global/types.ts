export type TranslationProvider = "deepl" | "google";

export type Settings = {
  deeplKey?: string;
  deeplEndpoint?: string; // "https://api-free.deepl.com" or "https://api.deepl.com"
  googleKey?: string;
};

export type ToggleState = {
  enabled: boolean;
  targetLang: string;
  provider: TranslationProvider;
};

export type TranslateRequestPayload = {
  texts: string[];
  targetLang: string;
  sourceLang?: string;
};

export type TranslateResponse =
  | { ok: true; translations: string[] }
  | { ok: false; error: string };

export type UsageResponse = {
  character_count?: number;
  character_limit?: number;
  api_key_character_count?: number;
  api_key_character_limit?: number;
  start_time?: string;
  end_time?: string;
  products?: unknown[];
};

export type UsageWireResponse =
  | { ok: true; usage: UsageResponse }
  | { ok: false; error: string };

export type GoogleUsage = {
  month: string;
  characterCount: number;
};
