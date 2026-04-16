export const READING_TIMER_AMBIENT_STORAGE_KEY = "readingJournal.timerAmbientTrackId"
export const READING_TIMER_BG_STORAGE_KEY = "readingJournal.timerBgId"

export type ReadingTimerAmbientTrack = {
  id: string
  label: string
  src: string | null
}

export const READING_TIMER_AMBIENT_TRACKS: ReadingTimerAmbientTrack[] = [
  { id: "off", label: "끔", src: null },
  { id: "audio1", label: "오두막", src: "/audio/audio1.mp3" },
  { id: "audio2", label: "창가에 내리는 비", src: "/audio/audio2.mp3" },
  { id: "audio3", label: "오래된 책방의 오후", src: "/audio/audio3.mp3" },
  { id: "audio4", label: "밤하늘 아래 서재", src: "/audio/audio4.mp3" },
  { id: "audio5", label: "새벽의 과수원", src: "/audio/audio5.mp3" },
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
