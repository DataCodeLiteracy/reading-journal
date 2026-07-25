"use client"

import { X, CheckCircle } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** 단순 한 줄 메시지 (bookTitle/lines 없을 때) */
  message?: string
  /** 책 제목 — 본문 첫 줄에 강조 */
  bookTitle?: string
  /** 책 제목 아래 줄바꿈 문장들 */
  lines?: string[]
  icon?: React.ReactNode
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  bookTitle,
  lines,
  icon,
}: SuccessModalProps) {
  useBodyScrollLock(isOpen)
  if (!isOpen) return null

  const hasStructured = Boolean(bookTitle || (lines && lines.length > 0))

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop'>
      <div className='modal-dialog-surface w-full max-w-md rounded-xl p-6 mx-4'>
        <div className='flex items-start justify-between gap-3 mb-4'>
          <div className='flex min-w-0 items-center gap-2'>
            {icon || (
              <CheckCircle className='h-5 w-5 shrink-0 text-green-500' />
            )}
            <h2 className='text-lg font-semibold text-theme-primary'>{title}</h2>
          </div>
          <button
            onClick={onClose}
            className='shrink-0 p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <div className='mb-6 w-full space-y-2'>
          {hasStructured ? (
            <>
              {bookTitle && (
                <p className='w-full text-base font-semibold leading-snug text-theme-primary break-words'>
                  {bookTitle}
                </p>
              )}
              {lines?.map((line) => (
                <p
                  key={line}
                  className='w-full text-sm leading-relaxed text-theme-secondary'
                >
                  {line}
                </p>
              ))}
            </>
          ) : (
            message && (
              <p className='w-full text-sm leading-relaxed text-theme-primary'>
                {message}
              </p>
            )
          )}
        </div>

        <div className='flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-accent-theme text-white rounded-md hover:bg-accent-theme-secondary transition-colors'
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
