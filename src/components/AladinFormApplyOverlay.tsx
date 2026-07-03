"use client"

import { useEffect, useState } from "react"
import { BookOpen, Library, Search, Sparkles, Tag } from "lucide-react"

const APPLY_STEPS = [
  { icon: BookOpen, text: "제목·저자·출판 정보" },
  { icon: Tag, text: "분야·출판일" },
  { icon: Library, text: "표지·ISBN·비고" },
] as const

type Props = {
  active: boolean
  /** search: API 조회, apply: 폼 필드 반영 대기 */
  phase?: "search" | "apply"
}

export default function AladinFormApplyOverlay({
  active,
  phase = "apply",
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!active || phase !== "apply") {
      setStepIndex(0)
      return
    }
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % APPLY_STEPS.length)
    }, 1200)
    return () => window.clearInterval(id)
  }, [active, phase])

  if (!active) return null

  const step = APPLY_STEPS[stepIndex]
  const StepIcon = step.icon
  const isSearch = phase === "search"

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-theme-secondary/92 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-accent-theme/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex h-16 w-16 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-accent-theme/25 border-t-accent-theme animate-spin"
          style={{ animationDuration: "1s" }}
          aria-hidden
        />
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-theme/15">
          {isSearch ? (
            <Search className="h-5 w-5 text-accent-theme animate-pulse" aria-hidden />
          ) : (
            <BookOpen
              className="h-5 w-5 text-accent-theme animate-[reading-timer-breathe_2s_ease-in-out_infinite]"
              aria-hidden
            />
          )}
        </div>
        <Sparkles
          className="absolute -right-0.5 -top-0.5 h-4 w-4 text-amber-500 animate-[reading-timer-twinkle_1.6s_ease-in-out_infinite]"
          aria-hidden
        />
      </div>

      <p className="text-base font-semibold text-theme-primary">
        {isSearch ? "알라딘에서 검색 중" : "알라딘 정보 반영 중"}
      </p>
      <p className="max-w-xs text-center text-xs leading-relaxed text-theme-secondary">
        {isSearch
          ? "도서 정보를 불러오는 동안 입력을 잠시 멈춥니다."
          : "모든 필드 입력이 끝날 때까지 잠시만 기다려 주세요."}
      </p>

      {!isSearch && (
        <>
          <div
            key={stepIndex}
            className="flex items-center gap-2 text-sm text-theme-secondary animate-[recordLoadingIn_0.3s_ease-out_both]"
          >
            <StepIcon className="h-4 w-4 shrink-0 text-accent-theme" />
            <span>{step.text}</span>
          </div>
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-theme-tertiary/60">
            <div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-accent-theme to-amber-400 animate-[explore-add-progress_1.2s_ease-in-out_infinite]"
              aria-hidden
            />
          </div>
        </>
      )}
    </div>
  )
}
