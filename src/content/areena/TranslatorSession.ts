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

  private cache: Map<string, string> = new Map();
  private videoId = getAreenaVideoId();

  private hider = new NativeSubtitleHider();

  private renderInFlight = false;
  private renderQueued = false;

  constructor(
    private video: HTMLVideoElement,
    private targetLang: string,
    private ui: AreenaUI
  ) {}

  async start() {
    this.running = true;
    this.translationDisabled = false;

    this.hider.hide(this.video);

    this.track = pickSubtitleTrack(this.video);
    if (!this.track) {
      this.ui.showSubtitle("No subtitle track found. Turn on subtitles in the player.");
      return;
    }

    this.track.mode = "hidden";
    this.cache = await loadCache(this.videoId, this.targetLang);

    this.prevOnCueChange = this.track.oncuechange;
    this.track.oncuechange = () => void this.render();

    await this.render();
  }

  stop() {
    this.running = false;

    if (this.track) this.track.oncuechange = this.prevOnCueChange;
    this.track = null;
    this.prevOnCueChange = null;

    this.ui.hideSubtitle();
    this.hider.restore();
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
