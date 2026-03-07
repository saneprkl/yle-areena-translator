export const getCueText = (cue: TextTrackCue): string => {
  if ("text" in cue && typeof cue.text === "string") {
    return cue.text.trim();
  }
  return "";
};

export const pickSubtitleTrack = (
  video: HTMLVideoElement,
): TextTrack | null => {
  const tracks = Array.from(video.textTracks ?? []);
  const candidates = tracks.filter(
    (t) => t.kind === "subtitles" || t.kind === "captions",
  );
  const preferred = candidates.find(
    (t) => t.language === "fi" || t.language === "sv",
  );
  return preferred ?? candidates[0] ?? null;
};
