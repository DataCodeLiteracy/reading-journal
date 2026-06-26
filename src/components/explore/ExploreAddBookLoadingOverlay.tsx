"use client"

import { useEffect, useState } from "react"
import { BookOpen, CheckCircle2, Library, Link2, Sparkles } from "lucide-react"

const LOADING_STEPS = [
  { icon: Link2, text: "판본 정보 확인 중" },
  { icon: BookOpen, text: "공유 목차·자료 연결 중" },
  { icon: Library, text: "내 서재에 추가하는 중" },
] as const

type ExploreAddBookLoadingOverlayProps = {
  isOpen: boolean
  phase: "loading" | "success"
  bookTitle: string
  publisher?: string
}

export default function ExploreAddBookLoadingOverlay({
  isOpen,
  phase,
  bookTitle,
  publisher,
}: ExploreAddBookLoadingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!isOpen || phase !== "loading") {
      setStepIndex(0)
      return
    }
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % LOADING_STEPS.length)
    }, 1400)
    return () => window.clearInterval(id)
  }, [isOpen, phase])

  if (!isOpen) return null

  const step = LOADING_STEPS[stepIndex]
  const StepIcon = step.icon
  const editionLabel = publisher?.trim()
    ? `${bookTitle} · ${publisher.trim()}`
    : bookTitle

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4"
      role="dialog"
      aria-live="polite"
      aria-busy={phase === "loading"}
      aria-label={
        phase === "success" ? "내 책으로 추가 완료" : "내 책으로 추가 중"
      }
    >
      <div className="modal-dialog-surface relative w-full max-w-sm overflow-hidden rounded-2xl px-6 py-7 shadow-xl">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-theme/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center text-center">
          {phase === "success" ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 animate-[recordLoadingIn_0.45s_ease-out_both]">
                <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-theme-primary">
                내 서재에 추가했어요
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-theme-secondary">
                {editionLabel}
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full border-2 border-accent-theme/20 border-t-accent-theme animate-spin"
                  style={{ animationDuration: "1.1s" }}
                  aria-hidden
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-theme/15 animate-[recordLoadingIn_0.5s_ease-out_both]">
                  <BookOpen className="h-6 w-6 text-accent-theme animate-[reading-timer-breathe_2s_ease-in-out_infinite]" />
                </div>
                <Sparkles
                  className="absolute -right-1 -top-1 h-4 w-4 text-amber-500 animate-[reading-timer-twinkle_1.8s_ease-in-out_infinite]"
                  aria-hidden
                />
              </div>

              <p className="text-base font-semibold text-theme-primary">
                내 책으로 등록 중
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-theme-secondary">
                {editionLabel}
              </p>

              <div
                key={stepIndex}
                className="mt-5 flex items-center justify-center gap-2 text-sm text-theme-secondary animate-[recordLoadingIn_0.35s_ease-out_both]"
              >
                <StepIcon className="h-4 w-4 shrink-0 text-accent-theme" />
                <span>{step.text}</span>
                <span className="inline-flex w-5 justify-start" aria-hidden>
                  <span className="animate-[reading-timer-twinkle_1.2s_ease-in-out_infinite]">
                    …
                  </span>
                </span>
              </div>

              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-theme-tertiary/60">
                <div
                  className="h-full w-1/3 rounded-full bg-gradient-to-r from-accent-theme to-violet-500 animate-[explore-add-progress_1.4s_ease-in-out_infinite]"
                  aria-hidden
                />
              </div>

              <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
                {LOADING_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === stepIndex
                        ? "w-5 bg-accent-theme"
                        : "w-1.5 bg-theme-tertiary"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
