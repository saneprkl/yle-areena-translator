import { SubtitleOverlay } from "./SubtitleOverlay/SubtitleOverlay";

export class AreenaUI {
  private root: HTMLDivElement | null = null;
  private subtitle: SubtitleOverlay | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private toggleHost: HTMLDivElement | null = null;

  private fallbackHideTimer: number | null = null;
  private onToggle: (() => void | Promise<void>) | null = null;

  private boundVideo: HTMLVideoElement | null = null;
  private bumpHandler: (() => void) | null = null;
  private pauseHandler: (() => void) | null = null;

  private domObserver: MutationObserver | null = null;
  private reattachRaf: number | null = null;

  mount(video: HTMLVideoElement) {
    if (this.root) this.destroy();

    this.cleanupStrayUi();

    this.boundVideo = video;
    const parent = video.parentElement ?? document.body;

    if (getComputedStyle(parent).position === "static") {
      (parent as HTMLElement).style.position = "relative";
    }

    this.root = document.createElement("div");
    this.root.id = "areena-deepl-root";
    this.root.style.position = "absolute";
    this.root.style.inset = "0";
    this.root.style.zIndex = "2147483647";
    this.root.style.pointerEvents = "none";
    (parent as HTMLElement).appendChild(this.root);

    this.subtitle = new SubtitleOverlay();
    this.subtitle.mount(this.root);

    this.toggleBtn = document.createElement("button");
    this.toggleBtn.id = "areena-deepl-toggle";
    this.toggleBtn.type = "button";
    this.toggleBtn.setAttribute("aria-label", "Toggle translation");
    this.toggleBtn.title = "Toggle translation";
    this.toggleBtn.style.padding = "6px 10px";
    this.toggleBtn.style.borderRadius = "999px";
    this.toggleBtn.style.border = "1px solid rgba(255,255,255,0.28)";
    this.toggleBtn.style.background = "rgba(0,0,0,0.35)";
    this.toggleBtn.style.color = "#fff";
    this.toggleBtn.style.fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial, sans-serif';
    this.toggleBtn.style.fontSize = "13px";
    this.toggleBtn.style.fontWeight = "800";
    this.toggleBtn.style.cursor = "pointer";
    this.toggleBtn.style.pointerEvents = "auto";
    this.toggleBtn.style.userSelect = "none";
    this.toggleBtn.style.textShadow = "0 2px 8px rgba(0,0,0,0.9)";
    this.toggleBtn.textContent = "Translate: OFF";
    this.toggleBtn.onclick = () => void this.onToggle?.();

    this.reattachToggle(video);
    this.startObserving(video);
  }

  destroy() {
    this.stopFallbackAutoHide();

    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    if (this.reattachRaf) {
      cancelAnimationFrame(this.reattachRaf);
      this.reattachRaf = null;
    }

    if (this.boundVideo && this.bumpHandler) {
      this.boundVideo.removeEventListener("mousemove", this.bumpHandler);
      this.boundVideo.removeEventListener("touchstart", this.bumpHandler);
      this.boundVideo.removeEventListener("play", this.bumpHandler);
    }
    if (this.boundVideo && this.pauseHandler) {
      this.boundVideo.removeEventListener("pause", this.pauseHandler);
    }

    this.toggleBtn?.remove();
    this.toggleHost?.remove();
    this.subtitle?.destroy();
    this.root?.remove();

    this.root = null;
    this.subtitle = null;
    this.toggleBtn = null;
    this.toggleHost = null;
    this.onToggle = null;
    this.boundVideo = null;
    this.bumpHandler = null;
    this.pauseHandler = null;
  }

  private cleanupStrayUi() {
    document.querySelectorAll("#areena-deepl-root").forEach((n) => n.remove());
    document.querySelectorAll("#areena-deepl-toggle").forEach((n) => n.remove());
    document.querySelectorAll("#areena-deepl-subs").forEach((n) => n.remove());
    document.querySelectorAll('[data-areena-deepl-host="1"]').forEach((n) => n.remove());
  }

  private startObserving(video: HTMLVideoElement) {
    const parent = (video.parentElement ?? document.body) as HTMLElement;

    this.domObserver = new MutationObserver(() => {
      if (!this.boundVideo) return;
      if (this.reattachRaf) return;
      this.reattachRaf = requestAnimationFrame(() => {
        this.reattachRaf = null;
        this.reattachToggle(this.boundVideo!);
      });
    });

    this.domObserver.observe(parent, { subtree: true, childList: true });
  }

  setOnToggle(fn: () => void | Promise<void>) {
    this.onToggle = fn;
  }

  setToggleLabel(enabled: boolean, targetLang: string) {
    if (!this.toggleBtn) return;
    this.toggleBtn.textContent = enabled ? `Translate: ON (${targetLang})` : "Translate: OFF";
    this.toggleBtn.style.outline = enabled ? "2px solid rgba(80,200,120,0.9)" : "none";
  }

  showSubtitle(text: string) {
    this.subtitle?.show(text);
  }

  hideSubtitle() {
    this.subtitle?.hide();
  }

  reattachToggle(video: HTMLVideoElement) {
    if (!this.root || !this.toggleBtn) return;

    const bar = this.findControlBar(video);
    if (bar) {
      if (!this.toggleHost) {
        this.toggleHost = document.createElement("div");
        this.toggleHost.setAttribute("data-areena-deepl-host", "1");
        this.toggleHost.style.display = "flex";
        this.toggleHost.style.alignItems = "center";
        this.toggleHost.style.justifyContent = "center";
        this.toggleHost.style.pointerEvents = "auto";
        this.toggleHost.style.flex = "1 1 auto";
        this.toggleHost.style.minWidth = "60px";
      } else {
        this.toggleHost.setAttribute("data-areena-deepl-host", "1");
        this.toggleHost.style.display = "flex";
        this.toggleHost.style.alignItems = "center";
        this.toggleHost.style.justifyContent = "center";
        this.toggleHost.style.pointerEvents = "auto";
        this.toggleHost.style.flex = "1 1 auto";
        this.toggleHost.style.minWidth = "60px";
        this.toggleHost.style.position = "";
        this.toggleHost.style.left = "";
        this.toggleHost.style.bottom = "";
        this.toggleHost.style.transform = "";
        this.toggleHost.style.opacity = "";
        this.toggleHost.style.transition = "";
      }

      bar.querySelectorAll('[data-areena-deepl-host="1"]').forEach((host) => {
        if (host !== this.toggleHost) host.remove();
      });

      const idx = Math.floor(bar.children.length / 2);
      const ref = (bar.children[idx] ?? null) as Element | null;

      if (this.toggleHost.parentElement !== bar) {
        this.toggleHost.remove();
        bar.insertBefore(this.toggleHost, ref);
      }
      if (this.toggleBtn.parentElement !== this.toggleHost) {
        this.toggleBtn.remove();
        this.toggleHost.appendChild(this.toggleBtn);
      }

      this.stopFallbackAutoHide();
      return;
    }

    this.stopFallbackAutoHide();

    if (
      this.toggleHost &&
      this.toggleHost.isConnected &&
      this.toggleHost.parentElement &&
      this.toggleHost.parentElement !== this.root
    ) {
      return;
    }

    this.toggleHost?.remove();
  }

  private findControlBar(video: HTMLVideoElement): HTMLElement | null {
    const container = (video.parentElement ?? document.body) as HTMLElement;

    const selectors = [
      '[role="toolbar"]',
      '[class*="control-bar"]',
      '[class*="controlBar"]',
      '[class*="controls"]',
      '[class*="Controls"]',
      '[data-testid*="control"]',
      '[data-test*="control"]'
    ].join(",");

    const candidates = Array.from(container.querySelectorAll<HTMLElement>(selectors));
    const vRect = video.getBoundingClientRect();

    const nearBottom = candidates.filter((el) => {
      const r = el.getBoundingClientRect();
      const visible = r.width > 250 && r.height > 20 && r.height < 140;
      const closeToVideo =
        r.left < vRect.right &&
        r.right > vRect.left &&
        r.bottom <= vRect.bottom + 20 &&
        r.top >= vRect.bottom - 220;
      return visible && closeToVideo;
    });

    nearBottom.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
    return nearBottom[0] ?? null;
  }

  private ensureFallbackHost() {
    if (!this.root || !this.toggleBtn) return;

    if (!this.toggleHost) {
      this.toggleHost = document.createElement("div");
    }

    this.toggleHost.setAttribute("data-areena-deepl-host", "1");
    this.toggleHost.style.position = "absolute";
    this.toggleHost.style.left = "50%";
    this.toggleHost.style.bottom = "12px";
    this.toggleHost.style.transform = "translateX(-50%)";
    this.toggleHost.style.pointerEvents = "auto";
    this.toggleHost.style.opacity = "0";
    this.toggleHost.style.transition = "opacity 150ms ease";

    this.toggleHost.style.display = "";
    this.toggleHost.style.alignItems = "";
    this.toggleHost.style.justifyContent = "";
    this.toggleHost.style.flex = "";
    this.toggleHost.style.minWidth = "";

    if (this.toggleHost.parentElement !== this.root) {
      this.toggleHost.remove();
      this.root.appendChild(this.toggleHost);
    }

    document.querySelectorAll('[data-areena-deepl-host="1"]').forEach((host) => {
      if (host !== this.toggleHost) host.remove();
    });

    if (this.toggleBtn.parentElement !== this.toggleHost) {
      this.toggleBtn.remove();
      this.toggleHost.appendChild(this.toggleBtn);
    }
  }

  private showFallbackToggle() {
    if (!this.toggleHost) return;
    this.toggleHost.style.opacity = "1";
  }

  private hideFallbackToggle() {
    if (!this.toggleHost) return;
    this.toggleHost.style.opacity = "0";
  }

  private startFallbackAutoHide(video: HTMLVideoElement) {
    const bump = () => {
      this.showFallbackToggle();
      if (this.fallbackHideTimer) window.clearTimeout(this.fallbackHideTimer);
      this.fallbackHideTimer = window.setTimeout(() => {
        if (!video.paused) this.hideFallbackToggle();
      }, 1800);
    };

    if (!this.bumpHandler) {
      this.bumpHandler = bump;
      this.pauseHandler = () => this.showFallbackToggle();

      video.addEventListener("mousemove", this.bumpHandler, { passive: true });
      video.addEventListener("touchstart", this.bumpHandler, { passive: true });
      video.addEventListener("play", this.bumpHandler);
      video.addEventListener("pause", this.pauseHandler);
    }

    bump();
  }

  private stopFallbackAutoHide() {
    if (this.fallbackHideTimer) {
      window.clearTimeout(this.fallbackHideTimer);
      this.fallbackHideTimer = null;
    }
    if (this.toggleHost) {
      this.toggleHost.style.opacity = "";
      this.toggleHost.style.transition = "";
    }
  }
}