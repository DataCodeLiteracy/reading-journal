"use client"

import { Loader2 } from "lucide-react"

interface RecordListLoadingProps {
  message?: string
  /** 페이지 타입에 맞는 메시지 사용 시 전달 */
  variant?: "auth" | "quotes" | "questions" | "reviews" | "critiques"
}

const variantMessages: Record<NonNullable<RecordListLoadingProps["variant"]>, string> = {
  auth: "로딩 중",
  quotes: "구절 기록을 불러오는 중",
  questions: "독서 질문을 불러오는 중",
  reviews: "리뷰를 불러오는 중",
  critiques: "서평을 불러오는 중",
}

export default function RecordListLoading({
  message,
  variant = "auth",
}: RecordListLoadingProps) {
  const displayMessage = message ?? variantMessages[variant]

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      aria-live='polite'
      aria-busy='true'
    >
      {/* 백드롭 */}
      <div
        className='absolute inset-0 animate-record-loading-in'
        style={{ backgroundColor: "var(--backdrop-color)" }}
      />

      {/* 로딩 카드 */}
      <div className='relative flex flex-col items-center gap-4 rounded-2xl bg-theme-primary px-8 py-8 shadow-lg border border-card animate-record-loading-card-in'>
        <div className='flex h-14 w-14 items-center justify-center'>
          <Loader2
            className='h-10 w-10 text-accent-theme animate-spin'
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <p className='text-theme-primary font-medium text-center max-w-[260px]'>
          {displayMessage}
          <span className='inline-flex gap-0.5 ml-0.5'>
            <span className='animate-bounce' style={{ animationDelay: "0ms", animationDuration: "1s" }}>.</span>
            <span className='animate-bounce' style={{ animationDelay: "150ms", animationDuration: "1s" }}>.</span>
            <span className='animate-bounce' style={{ animationDelay: "300ms", animationDuration: "1s" }}>.</span>
          </span>
        </p>
      </div>
    </div>
  )
}
