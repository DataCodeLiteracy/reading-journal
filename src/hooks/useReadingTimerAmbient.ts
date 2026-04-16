import { useEffect, useRef } from "react"
import { READING_TIMER_AMBIENT_TRACKS } from "@/constants/readingTimerMedia"

const DEFAULT_VOLUME = 0.32

/** 끝부분(페이드아웃 등) 직전에 되감아 반복할 구간(초) */
const AMBIENT_SOFT_LOOP_TAIL_SEC = 20
/** 되감은 뒤 재생을 시작할 시점(초) — 끝 20초 전에 도달하면 여기로 점프 */
const AMBIENT_SOFT_LOOP_RESTART_SEC = 20
/** 이 길이(초) 이상일 때만 소프트 루프(짧은 파일은 기본 loop 유지) */
const AMBIENT_SOFT_LOOP_MIN_DURATION_SEC =
  AMBIENT_SOFT_LOOP_TAIL_SEC + AMBIENT_SOFT_LOOP_RESTART_SEC + 15

/**
 * 타이머가 켜져 있을 때만 선택된 트랙을 루프 재생합니다.
 * 긴 트랙은 끝 20초 전에 앞쪽(약 20초 지점)으로 점프해 끊김 없이 이어지게 합니다.
 */
export function useReadingTimerAmbient(isTimerRunning: boolean, trackId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    const track = READING_TIMER_AMBIENT_TRACKS.find((t) => t.id === trackId)
    if (!track?.src) return
    const a = new Audio(track.src)
    a.volume = DEFAULT_VOLUME
    let useSoftLoop = false
    let disposed = false

    const applyLoopMode = () => {
      if (disposed) return
      const d = a.duration
      if (Number.isFinite(d) && d >= AMBIENT_SOFT_LOOP_MIN_DURATION_SEC) {
        useSoftLoop = true
        a.loop = false
      } else {
        useSoftLoop = false
        a.loop = true
      }
    }

    const onTimeUpdate = () => {
      if (!useSoftLoop || disposed) return
      const d = a.duration
      if (!Number.isFinite(d)) return
      if (a.currentTime < d - AMBIENT_SOFT_LOOP_TAIL_SEC) return
      const restart = Math.min(
        AMBIENT_SOFT_LOOP_RESTART_SEC,
        Math.max(0, d - AMBIENT_SOFT_LOOP_TAIL_SEC - 0.25)
      )
      a.currentTime = restart
    }

    a.addEventListener("loadedmetadata", applyLoopMode)
    a.addEventListener("durationchange", applyLoopMode)
    a.addEventListener("timeupdate", onTimeUpdate)
    audioRef.current = a

    return () => {
      disposed = true
      a.removeEventListener("loadedmetadata", applyLoopMode)
      a.removeEventListener("durationchange", applyLoopMode)
      a.removeEventListener("timeupdate", onTimeUpdate)
      a.pause()
      a.src = ""
      if (audioRef.current === a) audioRef.current = null
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
}
