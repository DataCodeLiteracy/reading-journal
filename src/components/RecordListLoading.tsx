"use client"

import {
  SkLine,
  SkeletonBookRow,
  SkeletonPageHeader,
} from "@/components/skeletons"

interface RecordListLoadingProps {
  message?: string
  variant?: "auth" | "quotes" | "questions" | "reviews" | "critiques"
}

const variantMessages: Record<
  NonNullable<RecordListLoadingProps["variant"]>,
  string
> = {
  auth: "로딩 중",
  quotes: "구절 기록을 불러오는 중",
  questions: "독서 질문을 불러오는 중",
  reviews: "리뷰를 불러오는 중",
  critiques: "서평을 불러오는 중",
}

/**
 * 기록 서브페이지·인증 대기: 전체 화면 스켈레톤 (스피너 대신 focus-level 스타일 쉬머)
 */
export default function RecordListLoading({
  message,
  variant = "auth",
}: RecordListLoadingProps) {
  const displayMessage = message ?? variantMessages[variant]

  return (
    <div
      className="fixed inset-0 z-[90] cursor-wait overflow-y-auto bg-theme-gradient pb-24 select-none [&_*]:cursor-wait"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{displayMessage}</span>
      <div className="container mx-auto px-4 py-6">
        <SkeletonPageHeader />
        <div className="mt-2">
          <div className="flex gap-2 rounded-lg border-card bg-theme-secondary p-2">
            <SkLine className="h-9 min-w-0 flex-1" />
            <SkLine className="h-9 w-24 shrink-0" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBookRow key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
