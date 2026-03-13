"use client"

import { X, BookOpen, Clock, Zap } from "lucide-react"
import { formatReadingTimeFromSeconds } from "@/utils/timeUtils"

export interface DaySummary {
  date: string
  weekday: string
  items: { bookTitle: string; duration: number }[]
}

interface WeeklyRecapModalProps {
  isOpen: boolean
  onClose: () => void
  weekLabel: string
  daySummaries: DaySummary[]
  totalSeconds: number
  goalHours: number
  goalMet: boolean
  bonusExp: number | null
}

export default function WeeklyRecapModal({
  isOpen,
  onClose,
  weekLabel,
  daySummaries,
  totalSeconds,
  goalHours,
  goalMet,
  bonusExp,
}: WeeklyRecapModalProps) {
  if (!isOpen) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50'
      role='dialog'
      aria-modal='true'
      aria-labelledby='weekly-recap-title'
    >
      <div className='w-full max-w-md max-h-[70vh] flex flex-col rounded-xl bg-theme-secondary shadow-lg border border-theme-tertiary'>
        <div className='flex items-center justify-between p-3 border-b border-theme-tertiary flex-shrink-0'>
          <h2 id='weekly-recap-title' className='text-lg font-bold text-theme-primary'>
            지난주 독서 요약
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='p-1.5 rounded-lg text-theme-tertiary hover:bg-theme-tertiary/50 hover:text-theme-primary transition-colors'
            aria-label='닫기'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-3 space-y-3'>
          <p className='text-sm text-theme-secondary'>
            <Clock className='h-4 w-4 inline-block mr-1 align-middle' />
            {weekLabel} (월~일)
          </p>

          {daySummaries.length === 0 ? (
            <p className='text-sm text-theme-tertiary py-3'>이번 주 기록된 독서가 없습니다.</p>
          ) : (
            <ul className='space-y-2'>
              {daySummaries.map((day) => (
                <li key={day.date} className='rounded-lg bg-theme-primary/50 p-2'>
                  <p className='text-xs font-medium text-theme-tertiary mb-1'>
                    {day.weekday} {day.date.slice(5).replace("-", "/")}
                  </p>
                  <ul className='space-y-1'>
                    {day.items.map((item, i) => (
                      <li
                        key={`${day.date}-${item.bookTitle}-${i}`}
                        className='flex items-center justify-between text-sm'
                      >
                        <span className='flex items-center gap-1.5 text-theme-primary min-w-0'>
                          <BookOpen className='h-3.5 w-3.5 text-accent-theme flex-shrink-0' />
                          <span className='truncate'>{item.bookTitle}</span>
                        </span>
                        <span className='text-theme-secondary flex-shrink-0 ml-2'>
                          {formatReadingTimeFromSeconds(item.duration)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          <div className='pt-2 border-t border-theme-tertiary'>
            <div className='flex items-center justify-between text-base font-semibold text-theme-primary'>
              <span>총 독서 시간</span>
              <span className='text-accent-theme'>{formatReadingTimeFromSeconds(totalSeconds)}</span>
            </div>
            <p className='text-xs text-theme-tertiary mt-0.5'>
              주간 목표 {goalHours}시간 {goalMet ? "달성" : "미달성"}
            </p>
            {goalMet && bonusExp != null && (
              <div className='mt-1.5 flex items-center gap-2 rounded-lg bg-accent-theme/10 px-2.5 py-1.5 text-sm text-accent-theme'>
                <Zap className='h-4 w-4 flex-shrink-0' />
                <span>
                  목표 달성 보너스 <strong>+{bonusExp} EXP</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className='p-3 border-t border-theme-tertiary flex-shrink-0'>
          <button
            type='button'
            onClick={onClose}
            className='w-full py-2.5 rounded-lg bg-accent-theme text-white font-medium hover:bg-accent-theme-secondary transition-colors'
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
