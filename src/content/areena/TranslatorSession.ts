import { normalize } from "./utils";
import { getAreenaVideoId } from "./video";
import { loadCache, queueSaveCache } from "./cache";
import { deeplTranslate } from "./deeplBridge";
import { NativeSubtitleHider } from "./nativeSubtitles";
import { getCueText, pickSubtitleTrack } from "./tracks";
import { AreenaUI } from "./ui/AreenaUI";

export class TranslatorSession {
  private running = false;
  private translationDisabled = false;

  private track: TextTrack | null = null;
  private prevOnCueChange: ((this: TextTrack, ev: Event) => any) | null = null;
  private prevTrackMode: TextTrackMode | null = null;

  private cache: Map<string, string> = new Map();
  private videoId = getAreenaVideoId();

  private hider = new NativeSubtitleHider();

  private renderInFlight = false;
  private renderQueued = false;

  // NEW: track watching / attach control
  private tracksList: TextTrackList | null = null;
  private tracksHandler: (() => void) | null = null;
  private tracksPoll: number | null = null;

  private attaching = false;
  private attachQueued = false;

  // NEW: delayed hint so it doesn't flash incorrectly
  private missingHintTimer: number | null = null;
  private showingMissingHint = false;

  constructor(
    private video: HTMLVideoElement,
    private targetLang: string,
    private ui: AreenaUI
  ) {}

  async start() {
    this.running = true;
    this.translationDisabled = false;

    this.hider.hide(this.video);

    // Start watching tracks immediately; attach when available.
    this.installTrackWatchers();
    this.requestAttachTrack();
  }

  stop() {
    this.running = false;

    this.uninstallTrackWatchers();
    this.clearMissingHint();

    this.detachTrack();

    this.ui.hideSubtitle();
    this.hider.restore();
  }

  private installTrackWatchers() {
    if (this.tracksList) return;

    const list = this.video.textTracks;
    this.tracksList = list;

    const handler = () => this.requestAttachTrack();
    this.tracksHandler = handler;

    // Track list events (crucial for “track arrives later”)
    list.addEventListener("addtrack", handler as EventListener);
    list.addEventListener("removetrack", handler as EventListener);
    list.addEventListener("change", handler as EventListener);

    // Helpful during source/episode transitions in players
    this.video.addEventListener("loadedmetadata", handler, { passive: true });
    this.video.addEventListener("loadstart", handler, { passive: true });
    this.video.addEventListener("emptied", handler, { passive: true });

    // Fallback poll (some players are weird about firing addtrack/change)
    this.tracksPoll = window.setInterval(handler, 500);
  }

  private uninstallTrackWatchers() {
    if (!this.tracksList || !this.tracksHandler) return;

    const list = this.tracksList;
    const handler = this.tracksHandler;

    list.removeEventListener("addtrack", handler as EventListener);
    list.removeEventListener("removetrack", handler as EventListener);
    list.removeEventListener("change", handler as EventListener);

    this.video.removeEventListener("loadedmetadata", handler);
    this.video.removeEventListener("loadstart", handler);
    this.video.removeEventListener("emptied", handler);

    if (this.tracksPoll) {
      window.clearInterval(this.tracksPoll);
      this.tracksPoll = null;
    }

    this.tracksList = null;
    this.tracksHandler = null;
  }

  private requestAttachTrack() {
    if (!this.running) return;

    // If our current track vanished (episode switch), detach it.
    if (this.track && this.tracksList && !this.isTrackStillPresent(this.track, this.tracksList)) {
      this.detachTrack();
    }

    const candidate = pickSubtitleTrack(this.video);

    if (!candidate) {
      // Don’t claim “not found” immediately—just wait and re-check.
      this.scheduleMissingHint();
      return;
    }

    this.clearMissingHint();

    if (candidate === this.track) return;
    void this.attachTrack(candidate);
  }

  private isTrackStillPresent(track: TextTrack, list: TextTrackList) {
    for (let i = 0; i < list.length; i++) {
      if (list[i] === track) return true;
    }
    return false;
  }

  private detachTrack() {
    if (this.track) {
      this.track.oncuechange = this.prevOnCueChange;
      if (this.prevTrackMode) this.track.mode = this.prevTrackMode;
    }
    this.track = null;
    this.prevOnCueChange = null;
    this.prevTrackMode = null;
  }

  private async attachTrack(track: TextTrack) {
    if (!this.running) return;

    if (this.attaching) {
      this.attachQueued = true;
      return;
    }
    this.attaching = true;

    try {
      this.detachTrack();

      this.track = track;
      this.prevTrackMode = track.mode;
      track.mode = "hidden";

      // If episode changed, refresh cache key
      const newVideoId = getAreenaVideoId();
      if (newVideoId !== this.videoId) {
        this.videoId = newVideoId;
        this.cache = await loadCache(this.videoId, this.targetLang);
      } else if (!this.cache.size) {
        this.cache = await loadCache(this.videoId, this.targetLang);
      }

      this.prevOnCueChange = track.oncuechange;
      track.oncuechange = () => void this.render();

      await this.render();
    } finally {
      this.attaching = false;
      if (this.attachQueued) {
        this.attachQueued = false;
        this.requestAttachTrack();
      }
    }
  }

  private scheduleMissingHint() {
    if (this.missingHintTimer || this.showingMissingHint) return;

    this.missingHintTimer = window.setTimeout(() => {
      this.missingHintTimer = null;
      if (!this.running || this.track) return;

      this.showingMissingHint = true;
      this.ui.showSubtitle("Waiting for subtitles… (turn subtitles on in the player)");
    }, 1500);
  }

  private clearMissingHint() {
    if (this.missingHintTimer) {
      window.clearTimeout(this.missingHintTimer);
      this.missingHintTimer = null;
    }
    if (this.showingMissingHint) {
      this.showingMissingHint = false;
      this.ui.hideSubtitle();
    }
  }

  private async render() {
    if (!this.running || !this.track) return;

    if (this.renderInFlight) {
      this.renderQueued = true;
      return;
    }
    this.renderInFlight = true;

    try {
      const active = Array.from(this.track.activeCues ?? []);
      if (!active.length) {
        this.ui.hideSubtitle();
        return;
      }

      const originals = active.map(getCueText).map(normalize).filter(Boolean);
      if (!originals.length) {
        this.ui.hideSubtitle();
        return;
      }

      if (this.translationDisabled) {
        this.ui.showSubtitle(originals.join("\n"));
        return;
      }

      const missing = Array.from(new Set(originals.filter((t) => !this.cache.has(t))));

      if (missing.length) {
        try {
          const translated = await deeplTranslate(missing, this.targetLang);
          for (let i = 0; i < missing.length; i++) {
            this.cache.set(missing[i], translated[i] ?? "");
          }
          queueSaveCache(this.videoId, this.targetLang, this.cache);
        } catch {
          this.translationDisabled = true;
          this.ui.showSubtitle(originals.join("\n"));
          return;
        }
      }

      this.ui.showSubtitle(originals.map((t) => this.cache.get(t) || t).join("\n"));
    } finally {
      this.renderInFlight = false;
      if (this.renderQueued) {
        this.renderQueued = false;
        void this.render();
      }
    }
  }
}