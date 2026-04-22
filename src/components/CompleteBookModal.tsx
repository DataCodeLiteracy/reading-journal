"use client"

import { X, CheckCircle, BookMarked } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

interface CompleteBookModalProps {
  isOpen: boolean
  onClose: () => void
  /** 완독만 처리하고 성공 안내 */
  onCompleteOnly: () => void | Promise<void>
  /** 완독 처리 후 발췌 요약(전체 요약 등) 입력 화면으로 이동 */
  onCompleteAndOpenExcerpt: () => void | Promise<void>
  bookTitle: string
}

export default function CompleteBookModal({
  isOpen,
  onClose,
  onCompleteOnly,
  onCompleteAndOpenExcerpt,
  bookTitle,
}: CompleteBookModalProps) {
  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop'>
      <div className='modal-dialog-surface mx-4 w-full max-w-md rounded-xl p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-theme-primary'>완독 처리</h2>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full p-1 transition-colors hover:bg-theme-tertiary'
            aria-label='닫기'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <div className='mb-6'>
          <div className='mb-3 flex items-center gap-2'>
            <CheckCircle className='h-6 w-6 text-green-500' />
            <span className='font-medium text-theme-primary'>
              완독한 뒤 어떻게 할까요?
            </span>
          </div>
          <p className='text-theme-secondary'>
            <span className='font-medium'>{bookTitle}</span>을(를) 완독한 책으로
            표시합니다.
          </p>
          <p className='mt-2 text-sm text-theme-tertiary'>
            발췌 요약이 있으면 전체 요약·핵심 메시지를 남길 수 있습니다. 타이머는
            비활성화되고 계속 읽기가 가능해집니다.
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <button
            type='button'
            onClick={() => {
              void (async () => {
                await onCompleteAndOpenExcerpt()
              })()
            }}
            className='flex w-full items-center justify-center gap-2 rounded-lg border border-accent-theme/50 bg-accent-theme/10 px-4 py-3 text-sm font-medium text-accent-theme transition-colors hover:bg-accent-theme/20'
          >
            <BookMarked className='h-4 w-4 shrink-0' />
            발췌 요약 입력으로
          </button>
          <button
            type='button'
            onClick={() => {
              void (async () => {
                await onCompleteOnly()
              })()
            }}
            className='w-full rounded-lg bg-green-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-600'
          >
            지금 완독만 처리
          </button>
          <button
            type='button'
            onClick={onClose}
            className='w-full rounded-lg border border-theme-tertiary px-4 py-2.5 text-sm text-theme-primary transition-colors hover:bg-theme-tertiary'
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
