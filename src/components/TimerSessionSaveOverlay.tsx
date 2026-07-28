"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Cloud, Link2, Save, Sparkles, Timer } from "lucide-react"

const SAVE_STEPS = [
  { icon: Save, text: "독서 기록 저장 중" },
  { icon: Link2, text: "연동 앱에 동기화 중" },
  { icon: Cloud, text: "모임·자녀 기록 정리 중" },
] as const

type Props = {
  open: boolean
  elapsedLabel?: string
}

/**
 * 타이머 종료 직후~저장 완료까지 화면 중앙에 보여주는 저장 오버레이.
 * 클릭 시점의 시간은 이미 고정된 상태이며, 저장 대기 중 지루함을 줄이기 위한 UI입니다.
 */
export default function TimerSessionSaveOverlay({ open, elapsedLabel }: Props) {
  const [mounted, setMounted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
      return
    }
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % SAVE_STEPS.length)
    }, 1600)
    return () => window.clearInterval(id)
  }, [open])

  if (!mounted || !open) return null

  const step = SAVE_STEPS[stepIndex]
  const StepIcon = step.icon

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden overscroll-none bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-busy="true"
      aria-label="독서 기록 저장 중"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#121826]/95 px-6 py-8 text-center shadow-2xl">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center">
          <div className="relative mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center">
            <span
              className="absolute inset-0 rounded-full border-2 border-amber-200/20 border-t-amber-300 animate-spin"
              style={{ animationDuration: "1s" }}
              aria-hidden
            />
            <span
              className="absolute inset-1.5 rounded-full border border-sky-300/15 border-b-sky-300/70 animate-spin"
              style={{ animationDuration: "1.8s", animationDirection: "reverse" }}
              aria-hidden
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 animate-[recordLoadingIn_0.5s_ease-out_both]">
              <Timer className="h-6 w-6 text-amber-200 animate-[reading-timer-breathe_2s_ease-in-out_infinite]" />
            </div>
            <Sparkles
              className="absolute -right-0.5 -top-0.5 h-4 w-4 text-amber-300 animate-[reading-timer-twinkle_1.6s_ease-in-out_infinite]"
              aria-hidden
            />
          </div>

          <p className="text-base font-semibold text-white">
            독서 기록을 저장하고 있어요
          </p>
          <p className="mt-1.5 max-w-[16rem] text-center text-sm leading-relaxed text-white/75">
            연동된 앱에도 함께 저장중이에요.
            <br />
            잠시만..
          </p>

          {elapsedLabel ? (
            <p className="mt-3 font-mono text-sm tabular-nums text-amber-100/90">
              기록 시간 {elapsedLabel}
            </p>
          ) : null}

          <div
            key={stepIndex}
            className="mt-5 flex items-center justify-center gap-2 text-sm text-white/80 animate-[recordLoadingIn_0.35s_ease-out_both]"
          >
            <StepIcon className="h-4 w-4 shrink-0 text-amber-200" />
            <span>{step.text}</span>
            <span className="inline-flex w-5 justify-start" aria-hidden>
              <span className="animate-[reading-timer-twinkle_1.2s_ease-in-out_infinite]">
                …
              </span>
            </span>
          </div>

          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-300 via-sky-300 to-amber-200 animate-[explore-add-progress_1.4s_ease-in-out_infinite]"
              aria-hidden
            />
          </div>

          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {SAVE_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex ? "w-5 bg-amber-300" : "w-1.5 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
