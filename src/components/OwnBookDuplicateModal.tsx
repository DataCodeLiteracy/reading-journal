"use client"

import { AlertCircle, X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

type OwnBookDuplicateModalProps = {
  isOpen: boolean
  onClose: () => void
  /** 표시용 원문 제목 (입력값) */
  title: string
}

/** 내 서재에 이미 같은 제목이 있을 때 단일 확인 버튼 모달 */
export default function OwnBookDuplicateModal({
  isOpen,
  onClose,
  title,
}: OwnBookDuplicateModalProps) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-theme-backdrop"
        aria-hidden
        onClick={onClose}
      />
      <div className="modal-form-shell modal-dialog-surface relative z-10 min-w-0 rounded-xl p-6 pt-5">
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-snug text-theme-primary">
                같은 제목의 책이 이미 있어요
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-theme-secondary">
            내 서재에 이미「{title}」과(와) 같은 책으로 취급되는 제목이 있습니다. (띄어쓰기
            차이는 같은 제목으로 간주됩니다.) 구분이 필요하면 부제·권수 등 표기를 달리해
            주세요.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-accent-theme px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-theme-secondary"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
