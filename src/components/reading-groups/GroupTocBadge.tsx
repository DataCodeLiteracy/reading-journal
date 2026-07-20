"use client"

import { ListTree } from "lucide-react"

type Props = {
  onOpenAction: () => void
  className?: string
}

/** 등록된 목차가 있을 때만 노출 — 클릭 시 목차 보기 */
export default function GroupTocBadge({ onOpenAction, className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpenAction()
      }}
      className={`inline-flex w-full items-center justify-center gap-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/12 px-1 py-1 text-center text-[10px] font-semibold leading-tight text-emerald-700 shadow-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 active:scale-[0.98] dark:text-emerald-300 ${className}`}
      aria-label="목차 보기"
    >
      <ListTree className="h-3 w-3 shrink-0" aria-hidden />
      <span>목차</span>
    </button>
  )
}
