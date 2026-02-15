export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}
