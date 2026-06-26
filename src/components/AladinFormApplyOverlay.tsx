"use client"

import { Loader2 } from "lucide-react"

type Props = {
  active: boolean
}

export default function AladinFormApplyOverlay({ active }: Props) {
  if (!active) return null

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-theme-secondary/90 px-4 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-accent-theme"
        aria-hidden
      />
      <p className="text-sm font-medium text-theme-primary">
        알라딘 정보 반영 중...
      </p>
      <p className="text-center text-xs text-theme-secondary">
        제목·분야·출판일 등 필드 입력이 끝난 뒤 저장할 수 있습니다
      </p>
    </div>
  )
}
