import { STORAGE_LOG_ENABLED, STORAGE_LOG_LEVEL } from "./constants";

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogSettings {
  enabled: boolean;
  level: LogLevel;
}

export interface Logger {
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
  set(settings: Partial<LogSettings>): Promise<void>;
  get(): LogSettings;
}

const levelRank: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

const DEFAULT_SETTINGS: LogSettings = {
  enabled: true,   
  level: "debug",
};

let cache: LogSettings = { ...DEFAULT_SETTINGS };
let initialized = false;

export async function initLogging(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Try using saved settings
  try {
    const stored = await chrome.storage.local.get([STORAGE_LOG_ENABLED, STORAGE_LOG_LEVEL]);
    cache.enabled =
      typeof stored[STORAGE_LOG_ENABLED] === "boolean" ? stored[STORAGE_LOG_ENABLED] : cache.enabled;

    const lvl = stored[STORAGE_LOG_LEVEL] as LogLevel | undefined;
    if (lvl && lvl in levelRank) cache.level = lvl;
  } catch {
    // ignore — keep defaults
  }

  // Update cache when settings change
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (STORAGE_LOG_ENABLED in changes) {
      const v = changes[STORAGE_LOG_ENABLED]?.newValue;
      if (typeof v === "boolean") cache.enabled = v;
    }
    if (STORAGE_LOG_LEVEL in changes) {
      const v = changes[STORAGE_LOG_LEVEL]?.newValue;
      if (typeof v === "string" && (v as LogLevel) in levelRank) cache.level = v as LogLevel;
    }
  });
}

function shouldLog(level: LogLevel): boolean {
  if (!cache.enabled) return false;
  return levelRank[level] <= levelRank[cache.level];
}

function safeMeta(meta: unknown): unknown {
  // Remove secrets from log
  if (!meta || typeof meta !== "object") return meta;
  try {
    return JSON.parse(
      JSON.stringify(meta, (key, value) => {
        const k = key.toLowerCase();
        if (k.includes("key") || k.includes("token") || k.includes("authorization")) return "[REDACTED]";
        return value;
      })
    );
  } catch {
    return "[Unserializable meta]";
  }
}

function emit(level: LogLevel, scope: string, message: string, meta?: unknown) {
  if (!shouldLog(level)) return;

  const prefix = `[ext:${scope}]`;
  const m = meta !== undefined ? safeMeta(meta) : undefined;

  const fn =
    level === "error" ? console.error :
    level === "warn"  ? console.warn  :
    level === "info"  ? console.info  :
    console.debug;

  m !== undefined ? fn(prefix, message, m) : fn(prefix, message);
}

export function createLogger(scope: string): Logger {
  return {
    error: (msg, meta) => emit("error", scope, msg, meta),
    warn:  (msg, meta) => emit("warn", scope, msg, meta),
    info:  (msg, meta) => emit("info", scope, msg, meta),
    debug: (msg, meta) => emit("debug", scope, msg, meta),

    get: () => ({ ...cache }),

    set: async (settings) => {
      const next: Partial<Record<string, unknown>> = {};
      if (typeof settings.enabled === "boolean") next[STORAGE_LOG_ENABLED] = settings.enabled;
      if (settings.level && settings.level in levelRank) next[STORAGE_LOG_LEVEL] = settings.level;
      await chrome.storage.local.set(next);
      // cache updates via onChanged listener
    },
  };
}