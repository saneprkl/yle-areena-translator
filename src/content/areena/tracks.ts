export function getCueText(cue: TextTrackCue): string {
  const anyCue = cue as any;
  return String(anyCue.text ?? "").trim();
}

export function pickSubtitleTrack(video: HTMLVideoElement): TextTrack | null {
  const tracks = Array.from(video.textTracks ?? []);
  const candidates = tracks.filter((t) => t.kind === "subtitles" || t.kind === "captions");
  const preferred = candidates.find((t) => t.language === "fi" || t.language === "sv");
  return preferred ?? candidates[0] ?? null;
}
