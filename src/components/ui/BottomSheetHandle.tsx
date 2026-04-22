"use client"

type BottomSheetHandleProps = {
  className?: string
}

/** 하단 시트 상단 드래그 핸들(가로 막대) — 시트 배경 위에서 또렷하게 보이도록 */
export function BottomSheetHandle({ className }: BottomSheetHandleProps) {
  return (
    <div
      className={`mx-auto h-[5px] w-[52px] shrink-0 rounded-full bg-black/[0.14] dark:bg-white/[0.28] ${className ?? "mb-4"}`}
      aria-hidden
    />
  )
}
