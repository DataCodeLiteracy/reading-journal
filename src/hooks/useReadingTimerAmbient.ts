import { useEffect, useRef } from "react"
import { READING_TIMER_AMBIENT_TRACKS } from "@/constants/readingTimerMedia"

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

/**
 * 타이머가 켜져 있을 때만 선택된 트랙을 루프 재생합니다.
 * 긴 트랙은 끝 5초 전에 앞쪽(약 2초 지점)으로 점프해 끊김 없이 이어지게 합니다.
 */
export function useReadingTimerAmbient(isTimerRunning: boolean, trackId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** timeupdate / interval / ended 핸들러가 같은 값을 보도록 ref로 유지 */
  const useSoftLoopRef = useRef(false)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    useSoftLoopRef.current = false
    const track = READING_TIMER_AMBIENT_TRACKS.find((t) => t.id === trackId)
    if (!track?.src) return
    const a = new Audio(track.src)
    a.volume = DEFAULT_VOLUME
    let disposed = false

    const applyLoopMode = () => {
      if (disposed) return
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

    const onTimeUpdate = () => {
      if (!useSoftLoopRef.current || disposed) return
      const d = a.duration
      if (!Number.isFinite(d)) return
      if (a.currentTime < d - AMBIENT_SOFT_LOOP_TAIL_SEC) return
      seekSoftLoopRestart()
    }

    const onEnded = () => {
      if (disposed || !useSoftLoopRef.current) return
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
    }
  }, [isTimerRunning, trackId])

  // timeupdate만으로는 끝 구간을 통째로 건너뛰는 경우가 있어, 재생 중 주기적으로 점프
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
}

function seekSoftLoopRestartForElement(a: HTMLAudioElement) {
  const d = a.duration
  if (!Number.isFinite(d)) return
  a.currentTime = restartSecondForDuration(d)
}
