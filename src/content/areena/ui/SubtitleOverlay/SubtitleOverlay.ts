import { applySubtitleBoxStyles } from "./SubtitleOverlay.styles";

export class SubtitleOverlay {
  private el: HTMLDivElement | null = null;

  mount(root: HTMLElement) {
    if (this.el) this.destroy();

    this.el = document.createElement("div");
    this.el.id = "areena-deepl-subs";
    applySubtitleBoxStyles(this.el);
    this.el.textContent = "";
    this.el.style.display = "none";
    root.appendChild(this.el);
  }

  show(text: string) {
    if (!this.el) return;
    const clean = text.trim();
    if (!clean) return this.hide();
    this.el.textContent = clean;
    this.el.style.display = "block";
  }

  hide() {
    if (!this.el) return;
    this.el.textContent = "";
    this.el.style.display = "none";
  }

  destroy() {
    this.el?.remove();
    this.el = null;
  }
}