import { useEffect, useRef } from "react"
import {
  getPlayableAmbientTracksInOrder,
  READING_TIMER_AMBIENT_PLAYLIST_ID,
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

function resolveInitialAmbientSrc(trackId: string): string | null {
  if (trackId === "off") return null
  if (trackId === READING_TIMER_AMBIENT_PLAYLIST_ID) {
    return getPlayableAmbientTracksInOrder()[0]?.src ?? null
  }
  return READING_TIMER_AMBIENT_TRACKS.find((t) => t.id === trackId)?.src ?? null
}

/**
 * 타이머가 켜져 있을 때만 선택된 트랙을 재생합니다.
 * - 단일 트랙: 긴 트랙은 소프트 루프, 짧은 트랙은 loop
 * - 전곡 순환: 재생 가능한 모든 트랙을 1→N 순서로 재생 후 처음부터 반복
 */
export function useReadingTimerAmbient(isTimerRunning: boolean, trackId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const useSoftLoopRef = useRef(false)
  const isPlaylistModeRef = useRef(trackId === READING_TIMER_AMBIENT_PLAYLIST_ID)
  const playlistIndexRef = useRef(0)
  const isTimerRunningRef = useRef(isTimerRunning)

  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning
  }, [isTimerRunning])

  useEffect(() => {
    isPlaylistModeRef.current = trackId === READING_TIMER_AMBIENT_PLAYLIST_ID
  }, [trackId])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    useSoftLoopRef.current = false
    playlistIndexRef.current = 0

    const initialSrc = resolveInitialAmbientSrc(trackId)
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
      const playlist = getPlayableAmbientTracksInOrder()
      if (playlist.length === 0) return
      playlistIndexRef.current =
        (playlistIndexRef.current + 1) % playlist.length
      const next = playlist[playlistIndexRef.current]!
      a.src = next.src!
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
      if (trackId === READING_TIMER_AMBIENT_PLAYLIST_ID) {
        playlistIndexRef.current = 0
        const first = getPlayableAmbientTracksInOrder()[0]?.src
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
