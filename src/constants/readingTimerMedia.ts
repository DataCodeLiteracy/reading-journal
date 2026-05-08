export const READING_TIMER_AMBIENT_STORAGE_KEY = "readingJournal.timerAmbientTrackId"
export const READING_TIMER_BG_STORAGE_KEY = "readingJournal.timerBgId"
export const READING_TIMER_DEFAULT_AMBIENT_ID = "staring"
const AMBIENT_UI_MAX_INDEX = 9

export type ReadingTimerAmbientTrack = {
  id: string
  label: string
  src: string | null
}

const AMBIENT_FILENAME_KO_LABEL: Record<string, string> = {
  "1.distant-land.mp3": "먼 땅",
  "2.lingering-gaze.mp3": "머무는 시선",
  "3.phosphorescence.mp3": "인광",
  "4.forest.mp3": "숲의",
  "5.purple-cat.mp3": "보라색 고양이",
  "6.snowfall.mp3": "눈 내림",
  "7.early-light.mp3": "이른 빛",
  "8.blue-wednesday.mp3": "푸른 수요일",
}

/** `public/audio` 아래 저장한 파일명 그대로(한글·공백 가능) → URL 경로 */
function ambientSrc(fileName: string): string {
  return `/audio/${encodeURIComponent(fileName)}`
}

/**
 * 번호 접두 파일명 `N.*.mp3` (N=1~9). 저장 파일명과 동일해야 재생됨.
 * 6~9는 예시 이름이며 원하는 파일명으로 바꾸면 됩니다.
 */
export const READING_TIMER_AMBIENT_TRACKS: ReadingTimerAmbientTrack[] = [
  { id: "off", label: "끔", src: null },
  {
    id: "early-light",
    label: "먼 땅",
    src: ambientSrc("1.distant-land.mp3"),
  },
  {
    id: "staring",
    label: "머무는 시선",
    src: ambientSrc("2.lingering-gaze.mp3"),
  },
  {
    id: "blue-wednesday",
    label: "인광",
    src: ambientSrc("3.phosphorescence.mp3"),
  },
  {
    id: "snowfall",
    label: "숲의",
    src: ambientSrc("4.forest.mp3"),
  },
  {
    id: "purrple-cat",
    label: "보라색 고양이",
    src: ambientSrc("5.purple-cat.mp3"),
  },
  {
    id: "ambient-6",
    label: "눈 내림",
    src: ambientSrc("6.snowfall.mp3"),
  },
  {
    id: "ambient-7",
    label: "이른 빛",
    src: ambientSrc("7.early-light.mp3"),
  },
  {
    id: "ambient-8",
    label: "푸른 수요일",
    src: ambientSrc("8.blue-wednesday.mp3"),
  },
  {
    id: "ambient-9",
    label: "배경음 9 (준비중)",
    src: null,
  },
]

function ambientTrackOrderFromSrc(src: string | null): number | null {
  if (!src) return null
  // 예: /audio/1.%20Some%20Track.mp3
  const match = src.match(/\/audio\/(\d+)\./)
  if (!match) return null
  const n = Number(match[1])
  return Number.isInteger(n) ? n : null
}

/** UI: `N.` 번호·확장자는 빼고 파일명의 본문만 표시 (예: `1.이른 빛.mp3` → `이른 빛`) */
export function getAmbientTrackDisplayLabel(t: ReadingTimerAmbientTrack): string {
  if (t.id === "off" || !t.src) return t.label
  try {
    const segment = t.src.split("?")[0]!.split("#")[0]!.split("/").pop()
    if (!segment) return t.label
    const mapped = AMBIENT_FILENAME_KO_LABEL[segment]
    if (mapped) return mapped
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
 * - `1.` ~ `9.` 번 트랙을 항상 순서대로 노출(정의와 동일 9개)
 */
export function getAmbientTracksForUi(): ReadingTimerAmbientTrack[] {
  const off = READING_TIMER_AMBIENT_TRACKS.find((t) => t.id === "off")
  const numbered = READING_TIMER_AMBIENT_TRACKS
    .filter((t) => t.id !== "off")
    .map((t) => ({ track: t, order: ambientTrackOrderFromSrc(t.src) }))
    .filter((x) => x.order !== null && x.order >= 1 && x.order <= AMBIENT_UI_MAX_INDEX)
    .sort((a, b) => (a.order! - b.order!))
    .map((x) => x.track)

  if (numbered.length === 0) return READING_TIMER_AMBIENT_TRACKS
  return off ? [off, ...numbered] : numbered
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
  return READING_TIMER_AMBIENT_TRACKS.some((t) => t.id === id)
}

export function isValidTimerBgId(id: string): boolean {
  return READING_TIMER_BG_PRESETS.some((p) => p.id === id)
}

export function getTimerBgSrc(id: string): string {
  const p = READING_TIMER_BG_PRESETS.find((x) => x.id === id)
  return p?.src ?? READING_TIMER_BG_PRESETS[0].src
}
