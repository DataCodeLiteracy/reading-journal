"use client"

import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { navigateBackSmart } from "@/utils/navigateBack"

export type BookSubpageHeaderProps = {
  /** 뒤로 옆에 보이는 페이지 이름 (예: 발췌 요약, 기록) */
  pageTitle: string
  /** 보통 책 제목 */
  contextTitle?: string
  /** return·history 모두 없을 때 이동할 경로 (예: `/book/id/userId`) */
  fallbackPath: string
  /** 목차 아이콘 등, 뒤로 버튼과 제목 사이 */
  leading?: ReactNode
  /** 제목 줄 오른쪽 (추가 버튼 등) */
  trailing?: ReactNode
  className?: string
}

export function BookSubpageHeader({
  pageTitle,
  contextTitle,
  fallbackPath,
  leading,
  trailing,
  className = "mb-6",
}: BookSubpageHeaderProps) {
  const router = useRouter()
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type='button'
        onClick={() => navigateBackSmart(router, fallbackPath)}
        className='shrink-0 rounded-full bg-theme-secondary p-2 shadow-sm transition-shadow hover:shadow-md'
        aria-label='뒤로'
      >
        <ArrowLeft className='h-5 w-5 text-theme-secondary' />
      </button>
      {leading ? (
        <div className='flex shrink-0 items-center'>{leading}</div>
      ) : null}
      <div className='min-w-0 flex-1'>
        <h1 className='truncate text-lg font-semibold text-theme-primary'>
          {pageTitle}
        </h1>
        {contextTitle ? (
          <p className='mt-0.5 truncate text-sm text-theme-secondary'>
            {contextTitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className='flex shrink-0 items-center'>{trailing}</div> : null}
    </div>
  )
}
