export class AreenaUI {
  private root: HTMLDivElement | null = null;
  private subtitleBox: HTMLDivElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private toggleHost: HTMLDivElement | null = null;

  private fallbackHideTimer: number | null = null;
  private onToggle: (() => void | Promise<void>) | null = null;

  private boundVideo: HTMLVideoElement | null = null;
  private bumpHandler: (() => void) | null = null;
  private pauseHandler: (() => void) | null = null;

  mount(video: HTMLVideoElement) {
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

    this.subtitleBox = document.createElement("div");
    this.subtitleBox.id = "areena-deepl-subs";
    this.subtitleBox.style.position = "absolute";
    this.subtitleBox.style.left = "50%";
    this.subtitleBox.style.transform = "translateX(-50%)";
    this.subtitleBox.style.bottom = "10%";
    this.subtitleBox.style.maxWidth = "min(980px, 94%)";
    this.subtitleBox.style.padding = "12px 16px";
    this.subtitleBox.style.background = "rgba(0,0,0,0.78)";
    this.subtitleBox.style.color = "#fff";
    this.subtitleBox.style.borderRadius = "14px";
    this.subtitleBox.style.border = "1px solid rgba(255,255,255,0.12)";
    this.subtitleBox.style.textAlign = "center";
    this.subtitleBox.style.whiteSpace = "pre-line";
    this.subtitleBox.style.pointerEvents = "none";
    this.subtitleBox.style.fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial, sans-serif';
    this.subtitleBox.style.fontSize = "20px";
    this.subtitleBox.style.lineHeight = "1.35";
    this.subtitleBox.style.fontWeight = "650";
    this.subtitleBox.style.textShadow = "0 2px 8px rgba(0,0,0,0.95)";
    this.subtitleBox.textContent = "";
    this.subtitleBox.style.display = "none";
    this.root.appendChild(this.subtitleBox);

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
    this.toggleBtn.onclick = () => void this.onToggle?.();

    this.reattachToggle(video);
  }

  destroy() {
    this.stopFallbackAutoHide();

    if (this.boundVideo && this.bumpHandler) {
      this.boundVideo.removeEventListener("mousemove", this.bumpHandler);
      this.boundVideo.removeEventListener("touchstart", this.bumpHandler);
      this.boundVideo.removeEventListener("play", this.bumpHandler);
    }
    if (this.boundVideo && this.pauseHandler) {
      this.boundVideo.removeEventListener("pause", this.pauseHandler);
    }

    this.root?.remove();
    this.root = null;
    this.subtitleBox = null;
    this.toggleBtn = null;
    this.toggleHost = null;
    this.onToggle = null;
    this.boundVideo = null;
    this.bumpHandler = null;
    this.pauseHandler = null;
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
    if (!this.subtitleBox) return;
    const clean = text.trim();
    if (!clean) return this.hideSubtitle();
    this.subtitleBox.textContent = clean;
    this.subtitleBox.style.display = "block";
  }

  hideSubtitle() {
    if (!this.subtitleBox) return;
    this.subtitleBox.textContent = "";
    this.subtitleBox.style.display = "none";
  }

  reattachToggle(video: HTMLVideoElement) {
    if (!this.root || !this.toggleBtn) return;

    const bar = this.findControlBar(video);
    if (bar) {
      if (!this.toggleHost) {
        this.toggleHost = document.createElement("div");
        this.toggleHost.style.display = "flex";
        this.toggleHost.style.alignItems = "center";
        this.toggleHost.style.justifyContent = "center";
        this.toggleHost.style.pointerEvents = "auto";
        this.toggleHost.style.flex = "1 1 auto";
        this.toggleHost.style.minWidth = "60px";
      }

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

    this.ensureFallbackHost();
    this.startFallbackAutoHide(video);
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
      this.toggleHost.style.position = "absolute";
      this.toggleHost.style.left = "50%";
      this.toggleHost.style.bottom = "12px";
      this.toggleHost.style.transform = "translateX(-50%)";
      this.toggleHost.style.pointerEvents = "auto";
      this.toggleHost.style.opacity = "0";
      this.toggleHost.style.transition = "opacity 150ms ease";
      this.root.appendChild(this.toggleHost);
    } else if (this.toggleHost.parentElement !== this.root) {
      this.toggleHost.remove();
      this.root.appendChild(this.toggleHost);
    }

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

    if (video.paused) this.showFallbackToggle();
    else this.hideFallbackToggle();
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
