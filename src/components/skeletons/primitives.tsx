import type { ReactNode } from "react"

/** 3-depth 중첩 + 최내부 세로 바 스윕 (focus-level) */
export function SkLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`sk-depth-1 overflow-hidden rounded-md ${className}`}
      aria-hidden
    >
      <div className="sk-depth-2 h-full min-h-[2px]">
        <div className="sk-depth-3 h-full min-h-[2px]" />
      </div>
    </div>
  )
}

export function SkCircle({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div
      className={`sk-depth-1 overflow-hidden rounded-full ${className}`}
      aria-hidden
    >
      <div className="sk-depth-2 h-full min-h-0">
        <div className="sk-depth-3 h-full min-h-0" />
      </div>
    </div>
  )
}

export function SkCard({
  children,
  className = "",
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`sk-depth-1 overflow-hidden rounded-xl p-0 shadow-none ${className}`}
      aria-hidden
    >
      <div className="sk-depth-2 min-h-[2.5rem] p-1">
        <div className="sk-depth-3 p-4">{children}</div>
      </div>
    </div>
  )
}
