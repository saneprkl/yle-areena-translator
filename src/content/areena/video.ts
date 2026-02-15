import { sleep } from "./utils";

export async function waitForVideo(timeoutMs = 12000): Promise<HTMLVideoElement> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = document.querySelector("video") as HTMLVideoElement | null;
    if (v) return v;
    await sleep(250);
  }
  throw new Error("No <video> found (open a video and press play).");
}

export function getAreenaVideoId(): string {
  const m = location.href.match(/(\d+-\d+)/);
  return m?.[1] ?? location.pathname;
}
