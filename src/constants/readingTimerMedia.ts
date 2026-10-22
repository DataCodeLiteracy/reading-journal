import { GENERATED_AMBIENT_TRACKS } from "@/generated/readingTimerAmbientTracks.generated"

export const READING_TIMER_AMBIENT_STORAGE_KEY = "readingJournal.timerAmbientTrackId"
export const READING_TIMER_BG_STORAGE_KEY = "readingJournal.timerBgId"
export const READING_TIMER_DEFAULT_AMBIENT_ID = "staring"
/** 번호순 전곡을 순서대로 재생한 뒤 처음부터 반복 */
export const READING_TIMER_AMBIENT_PLAYLIST_ID = "playlist-loop"
/** 재생 가능한 모든 트랙을 랜덤 순서로 재생한 뒤 다시 셔플·반복 */
export const READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID = "playlist-random"

export type ReadingTimerAmbientTrack = {
  id: string
  label: string
  src: string | null
}

/**
 * `public/audio` 스캔 결과(scripts/generate-ambient-tracks.mjs).
 * 끔 + 생성된 트랙.
 */
export const READING_TIMER_AMBIENT_TRACKS: ReadingTimerAmbientTrack[] = [
  { id: "off", label: "끔", src: null },
  ...GENERATED_AMBIENT_TRACKS.map((t) => ({
    id: t.id,
    label: t.label,
    src: t.src,
  })),
]

/** UI·플레이리스트: 번호순으로 정렬된 재생 가능 트랙 */
export function getPlayableAmbientTracksInOrder(): ReadingTimerAmbientTrack[] {
  return [...GENERATED_AMBIENT_TRACKS]
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ id: t.id, label: t.label, src: t.src }))
}

/** UI: 파일명 본문(번호·확장자 제외). 생성 라벨이 있으면 그대로 */
export function getAmbientTrackDisplayLabel(t: ReadingTimerAmbientTrack): string {
  if (t.id === "off" || !t.src) return t.label
  if (t.label && t.label !== t.id) return t.label
  try {
    const segment = t.src.split("?")[0]!.split("#")[0]!.split("/").pop()
    if (!segment) return t.label
    const decoded = decodeURIComponent(segment)
    const base = decoded.replace(/\.[^.]+$/i, "").trim()
    const body = base.replace(/^\d+\.\s*/, "").trim()
    return body || t.label
  } catch {
    return t.label
  }
}

/**
 * 타이머 설정 UI 노출용 배경음 목록.
 * «전곡 순환»·«전곡 랜덤» + public/audio 의 모든 번호 트랙
 */
export function getAmbientTracksForUi(): ReadingTimerAmbientTrack[] {
  const off = READING_TIMER_AMBIENT_TRACKS.find((t) => t.id === "off")
  const numbered = getPlayableAmbientTracksInOrder()
  const playlist: ReadingTimerAmbientTrack = {
    id: READING_TIMER_AMBIENT_PLAYLIST_ID,
    label: "전곡 순환",
    src: null,
  }
  const playlistRandom: ReadingTimerAmbientTrack = {
    id: READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID,
    label: "전곡 랜덤",
    src: null,
  }

  if (numbered.length === 0) {
    return off ? [off] : READING_TIMER_AMBIENT_TRACKS
  }
  return off
    ? [off, playlist, playlistRandom, ...numbered]
    : [playlist, playlistRandom, ...numbered]
}

export type ReadingTimerBgPreset = {
  id: string
  label: string
  src: string
}

export const READING_TIMER_BG_PRESETS: ReadingTimerBgPreset[] = [
  { id: "bg1", label: "일출", src: "/image/background1.jpg" },
  { id: "bg2", label: "일몰", src: "/image/background2.jpg" },
  { id: "bg3", label: "오로라", src: "/image/background3.jpg" },
  { id: "bg4", label: "우주", src: "/image/background4.jpg" },
  { id: "bg5", label: "태양계", src: "/image/background5.jpg" },
]

export const READING_TIMER_DEFAULT_BG_ID = READING_TIMER_BG_PRESETS[0].id

export function isValidAmbientTrackId(id: string): boolean {
  if (
    id === READING_TIMER_AMBIENT_PLAYLIST_ID ||
    id === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID
  ) {
    return true
  }
  return READING_TIMER_AMBIENT_TRACKS.some((t) => t.id === id)
}

export function isValidTimerBgId(id: string): boolean {
  return READING_TIMER_BG_PRESETS.some((p) => p.id === id)
}

export function getTimerBgSrc(id: string): string {
  const p = READING_TIMER_BG_PRESETS.find((x) => x.id === id)
  return p?.src ?? READING_TIMER_BG_PRESETS[0].src
}
