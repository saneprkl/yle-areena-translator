export class NativeSubtitleHider {
  private savedTrackModes: Array<{ track: TextTrack; mode: TextTrackMode }> = [];
  private enforceHiddenTimer: number | null = null;
  private hideNativeStyleEl: HTMLStyleElement | null = null;

  hide(video: HTMLVideoElement) {
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
          if (t.mode !== "hidden") t.mode = "hidden";
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
  }

  restore() {
    if (this.enforceHiddenTimer) {
      window.clearInterval(this.enforceHiddenTimer);
      this.enforceHiddenTimer = null;
    }

    for (const { track, mode } of this.savedTrackModes) {
      try {
        track.mode = mode;
      } catch {}
    }
    this.savedTrackModes = [];

    document.documentElement.classList.remove("areena-deepl-hide-native-subs");
    this.hideNativeStyleEl?.remove();
    this.hideNativeStyleEl = null;
  }
}
