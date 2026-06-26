"use client"

import { BookOpen, X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

type SameEditionLinkModalProps = {
  isOpen: boolean
  title: string
  publisher?: string
  registrantCount?: number
  onConfirmSame: () => void
  onConfirmDifferent: () => void
  onClose: () => void
  busy?: boolean
}

export default function SameEditionLinkModal({
  isOpen,
  title,
  publisher,
  registrantCount,
  onConfirmSame,
  onConfirmDifferent,
  onClose,
  busy = false,
}: SameEditionLinkModalProps) {
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
        onClick={busy ? undefined : onClose}
      />
      <div className="modal-form-shell modal-dialog-surface relative z-10 min-w-0 max-w-md rounded-xl p-6 pt-5">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute right-4 top-4 rounded-md p-1 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary disabled:opacity-50"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme/15">
              <BookOpen className="h-5 w-5 accent-theme-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-snug text-theme-primary">
                이미 등록된 책과 같나요?
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-theme-secondary">
            {editionLabel}과(와) 같은 제목·출판사로 등록된 책이
            {registrantCount && registrantCount > 0
              ? ` ${registrantCount}명의 `
              : " 다른 "}
            독자 서재에 있습니다. 같은 책이면 목차·이해도 점검·발췌 등 공유
            자료를 함께 볼 수 있습니다. 다른 판본이면 «다른 책»을 선택해 주세요.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onConfirmDifferent}
            disabled={busy}
            className="rounded-md bg-theme-tertiary px-4 py-2 text-sm font-medium text-theme-primary disabled:opacity-50"
          >
            다른 책이에요
          </button>
          <button
            type="button"
            onClick={onConfirmSame}
            disabled={busy}
            className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            같은 책이에요
          </button>
        </div>
      </div>
    </div>
  )
}
