import { useEffect, useRef } from "react"
import {
  getPlayableAmbientTracksInOrder,
  READING_TIMER_AMBIENT_PLAYLIST_ID,
  READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID,
  READING_TIMER_AMBIENT_TRACKS,
} from "@/constants/readingTimerMedia"

const DEFAULT_VOLUME = 0.32

/** 끝부분(페이드아웃 등) 직전에 되감아 반복할 구간(초) */
const AMBIENT_SOFT_LOOP_TAIL_SEC = 5
/** 되감은 뒤 재생을 시작할 시점(초) — 끝 5초 전에 도달하면 여기로 점프 */
const AMBIENT_SOFT_LOOP_RESTART_SEC = 2
/** 이 길이(초) 이상일 때만 소프트 루프(짧은 파일은 기본 loop 유지) */
const AMBIENT_SOFT_LOOP_MIN_DURATION_SEC =
  AMBIENT_SOFT_LOOP_TAIL_SEC + AMBIENT_SOFT_LOOP_RESTART_SEC + 15

function restartSecondForDuration(d: number): number {
  return Math.min(
    AMBIENT_SOFT_LOOP_RESTART_SEC,
    Math.max(0, d - AMBIENT_SOFT_LOOP_TAIL_SEC - 0.25),
  )
}

function seekSoftLoopRestartForElement(a: HTMLAudioElement) {
  const d = a.duration
  if (!Number.isFinite(d)) return
  a.currentTime = restartSecondForDuration(d)
}

function shuffleIndices(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

/** 한 사이클이 끝난 뒤 셔플할 때, 직전 곡과 같은 곡으로 시작하지 않도록 함 */
function shuffleIndicesAvoidHead(length: number, avoidTrackIndex: number): number[] {
  if (length <= 1) return shuffleIndices(length)
  for (let attempt = 0; attempt < 12; attempt++) {
    const order = shuffleIndices(length)
    if (order[0] !== avoidTrackIndex) return order
  }
  const order = shuffleIndices(length)
  const swapAt = order.findIndex((idx, i) => i > 0 && idx !== avoidTrackIndex)
  if (swapAt > 0) {
    ;[order[0], order[swapAt]] = [order[swapAt]!, order[0]!]
  }
  return order
}

function isPlaylistTrackId(trackId: string): boolean {
  return (
    trackId === READING_TIMER_AMBIENT_PLAYLIST_ID ||
    trackId === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID
  )
}

function resolvePlaylistInitialSrc(
  trackId: string,
  playlistOrder: number[],
): string | null {
  const tracks = getPlayableAmbientTracksInOrder()
  if (tracks.length === 0) return null

  if (trackId === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID) {
    const trackIndex = playlistOrder[0]
    if (trackIndex === undefined) return null
    return tracks[trackIndex]?.src ?? null
  }

  if (trackId === READING_TIMER_AMBIENT_PLAYLIST_ID) {
    return tracks[0]?.src ?? null
  }

  return null
}

function resolveInitialAmbientSrc(
  trackId: string,
  playlistOrder: number[],
): string | null {
  if (trackId === "off") return null
  if (isPlaylistTrackId(trackId)) {
    return resolvePlaylistInitialSrc(trackId, playlistOrder)
  }
  return READING_TIMER_AMBIENT_TRACKS.find((t) => t.id === trackId)?.src ?? null
}

function resetPlaylistState(
  trackId: string,
  playlistOrderRef: { current: number[] },
  playlistIndexRef: { current: number },
): string | null {
  const tracks = getPlayableAmbientTracksInOrder()
  if (tracks.length === 0) return null

  if (trackId === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID) {
    playlistOrderRef.current = shuffleIndices(tracks.length)
    playlistIndexRef.current = 0
    return tracks[playlistOrderRef.current[0]!]?.src ?? null
  }

  if (trackId === READING_TIMER_AMBIENT_PLAYLIST_ID) {
    playlistIndexRef.current = 0
    return tracks[0]?.src ?? null
  }

  return null
}

/**
 * 타이머가 켜져 있을 때만 선택된 트랙을 재생합니다.
 * - 단일 트랙: 긴 트랙은 소프트 루프, 짧은 트랙은 loop
 * - 전곡 순환: 재생 가능한 모든 트랙을 1→N 순서로 재생 후 처음부터 반복
 * - 전곡 랜덤: 재생 가능한 모든 트랙을 랜덤 순서로 재생 후 다시 셔플·반복
 */
export function useReadingTimerAmbient(isTimerRunning: boolean, trackId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const useSoftLoopRef = useRef(false)
  const isPlaylistModeRef = useRef(isPlaylistTrackId(trackId))
  const isRandomPlaylistRef = useRef(
    trackId === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID,
  )
  const playlistIndexRef = useRef(0)
  const playlistOrderRef = useRef<number[]>([])
  const isTimerRunningRef = useRef(isTimerRunning)

  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning
  }, [isTimerRunning])

  useEffect(() => {
    isPlaylistModeRef.current = isPlaylistTrackId(trackId)
    isRandomPlaylistRef.current =
      trackId === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID
  }, [trackId])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    useSoftLoopRef.current = false
    playlistIndexRef.current = 0
    playlistOrderRef.current = []

    if (trackId === READING_TIMER_AMBIENT_PLAYLIST_RANDOM_ID) {
      const tracks = getPlayableAmbientTracksInOrder()
      playlistOrderRef.current = shuffleIndices(tracks.length)
    }

    const initialSrc = resolveInitialAmbientSrc(trackId, playlistOrderRef.current)
    if (!initialSrc) return

    const a = new Audio(initialSrc)
    a.preload = "auto"
    a.volume = DEFAULT_VOLUME
    let disposed = false

    const applyLoopMode = () => {
      if (disposed) return
      if (isPlaylistModeRef.current) {
        useSoftLoopRef.current = false
        a.loop = false
        return
      }
      const d = a.duration
      if (Number.isFinite(d) && d >= AMBIENT_SOFT_LOOP_MIN_DURATION_SEC) {
        useSoftLoopRef.current = true
        a.loop = false
      } else {
        useSoftLoopRef.current = false
        a.loop = true
      }
    }

    const seekSoftLoopRestart = () => {
      const d = a.duration
      if (!Number.isFinite(d)) return
      a.currentTime = restartSecondForDuration(d)
    }

    const advancePlaylistTrack = () => {
      const tracks = getPlayableAmbientTracksInOrder()
      if (tracks.length === 0) return

      if (isRandomPlaylistRef.current) {
        playlistIndexRef.current += 1
        if (playlistIndexRef.current >= tracks.length) {
          const lastTrackIndex =
            playlistOrderRef.current[playlistIndexRef.current - 1] ?? 0
          playlistOrderRef.current = shuffleIndicesAvoidHead(
            tracks.length,
            lastTrackIndex,
          )
          playlistIndexRef.current = 0
        }
        const trackIndex = playlistOrderRef.current[playlistIndexRef.current]
        if (trackIndex === undefined) return
        a.src = tracks[trackIndex]!.src!
      } else {
        playlistIndexRef.current =
          (playlistIndexRef.current + 1) % tracks.length
        a.src = tracks[playlistIndexRef.current]!.src!
      }

      a.load()
      if (isTimerRunningRef.current) {
        void a.play().catch(() => {
          /* 재생 거부 등 */
        })
      }
    }

    const onTimeUpdate = () => {
      if (!useSoftLoopRef.current || disposed) return
      const d = a.duration
      if (!Number.isFinite(d)) return
      if (a.currentTime < d - AMBIENT_SOFT_LOOP_TAIL_SEC) return
      seekSoftLoopRestart()
    }

    const onEnded = () => {
      if (disposed) return
      if (isPlaylistModeRef.current) {
        advancePlaylistTrack()
        return
      }
      if (!useSoftLoopRef.current) return
      const d = a.duration
      if (!Number.isFinite(d) || d < AMBIENT_SOFT_LOOP_MIN_DURATION_SEC) return
      seekSoftLoopRestart()
      void a.play().catch(() => {
        /* 재생 거부 등 */
      })
    }

    a.addEventListener("loadedmetadata", applyLoopMode)
    a.addEventListener("durationchange", applyLoopMode)
    a.addEventListener("timeupdate", onTimeUpdate)
    a.addEventListener("ended", onEnded)
    audioRef.current = a

    return () => {
      disposed = true
      a.removeEventListener("loadedmetadata", applyLoopMode)
      a.removeEventListener("durationchange", applyLoopMode)
      a.removeEventListener("timeupdate", onTimeUpdate)
      a.removeEventListener("ended", onEnded)
      a.pause()
      a.src = ""
      if (audioRef.current === a) audioRef.current = null
      useSoftLoopRef.current = false
    }
  }, [trackId])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (isTimerRunning) {
      void a.play().catch(() => {
        /* 404·형식 오류·자동재생 제한 등 */
      })
    } else {
      a.pause()
      a.currentTime = 0
      if (isPlaylistTrackId(trackId)) {
        const first = resetPlaylistState(
          trackId,
          playlistOrderRef,
          playlistIndexRef,
        )
        if (first && a.src !== first) {
          a.src = first
          a.load()
        }
      }
    }
  }, [isTimerRunning, trackId])

  useEffect(() => {
    if (!isTimerRunning) return
    const a = audioRef.current
    if (!a) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (!useSoftLoopRef.current) return
      const d = a.duration
      if (!Number.isFinite(d)) return
      if (a.paused) return
      if (a.currentTime < d - AMBIENT_SOFT_LOOP_TAIL_SEC) return
      seekSoftLoopRestartForElement(a)
    }
    const id = window.setInterval(tick, 200)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [isTimerRunning, trackId])

  const primeAmbientPlaybackFromGesture = async (): Promise<void> => {
    const a = audioRef.current
    if (!a) return
    try {
      const prevTime = a.currentTime
      await a.play()
      a.pause()
      a.currentTime = prevTime
    } catch {
      // 제스처 타이밍/기기 정책에 따라 실패 가능: 타이머 시작 시 재시도됨
    }
  }

  return { primeAmbientPlaybackFromGesture }
}
