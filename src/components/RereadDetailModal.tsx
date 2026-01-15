"use client"

import { X, Calendar, Clock, BookOpen } from "lucide-react"
import { Reread } from "@/types/reread"

interface RereadDetailModalProps {
  isOpen: boolean
  onClose: () => void
  rereads: Reread[]
  bookTitle: string
}

export default function RereadDetailModal({
  isOpen,
  onClose,
  rereads,
  bookTitle,
}: RereadDetailModalProps) {
  if (!isOpen) return null

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
      <div className='bg-theme-secondary rounded-lg p-6 w-full max-w-md mx-4 shadow-lg max-h-[80vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-theme-primary'>
            회독 기록
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-theme-tertiary transition-colors'
          >
            <X className='h-5 w-5 text-theme-secondary' />
          </button>
        </div>

        <div className='mb-4'>
          <p className='text-sm text-theme-secondary mb-4'>
            <span className='font-medium text-theme-primary'>{bookTitle}</span>의
            회독 기록입니다.
          </p>
        </div>

        {rereads.length === 0 ? (
          <div className='text-center py-8'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-theme-secondary'>회독 기록이 없습니다.</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {rereads.map((reread) => (
              <div
                key={reread.id}
                className='bg-theme-tertiary rounded-lg p-4 border-l-4 border-blue-500'
              >
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm'>
                      {reread.rereadNumber}
                    </div>
                    <span className='font-semibold text-theme-primary'>
                      {reread.rereadNumber}회독
                    </span>
                  </div>
                  {reread.durationDays && (
                    <div className='flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400'>
                      <Clock className='h-4 w-4' />
                      <span>{reread.durationDays}일</span>
                    </div>
                  )}
                </div>

                <div className='space-y-2 text-sm'>
                  <div className='flex items-center gap-2 text-theme-secondary'>
                    <Calendar className='h-4 w-4 text-green-600 dark:text-green-400' />
                    <span>
                      <span className='font-medium'>시작:</span>{" "}
                      {formatDate(reread.startDate)}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 text-theme-secondary'>
                    <Calendar className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                    <span>
                      <span className='font-medium'>완료:</span>{" "}
                      {formatDate(reread.completedDate)}
                    </span>
                  </div>
                  {reread.durationDays && (
                    <div className='flex items-center gap-2 text-theme-secondary pt-1 border-t border-theme-tertiary'>
                      <Clock className='h-4 w-4 text-purple-600 dark:text-purple-400' />
                      <span>
                        <span className='font-medium'>소요:</span>{" "}
                        {reread.durationDays}일
                        <span className='text-xs text-theme-tertiary ml-2'>
                          ({reread.startDate.replace(/-/g, ".")} ~ {reread.completedDate.replace(/-/g, ".")})
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='mt-6 flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-theme-tertiary text-theme-primary rounded-md hover:bg-theme-tertiary/80 transition-colors'
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

