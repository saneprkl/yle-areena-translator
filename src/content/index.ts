import { loadState, saveState } from "./areena/state";
import { waitForVideo } from "./areena/video";

import { TranslatorSession } from "./areena/TranslatorSession";
import { AreenaUI } from "./areena/ui/AreenaUI";

let mountedForVideo: HTMLVideoElement | null = null;
let ui: AreenaUI | null = null;
let session: TranslatorSession | null = null;
let mounting = false;

async function mountOrRemount() {
  if (mounting) return;
  mounting = true;

  try {
    const video = await waitForVideo();

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
    ui.setToggleLabel(state.enabled, state.targetLang);

    ui.setOnToggle(async () => {
      const current = await loadState();
      const next = { ...current, enabled: !current.enabled };
      await saveState(next);

      ui!.setToggleLabel(next.enabled, next.targetLang);

      if (next.enabled) {
        session?.stop();
        session = new TranslatorSession(video, next.targetLang, ui!);
        await session.start();
      } else {
        session?.stop();
        ui!.hideSubtitle();
      }
    });

    if (state.enabled) {
      session = new TranslatorSession(video, state.targetLang, ui);
      await session.start();
    } else {
      ui.hideSubtitle();
    }
  } finally {
    mounting = false;
  }
}

const runMount = () =>
  mountOrRemount().catch((err) => console.error("Translator mount failed: ", err));

const mo = new MutationObserver(runMount);
mo.observe(document.documentElement, { childList: true, subtree: true });

runMount();