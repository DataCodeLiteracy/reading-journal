"use client"

import { useEffect, useState } from "react"
import { Plus, X } from "lucide-react"
import type { Book } from "@/types/book"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

const STATUS_OPTIONS: { value: Book["status"]; label: string }[] = [
  { value: "want-to-read", label: "읽고 싶은 책" },
  { value: "reading", label: "읽는 중" },
  { value: "on-hold", label: "보류" },
]

type ExploreAddBookConfirmModalProps = {
  isOpen: boolean
  title: string
  publisher?: string
  onClose: () => void
  onConfirm: (status: Book["status"]) => void
}

export default function ExploreAddBookConfirmModal({
  isOpen,
  title,
  publisher,
  onClose,
  onConfirm,
}: ExploreAddBookConfirmModalProps) {
  const [status, setStatus] = useState<Book["status"]>("want-to-read")

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (isOpen) setStatus("want-to-read")
  }, [isOpen, title, publisher])

  if (!isOpen) return null

  const editionLabel = publisher?.trim()
    ? `"${title}" (${publisher.trim()})`
    : `"${title}"`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-theme-backdrop"
        aria-hidden
        onClick={onClose}
      />
      <div className="modal-form-shell modal-dialog-surface relative z-10 w-full min-w-0 max-w-md rounded-xl p-6">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2rem] items-center gap-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-theme/20">
            <Plus className="h-6 w-6 text-accent-theme" aria-hidden />
          </div>
          <h3 className="min-w-0 text-lg font-semibold leading-snug text-theme-primary">
            내 책으로 추가
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 w-full whitespace-pre-line text-sm leading-relaxed text-theme-secondary">
          {editionLabel}(을)를 내 서재에 추가할까요?{"\n\n"}
          목차·이해도·발췌·골든벨 등 판본 공유 자료가 함께 연결됩니다.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-theme-tertiary">독서 상태</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {STATUS_OPTIONS.map((opt) => {
              const selected = status === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "border-amber-400 bg-amber-50 font-medium text-amber-950 dark:border-amber-500 dark:bg-amber-500/15 dark:text-amber-100"
                      : "border border-theme-tertiary bg-theme-primary text-theme-secondary hover:border-theme-secondary"
                  }`}
                  aria-pressed={selected}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(status)}
            className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary"
          >
            추가하기
          </button>
        </div>
      </div>
    </div>
  )
}
