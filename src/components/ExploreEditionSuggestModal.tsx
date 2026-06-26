"use client"

import { Compass, X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

type ExploreEditionSuggestModalProps = {
  isOpen: boolean
  title: string
  publisher?: string
  registrantCount?: number
  onGoToExplore: () => void
  onContinueHere: () => void
  onClose: () => void
}

export default function ExploreEditionSuggestModal({
  isOpen,
  title,
  publisher,
  registrantCount,
  onGoToExplore,
  onContinueHere,
  onClose,
}: ExploreEditionSuggestModalProps) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  const editionLabel = publisher?.trim()
    ? `「${title}」(${publisher.trim()})`
    : `「${title}」`

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-theme-backdrop"
        aria-hidden
        onClick={onClose}
      />
      <div className="modal-form-shell modal-dialog-surface relative z-10 min-w-0 max-w-md rounded-xl p-6 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme/15">
              <Compass className="h-5 w-5 accent-theme-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-snug text-theme-primary">
                탐색에 이미 등록된 책이 있어요
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-theme-secondary">
            {editionLabel}과(와) 같은 제목·출판사로
            {registrantCount && registrantCount > 0
              ? ` ${registrantCount}명이 `
              : " 다른 독자가 "}
            이미 등록했습니다. 탐색에서 «내 책으로 추가»로 등록하면 목차·이해도
            점검·발췌·골든벨 등 판본 공유 자료를 함께 쓸 수 있습니다. (독서 질문은
            각자 등록)
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onContinueHere}
            className="rounded-md bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary"
          >
            여기서 계속 등록
          </button>
          <button
            type="button"
            onClick={onGoToExplore}
            className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white"
          >
            탐색으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
