"use client"

import { LucideIcon, X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText: string
  cancelText?: string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  confirmButtonColor?: string
  confirmButtonHoverColor?: string
  /** false면 "이 작업은 되돌릴 수 없습니다." 문구 숨김 */
  showSubtitle?: boolean
  /** 확인 작업 진행 중 — 닫기/취소/재확인 차단 */
  isLoading?: boolean
  /** false면 확인 클릭 시 모달을 닫지 않음 (부모가 완료 후 닫음). 기본 true */
  closeOnConfirm?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = "취소",
  icon: Icon,
  iconColor = "text-red-500",
  iconBgColor = "bg-red-100 dark:bg-red-900/20",
  confirmButtonColor = "bg-red-500",
  confirmButtonHoverColor = "hover:bg-red-600",
  showSubtitle = true,
  isLoading = false,
  closeOnConfirm = true,
}: ConfirmModalProps) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  const handleClose = () => {
    if (isLoading) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-theme-backdrop"
        aria-hidden
        onClick={handleClose}
      />
      <div
        className="modal-form-shell modal-dialog-surface relative z-10 min-w-0 rounded-xl p-6 pt-5"
        aria-busy={isLoading || undefined}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-md p-1 text-theme-secondary transition-colors hover:bg-theme-tertiary hover:text-theme-primary disabled:pointer-events-none disabled:opacity-40"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBgColor}`}
            >
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <h3 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-theme-primary">
              {title}
            </h3>
          </div>
          <div className="mt-3 space-y-1.5">
            {showSubtitle && (
              <p className="text-sm text-theme-secondary">
                이 작업은 되돌릴 수 없습니다.
              </p>
            )}
            <p className="whitespace-pre-line text-sm leading-relaxed text-theme-secondary">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary disabled:pointer-events-none disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (isLoading) return
              onConfirm()
              if (closeOnConfirm) onClose()
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-70 ${confirmButtonColor} ${isLoading ? "" : confirmButtonHoverColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
