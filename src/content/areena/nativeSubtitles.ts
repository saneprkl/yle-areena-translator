import { createLogger, initLogging } from "../../global/logger";

const log = createLogger("content/areena/nativesubtitles");
void initLogging();

export class NativeSubtitleHider {
  private savedTrackModes: Array<{ track: TextTrack; mode: TextTrackMode }> =
    [];
  private enforceHiddenTimer: number | null = null;
  private hideNativeStyleEl: HTMLStyleElement | null = null;

  hide = (video: HTMLVideoElement): void => {
    const tracks = Array.from(video.textTracks ?? []).map((t, i) => ({
      index: i,
      kind: t.kind,
      label: t.label,
      language: t.language,
      mode: t.mode,
      cues: t.cues?.length ?? 0,
      activeCues: t.activeCues?.length ?? 0,
    }));
    log.info("hide(): current text tracks", tracks);

    this.savedTrackModes = [];
    for (const t of Array.from(video.textTracks ?? [])) {
      if (t.kind === "subtitles" || t.kind === "captions") {
        this.savedTrackModes.push({ track: t, mode: t.mode });
        t.mode = "hidden";
      }
    }

    if (this.enforceHiddenTimer) window.clearInterval(this.enforceHiddenTimer);
    this.enforceHiddenTimer = window.setInterval(() => {
      for (const t of Array.from(video.textTracks ?? [])) {
        if (t.kind === "subtitles" || t.kind === "captions") {
          if (t.mode !== "hidden") {
            log.debug("forcing track to hidden", {
              label: t.label,
              language: t.language,
              fromMode: t.mode,
            });
            t.mode = "hidden";
          }
        }
      }
    }, 500);

    if (!this.hideNativeStyleEl) {
      this.hideNativeStyleEl = document.createElement("style");
      this.hideNativeStyleEl.id = "areena-deepl-hide-native-subs";
      this.hideNativeStyleEl.textContent = `
        html.areena-deepl-hide-native-subs [class*="caption"],
        html.areena-deepl-hide-native-subs [class*="Caption"],
        html.areena-deepl-hide-native-subs [class*="subtitle"],
        html.areena-deepl-hide-native-subs [class*="Subtitle"],
        html.areena-deepl-hide-native-subs [data-testid*="caption"],
        html.areena-deepl-hide-native-subs [data-testid*="subtitle"],
        html.areena-deepl-hide-native-subs [data-test*="caption"],
        html.areena-deepl-hide-native-subs [data-test*="subtitle"] {
          display: none !important;
          visibility: hidden !important;
        }
      `;
      document.documentElement.appendChild(this.hideNativeStyleEl);
    }

    document.documentElement.classList.add("areena-deepl-hide-native-subs");
  };

  restore = (): void => {
    if (this.enforceHiddenTimer) {
      window.clearInterval(this.enforceHiddenTimer);
      this.enforceHiddenTimer = null;
    }

    for (const { track, mode } of this.savedTrackModes) {
      try {
        track.mode = mode;
      } catch (e: unknown) {
        log.warn("Failed to restore native subtitle track mode", e);
      }
    }
    this.savedTrackModes = [];

    document.documentElement.classList.remove("areena-deepl-hide-native-subs");
    this.hideNativeStyleEl?.remove();
    this.hideNativeStyleEl = null;
  };
}
