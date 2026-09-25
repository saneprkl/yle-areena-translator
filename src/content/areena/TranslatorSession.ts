import { normalize } from "./utils";
import { getAreenaVideoId } from "./video";
import { loadCache, queueSaveCache } from "./cache";
import { deeplTranslate } from "./deeplBridge";
import { googleTranslate } from "./googleBridge";
import type { TranslationProvider } from "../../global/types";
import { NativeSubtitleHider } from "./nativeSubtitles";
import { getCueText, pickSubtitleTrack } from "./tracks";
import type { AreenaUI } from "./ui/AreenaUI";
import { createLogger, initLogging } from "../../global/logger";

const log = createLogger("areena/TranslatorSession");
void initLogging();

export class TranslatorSession {
  private running = false;
  private translationDisabled = false;

  private track: TextTrack | null = null;
  private prevOnCueChange: ((this: TextTrack, ev: Event) => void) | null = null;
  private prevTrackMode: TextTrackMode | null = null;

  private cache: Map<string, string> = new Map();
  private videoId = getAreenaVideoId();

  private hider = new NativeSubtitleHider();

  private renderInFlight = false;
  private renderQueued = false;

  private tracksList: TextTrackList | null = null;
  private tracksHandler: (() => void) | null = null;
  private tracksPoll: number | null = null;

  private attaching = false;
  private attachQueued = false;

  private missingHintTimer: number | null = null;
  private showingMissingHint = false;

  constructor(
    private video: HTMLVideoElement,
    private targetLang: string,
    private provider: TranslationProvider,
    private ui: AreenaUI,
  ) {}

  start = async (): Promise<void> => {
    this.running = true;
    this.translationDisabled = false;

    log.info("start()", {
      videoId: this.videoId,
      targetLang: this.targetLang,
      provider: this.provider,
      textTrackCount: this.video.textTracks.length,
      currentSrc: this.video.currentSrc || null,
    });

    this.logTracks("start");

    this.hider.hide(this.video);

    this.installTrackWatchers();
    this.requestAttachTrack();

    await Promise.resolve();
  };

  stop = (): void => {
    log.info("stop()", {
      videoId: this.videoId,
      targetLang: this.targetLang,
      provider: this.provider,
    });

    this.running = false;

    this.uninstallTrackWatchers();
    this.clearMissingHint();

    this.detachTrack();

    this.ui.hideSubtitle();
    this.hider.restore();
  };

  private logTracks = (where: string): void => {
    const tracks = Array.from(this.video.textTracks ?? []).map((t, i) => ({
      index: i,
      kind: t.kind,
      label: t.label,
      language: t.language,
      mode: t.mode,
      cues: t.cues?.length ?? 0,
      activeCues: t.activeCues?.length ?? 0,
    }));

    log.info(`tracks @ ${where}`, tracks);
  };

  private translate = async (texts: string[]): Promise<string[]> => {
    if (this.provider === "google") {
      return googleTranslate(texts, this.targetLang);
    }

    return deeplTranslate(texts, this.targetLang);
  };

  private installTrackWatchers = (): void => {
    if (this.tracksList) return;

    const list = this.video.textTracks;
    this.tracksList = list;

    const handler = () => {
      this.logTracks("watcher");
      this.requestAttachTrack();
    };
    this.tracksHandler = handler;

    list.addEventListener("addtrack", handler as EventListener);
    list.addEventListener("removetrack", handler as EventListener);
    list.addEventListener("change", handler as EventListener);

    this.video.addEventListener("loadedmetadata", handler, { passive: true });
    this.video.addEventListener("loadstart", handler, { passive: true });
    this.video.addEventListener("emptied", handler, { passive: true });

    this.tracksPoll = window.setInterval(handler, 500);

    log.info("installed track watchers");
  };

  private uninstallTrackWatchers = (): void => {
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
  };

  private requestAttachTrack = (): void => {
    if (!this.running) return;

    if (
      this.track &&
      this.tracksList &&
      !this.isTrackStillPresent(this.track, this.tracksList)
    ) {
      log.warn("current track disappeared; detaching");
      this.detachTrack();
    }

    const candidate = pickSubtitleTrack(this.video);

    if (!candidate) {
      log.warn("pickSubtitleTrack() returned no candidate");
      this.scheduleMissingHint();
      return;
    }

    log.info("pickSubtitleTrack() chose", {
      kind: candidate.kind,
      label: candidate.label,
      language: candidate.language,
      mode: candidate.mode,
      cues: candidate.cues?.length ?? 0,
      activeCues: candidate.activeCues?.length ?? 0,
    });

    this.clearMissingHint();

    if (candidate === this.track) return;
    void this.attachTrack(candidate);
  };

  private isTrackStillPresent = (
    track: TextTrack,
    list: TextTrackList,
  ): boolean => {
    for (let i = 0; i < list.length; i++) {
      if (list[i] === track) return true;
    }
    return false;
  };

  private detachTrack = (): void => {
    if (this.track) {
      this.track.oncuechange = this.prevOnCueChange;
      if (this.prevTrackMode) this.track.mode = this.prevTrackMode;

      log.info("detached track", {
        kind: this.track.kind,
        label: this.track.label,
        language: this.track.language,
      });
    }
    this.track = null;
    this.prevOnCueChange = null;
    this.prevTrackMode = null;
  };

  private attachTrack = async (track: TextTrack): Promise<void> => {
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

      log.info("attached track", {
        kind: track.kind,
        label: track.label,
        language: track.language,
        prevMode: this.prevTrackMode,
        newMode: track.mode,
        cues: track.cues?.length ?? 0,
        activeCues: track.activeCues?.length ?? 0,
      });

      const newVideoId = getAreenaVideoId();
      if (newVideoId !== this.videoId) {
        this.videoId = newVideoId;

        this.cache = await loadCache(
          this.videoId,
          this.targetLang,
          this.provider,
        );
      } else if (!this.cache.size) {
        this.cache = await loadCache(
          this.videoId,
          this.targetLang,
          this.provider,
        );
      }

      this.prevOnCueChange = track.oncuechange;
      track.oncuechange = () => {
        log.info("cuechange fired", {
          mode: track.mode,
          cues: track.cues?.length ?? 0,
          activeCues: track.activeCues?.length ?? 0,
          currentTime: this.video.currentTime,
        });
        void this.render();
      };

      await this.render();
    } finally {
      this.attaching = false;
      if (this.attachQueued) {
        this.attachQueued = false;
        this.requestAttachTrack();
      }
    }
  };

  private scheduleMissingHint = (): void => {
    if (this.missingHintTimer || this.showingMissingHint) return;

    this.missingHintTimer = window.setTimeout(() => {
      this.missingHintTimer = null;
      if (!this.running || this.track) return;

      this.showingMissingHint = true;
      log.warn("showing missing subtitle hint");
      this.ui.showSubtitle(
        "Waiting for subtitles… (turn subtitles on in the player)",
      );
    }, 1500);
  };

  private clearMissingHint = (): void => {
    if (this.missingHintTimer) {
      window.clearTimeout(this.missingHintTimer);
      this.missingHintTimer = null;
    }
    if (this.showingMissingHint) {
      this.showingMissingHint = false;
      this.ui.hideSubtitle();
    }
  };

  private render = async (): Promise<void> => {
    if (!this.running || !this.track) return;

    if (this.renderInFlight) {
      this.renderQueued = true;
      return;
    }
    this.renderInFlight = true;

    try {
      const active = Array.from(this.track.activeCues ?? []);
      if (!active.length) {
        log.info("render(): no active cues", {
          mode: this.track.mode,
          cues: this.track.cues?.length ?? 0,
          activeCues: this.track.activeCues?.length ?? 0,
          currentTime: this.video.currentTime,
        });
        this.ui.hideSubtitle();
        return;
      }

      const rawTexts = active.map(getCueText);
      const originals = rawTexts.map(normalize).filter(Boolean);

      log.info("render(): active cue texts", {
        rawTexts,
        originals,
      });

      if (!originals.length) {
        log.warn("render(): cue text existed but normalized to empty");
        this.ui.hideSubtitle();
        return;
      }

      if (this.translationDisabled) {
        log.warn("translation disabled, showing originals only");
        this.ui.showSubtitle(originals.join("\n"));
        return;
      }

      const missing = Array.from(
        new Set(originals.filter((t) => !this.cache.has(t))),
      );

      log.info("render(): cache status", {
        originalsCount: originals.length,
        missingCount: missing.length,
        missing,
      });

      if (missing.length) {
        try {
          log.info("calling translation provider", {
            provider: this.provider,
            targetLang: this.targetLang,
            missing,
          });

          const translated = await this.translate(missing);

          log.info("translation provider returned", {
            provider: this.provider,
            translated,
          });

          for (let i = 0; i < missing.length; i++) {
            this.cache.set(missing[i], translated[i] ?? "");
          }
          queueSaveCache(
            this.videoId,
            this.targetLang,
            this.cache,
            this.provider,
          );
        } catch (err: unknown) {
          log.error(`${this.provider} translation failed`, err);
          this.translationDisabled = true;
          this.ui.showSubtitle(originals.join("\n"));
          return;
        }
      }

      this.ui.showSubtitle(
        originals.map((t) => this.cache.get(t) || t).join("\n"),
      );
    } finally {
      this.renderInFlight = false;
      if (this.renderQueued) {
        this.renderQueued = false;
        void this.render();
      }
    }
  };
}
