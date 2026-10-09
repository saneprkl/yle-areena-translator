import { createLogger, initLogging } from "../../global/logger";

const log = createLogger("areena/tracks");
void initLogging();

export const getCueText = (cue: TextTrackCue): string => {
  if ("text" in cue && typeof cue.text === "string") {
    return cue.text.trim();
  }
  return "";
};

const isWantedTrack = (t: TextTrack): boolean =>
  t.kind === "subtitles" || t.kind === "captions";

const isFiOrSv = (t: TextTrack): boolean =>
  t.language === "fi" ||
  t.language === "fin" ||
  t.language === "sv" ||
  t.language === "swe";

const cueCount = (t: TextTrack): number => t.cues?.length ?? 0;

const scoreTrack = (t: TextTrack): number => {
  const label = (t.label || "").toLowerCase();

  let score = 0;

  if (t.kind === "captions") score += 100;
  if (t.kind === "subtitles") score += 40;

  if (isFiOrSv(t)) score += 30;

  if (label.includes("ohjelmatekstitys")) score += 80;
  if (label.includes("caption")) score += 30;

  if (label.includes("käännöstekstitys")) score -= 20;
  if (label.includes("translation")) score -= 20;

  if (cueCount(t) > 0) score += 200;

  return score;
};

export const pickSubtitleTrack = (
  video: HTMLVideoElement,
): TextTrack | null => {
  const tracks = Array.from(video.textTracks ?? []);
  const candidates = tracks.filter(isWantedTrack);

  if (!candidates.length) {
    log.info("pickSubtitleTrack: no subtitle/caption candidates");
    return null;
  }

  const ranked = [...candidates].sort((a, b) => scoreTrack(b) - scoreTrack(a));

  log.info(
    "pickSubtitleTrack: ranked candidates",
    ranked.map((t, i) => ({
      rank: i + 1,
      kind: t.kind,
      label: t.label,
      language: t.language,
      mode: t.mode,
      cues: cueCount(t),
      activeCues: t.activeCues?.length ?? 0,
      score: scoreTrack(t),
    })),
  );

  return ranked[0] ?? null;
};
