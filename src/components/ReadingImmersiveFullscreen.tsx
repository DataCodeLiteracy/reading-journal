"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Clock, Pause, Play, RotateCcw, Settings } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

type CosmosState = "off" | "on" | "fail"

export const IMMERSIVE_TRANSITION_MS = 420

export type ReadingImmersiveFullscreenProps = {
  /** true일 때 페이드·살짝 축소 후 언마운트 */
  exiting?: boolean
  bookTitle: string
  bookAuthor: string
  totalReadingTimeLabel: string
  timerBgSrc: string
  cosmosOverlay: CosmosState
  onCosmosLoad: () => void
  onCosmosError: () => void
  getElapsedTime: () => number
  isTimerProcessing: boolean
  /** 종료 클릭 후 저장 중 — 표시 시간·글로우 고정 */
  isTimerFrozen?: boolean
  isSettingsOpen: boolean
  onToggleSettings: () => void
  isCompleted: boolean
  isOnHold: boolean
  onStop: () => void
  onRereadModal: () => void
  onReread: () => void
}

export default function ReadingImmersiveFullscreen({
  exiting = false,
  bookTitle,
  bookAuthor,
  totalReadingTimeLabel,
  timerBgSrc,
  cosmosOverlay,
  onCosmosLoad,
  onCosmosError,
  getElapsedTime,
  isTimerProcessing,
  isTimerFrozen = false,
  isSettingsOpen,
  onToggleSettings,
  isCompleted,
  isOnHold,
  onStop,
  onRereadModal,
  onReread,
}: ReadingImmersiveFullscreenProps) {
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [mounted])

  useBodyScrollLock(mounted)

  if (!mounted) return null

  const t = getElapsedTime()

  const surfaceClass = exiting
    ? "pointer-events-none opacity-0 scale-[0.98]"
    : !entered
      ? "opacity-0 scale-[0.99]"
      : "opacity-100 scale-100"

  const node = (
    <div
      className={`fixed inset-0 z-[280] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#0a0f1a] transition-[opacity,transform] ease-out ${surfaceClass}`}
      style={{ transitionDuration: `${IMMERSIVE_TRANSITION_MS}ms` }}
      role='dialog'
      aria-label='독서 집중 화면'
      aria-modal='true'
    >
      <div
        className='absolute inset-0 z-0 bg-gradient-to-b from-theme-secondary via-theme-secondary to-accent-theme/[0.06]'
        aria-hidden
      />
      <div className='reading-timer-cosmos-bg absolute inset-0 z-0' aria-hidden />
      <div className='reading-timer-cosmos-stars absolute inset-0 z-[1]' aria-hidden />
      {cosmosOverlay !== "fail" ? (
        <img
          key={timerBgSrc}
          src={timerBgSrc}
          alt=''
          width={1600}
          height={900}
          className={`pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
            cosmosOverlay === "on" ? "opacity-70" : "opacity-0"
          }`}
          onLoad={onCosmosLoad}
          onError={onCosmosError}
        />
      ) : null}

      <div className='relative z-10 flex min-h-0 flex-1 flex-col px-5 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8'>
        {/* 상단: 헤더 + 책 제목·저자·총 독서 시간 (안전 영역 바로 아래에 붙임) */}
        <div className='shrink-0'>
          <div className='relative flex min-h-10 items-center justify-between gap-2'>
            <h2 className='min-w-0 flex-1 pr-2 text-sm font-semibold leading-none tracking-wide text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]'>
              독서 시간
            </h2>
            <button
              type='button'
              onClick={onToggleSettings}
              className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] transition-colors hover:bg-white/15 hover:text-white'
              title='타이머 설정'
              aria-expanded={isSettingsOpen}
            >
              <Settings className='h-4 w-4' />
            </button>
          </div>
          <div className='mt-[48px] text-center'>
            <h3 className='line-clamp-2 max-w-md mx-auto text-lg font-semibold leading-snug text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] sm:line-clamp-3 sm:text-xl'>
              {bookTitle}
            </h3>
            <p className='mt-1 max-w-md mx-auto text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-sm'>
              {bookAuthor}
            </p>
            <div className='mt-2 flex items-center justify-center gap-1.5 text-xs text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)] sm:text-sm'>
              <Clock className='h-3.5 w-3.5 shrink-0 text-amber-200 sm:h-4 sm:w-4' />
              <span>총 독서 시간: {totalReadingTimeLabel}</span>
            </div>
          </div>
        </div>

        {/* 중앙 기준점 고정: 카피는 화면 중앙, 타이머는 그 아래로 확실히 배치 */}
        <div className='relative min-h-0 flex-1 px-2'>
          <div className='absolute left-1/2 top-[calc(50%-110px)] flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center'>
            <p className='text-[11px] font-medium tracking-[0.2em] text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'>
              지금 이 순간
            </p>
            <p className='mt-2 max-w-xs text-sm font-light leading-relaxed text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]'>
              잠시 주변을 내려놓고, 이 페이지만큼은 글자와 숨을 맞추어 읽어 보아요.
            </p>
          </div>

          <div className='absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 translate-y-[92px] sm:translate-y-[136px]'>
            <div
              className={`flex items-baseline justify-center gap-0.5 tabular-nums select-none drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] sm:gap-1.5 ${
                isTimerFrozen ? "" : "reading-timer-glow"
              }`}
            >
            <span className='text-6xl font-extralight leading-none text-white sm:text-7xl'>
              {Math.floor(t / 3600)
                .toString()
                .padStart(2, "0")}
            </span>
            <span className='pb-1 text-3xl font-light text-white/75 sm:pb-1.5 sm:text-4xl'>:</span>
            <span className='text-6xl font-extralight leading-none text-white sm:text-7xl'>
              {Math.floor((t % 3600) / 60)
                .toString()
                .padStart(2, "0")}
            </span>
            <span className='pb-1 text-3xl font-light text-white/75 sm:pb-1.5 sm:text-4xl'>:</span>
            <span className='text-6xl font-extralight leading-none text-amber-200 sm:text-7xl'>
              {(t % 60).toString().padStart(2, "0")}
            </span>
            </div>

            <div className='mt-6 w-full sm:mt-8'>
            {isCompleted ? (
              <button
                type='button'
                onClick={onRereadModal}
                disabled={isTimerProcessing}
                className='flex w-full items-center justify-center gap-2 rounded-xl bg-accent-theme py-3.5 text-sm font-medium text-white shadow-md transition-all duration-300 hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
              >
                <RotateCcw className='h-5 w-5' />
                계속 읽기
              </button>
            ) : isOnHold ? (
              <button
                type='button'
                onClick={onReread}
                disabled={isTimerProcessing}
                className='flex w-full items-center justify-center gap-2 rounded-xl bg-accent-theme py-3.5 text-sm font-medium text-white shadow-md transition-all duration-300 hover:bg-accent-theme-secondary disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Play className='h-5 w-5' />
                다시 읽기
              </button>
            ) : (
              <button
                type='button'
                onClick={onStop}
                disabled={isTimerProcessing}
                className='flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/95 py-3.5 text-sm font-medium text-white shadow-md shadow-red-500/20 transition-all duration-300 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Pause className='h-5 w-5' />
                {isTimerProcessing ? "정지 중..." : "독서 정지"}
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
