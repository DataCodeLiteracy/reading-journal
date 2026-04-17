export const READING_TIMER_AMBIENT_STORAGE_KEY = "readingJournal.timerAmbientTrackId"
export const READING_TIMER_BG_STORAGE_KEY = "readingJournal.timerBgId"

export type ReadingTimerAmbientTrack = {
  id: string
  label: string
  src: string | null
}

/** `public/audio` 실제 파일명(영문) — 공백은 URL 인코딩 */
export const READING_TIMER_AMBIENT_TRACKS: ReadingTimerAmbientTrack[] = [
  { id: "off", label: "끔", src: null },
  {
    id: "early-light",
    label: "이른 빛",
    src: "/audio/Early%20Light.mp3",
  },
  {
    id: "staring",
    label: "머무는 시선",
    src: "/audio/Staring.mp3",
  },
  {
    id: "blue-wednesday",
    label: "푸른 수요일",
    src: "/audio/Blue%20Wednesday.mp3",
  },
  {
    id: "snowfall",
    label: "눈 내림",
    src: "/audio/Snowfall.mp3",
  },
  {
    id: "purrple-cat",
    label: "보랏빛 고양이",
    src: "/audio/Purrple%20Cat.mp3",
  },
]

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
