export const subtitleBoxStyle: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: "10%",
  maxWidth: "min(980px, 94%)",
  padding: "0",
  background: "transparent",
  color: "#fff",
  borderRadius: "0",
  border: "none",
  textAlign: "center",
  whiteSpace: "pre-line",
  pointerEvents: "none",
  fontFamily:
    'system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial, sans-serif',
  fontSize: "42px",
  lineHeight: "1.35",
  fontWeight: "650",
  textShadow: "0 2px 8px rgba(0,0,0,0.95)"
};

export function applySubtitleBoxStyles(el: HTMLDivElement) {
  Object.assign(el.style, subtitleBoxStyle);
}