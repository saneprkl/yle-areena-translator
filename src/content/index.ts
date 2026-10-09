import { loadState, saveState } from "./areena/state";
import { waitForVideo } from "./areena/video";

import { TranslatorSession } from "./areena/TranslatorSession";
import { AreenaUI } from "./areena/ui/AreenaUI";
import { createLogger, initLogging } from "../global/logger";

const log = createLogger("content/index");
void initLogging();

let mountedForVideo: HTMLVideoElement | null = null;
let ui: AreenaUI | null = null;
let session: TranslatorSession | null = null;
let mounting = false;

const mountOrRemount = async (): Promise<void> => {
  if (mounting) return;
  mounting = true;

  try {
    const video = await waitForVideo();

    log.info("mountOrRemount()", {
      sameVideo: mountedForVideo === video,
      currentSrc: video.currentSrc || null,
      textTrackCount: video.textTracks.length,
    });

    if (mountedForVideo === video) {
      ui?.reattachToggle(video);
      return;
    }

    mountedForVideo = video;

    session?.stop();
    session = null;

    ui?.destroy();
    ui = new AreenaUI();
    ui.mount(video);

    const state = await loadState();

    log.info("loaded state", state);

    ui.setToggleLabel(state.enabled, state.targetLang);
    ui.setProvider(state.provider);

    ui.setOnToggle(() => {
      void (async () => {
        const current = await loadState();

        const next = {
          ...current,
          enabled: !current.enabled,
        };

        await saveState(next);

        log.info("toggle -> new state", next);

        ui!.setToggleLabel(next.enabled, next.targetLang);

        if (next.enabled) {
          session?.stop();

          session = new TranslatorSession(
            video,
            next.targetLang,
            next.provider,
            ui!,
          );

          await session.start();
        } else {
          session?.stop();
          session = null;
          ui!.hideSubtitle();
        }
      })();
    });

    ui.setOnProviderChange((provider) => {
      void (async () => {
        const current = await loadState();

        if (current.provider === provider) {
          return;
        }

        const next = {
          ...current,
          provider,
        };

        await saveState(next);

        log.info("provider -> new state", next);

        ui!.setProvider(next.provider);

        if (next.enabled) {
          session?.stop();
          session = null;
          ui!.hideSubtitle();

          session = new TranslatorSession(
            video,
            next.targetLang,
            next.provider,
            ui!,
          );

          await session.start();
        }
      })();
    });

    if (state.enabled) {
      session = new TranslatorSession(
        video,
        state.targetLang,
        state.provider,
        ui,
      );

      await session.start();
    } else {
      ui.hideSubtitle();
    }
  } finally {
    mounting = false;
  }
};

const runMount = (): void => {
  void mountOrRemount().catch((err: unknown) =>
    log.error("Translator mount failed", err),
  );
};

const mo = new MutationObserver(runMount);

mo.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

void runMount();
