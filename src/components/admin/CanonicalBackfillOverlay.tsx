"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Database,
  Loader2,
  ScrollText,
  Trophy,
  X,
} from "lucide-react"
import type { CanonicalBackfillScan } from "@/lib/adminCanonicalBackfill"

const RUN_ALL_STEPS = [
  { icon: Database, text: "canonicalBooks 생성 · books 연결" },
  { icon: ScrollText, text: "이해도·발췌 팩 연결" },
  { icon: Trophy, text: "골든벨 퀴즈 연결" },
  { icon: Database, text: "현황 갱신" },
] as const

export type CanonicalBackfillResultSummary = {
  title: string
  lines: string[]
  scan?: CanonicalBackfillScan | null
}

type CanonicalBackfillOverlayProps = {
  isOpen: boolean
  phase: "loading" | "success" | "error"
  loadingLabel: string
  runAll?: boolean
  result?: CanonicalBackfillResultSummary | null
  errorMessage?: string | null
  onClose: () => void
}

export default function CanonicalBackfillOverlay({
  isOpen,
  phase,
  loadingLabel,
  runAll = false,
  result,
  errorMessage,
  onClose,
}: CanonicalBackfillOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!isOpen || phase !== "loading") {
      setStepIndex(0)
      return
    }
    if (!runAll) return
    const id = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, RUN_ALL_STEPS.length - 1))
    }, 2200)
    return () => window.clearInterval(id)
  }, [isOpen, phase, runAll])

  if (!isOpen) return null

  const step = RUN_ALL_STEPS[stepIndex]
  const StepIcon = step?.icon ?? Database

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={
        phase === "loading"
          ? "백필 실행 중"
          : phase === "success"
            ? "백필 완료"
            : "백필 오류"
      }
    >
      <div className="modal-dialog-surface relative w-full max-w-md overflow-hidden rounded-2xl px-6 py-7 shadow-xl">
        {phase !== "loading" && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative flex flex-col items-center text-center">
          {phase === "loading" && (
            <>
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"
                  style={{ animationDuration: "1.1s" }}
                  aria-hidden
                />
                <Loader2
                  className="h-7 w-7 text-indigo-600 dark:text-indigo-400 animate-spin"
                  style={{ animationDuration: "1.4s" }}
                  aria-hidden
                />
              </div>
              <p className="text-base font-semibold text-theme-primary">
                {loadingLabel}
              </p>
              <p className="mt-2 text-sm text-theme-secondary">
                Firestore 데이터를 재구성하고 있습니다.
                <br />
                책 수에 따라 수십 초~수분 걸릴 수 있습니다.
              </p>
              {runAll ? (
                <div
                  key={stepIndex}
                  className="mt-5 flex items-center justify-center gap-2 text-sm text-theme-secondary animate-[recordLoadingIn_0.35s_ease-out_both]"
                >
                  <StepIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span>{step.text}</span>
                </div>
              ) : (
                <p className="mt-5 text-sm text-theme-tertiary">잠시만 기다려 주세요…</p>
              )}
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-theme-tertiary/60">
                <div
                  className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 animate-[explore-add-progress_1.4s_ease-in-out_infinite]"
                  aria-hidden
                />
              </div>
            </>
          )}

          {phase === "success" && result && (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 animate-[recordLoadingIn_0.45s_ease-out_both]">
                <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-theme-primary">
                {result.title}
              </p>
              <ul className="mt-4 w-full space-y-2 text-left text-sm text-theme-secondary">
                {result.lines.map((line) => (
                  <li key={line} className="rounded-lg bg-theme-tertiary/30 px-3 py-2">
                    {line}
                  </li>
                ))}
              </ul>
              {result.scan && (
                <dl className="mt-4 grid w-full grid-cols-2 gap-2 rounded-lg border border-theme-tertiary bg-theme-primary/50 p-3 text-left text-xs">
                  <div>
                    <dt className="text-theme-tertiary">미연결 books</dt>
                    <dd className="font-medium text-theme-primary">
                      {result.scan.booksWithoutCanonical}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-theme-tertiary">canonicalBooks</dt>
                    <dd className="font-medium text-theme-primary">
                      {result.scan.canonicalBooksCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-theme-tertiary">제목만 팩</dt>
                    <dd className="font-medium text-theme-primary">
                      {result.scan.titleOnlyPacks}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-theme-tertiary">골든벨 미연결</dt>
                    <dd className="font-medium text-theme-primary">
                      {result.scan.goldenBellWithoutCanonical}
                    </dd>
                  </div>
                </dl>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                확인
              </button>
            </>
          )}

          {phase === "error" && (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
                <X className="h-9 w-9 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-base font-semibold text-theme-primary">
                백필 실패
              </p>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errorMessage || "알 수 없는 오류가 발생했습니다."}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-theme-secondary px-4 py-2.5 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
              >
                닫기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBackfillResult(
  action: string,
  data: Record<string, unknown>,
): CanonicalBackfillResultSummary {
  const lines: string[] = []

  const canonical = data.canonical as
    | { created?: number; linked?: number; groups?: number }
    | undefined
  const packs = data.packs as
    | { migrated?: number; skipped?: number; merged?: number }
    | undefined
  const goldenBell = data.goldenBell as
    | { updated?: number; skipped?: number }
    | undefined

  if (canonical) {
    lines.push(
      `canonicalBooks: ${canonical.created ?? 0}개 생성, ${canonical.linked ?? 0}권 연결 (${canonical.groups ?? 0}개 판본)`,
    )
  }
  if (packs) {
    lines.push(
      `이해도·발췌 팩: ${packs.migrated ?? 0}개 반영, 병합 ${packs.merged ?? 0}건`,
    )
  }
  if (goldenBell) {
    lines.push(
      `골든벨: ${goldenBell.updated ?? 0}개 연결, ${goldenBell.skipped ?? 0}개 건너뜀`,
    )
  }

  if (action === "backfillCanonical" && canonical) {
    return {
      title: "1단계 백필 완료",
      lines: [lines[0] ?? "처리 완료"],
      scan: (data.scan as CanonicalBackfillScan) ?? null,
    }
  }
  if (action === "backfillPacks" && packs) {
    return {
      title: "2단계 백필 완료",
      lines: [lines[lines.length - 1] ?? "처리 완료"],
      scan: (data.scan as CanonicalBackfillScan) ?? null,
    }
  }
  if (action === "backfillGoldenBell" && goldenBell) {
    return {
      title: "3단계 백필 완료",
      lines: [lines[lines.length - 1] ?? "처리 완료"],
      scan: (data.scan as CanonicalBackfillScan) ?? null,
    }
  }

  return {
    title: "전체 백필 완료",
    lines: lines.length > 0 ? lines : ["모든 단계가 완료되었습니다."],
    scan: (data.scan as CanonicalBackfillScan) ?? null,
  }
}

export { formatBackfillResult }
