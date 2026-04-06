import { SkCard, SkCircle, SkLine } from "./primitives"

type ShellProps = {
  children: React.ReactNode
  className?: string
}

/** 라우트 전체: 그라데이션·하단 탭 여백·대기 커서 */
export function ShellSkeleton({ children, className = "" }: ShellProps) {
  return (
    <div
      className={`min-h-screen cursor-wait select-none bg-theme-gradient pb-24 [&_*]:cursor-wait ${className}`}
      aria-busy="true"
      aria-label="불러오는 중"
    >
      <div className="container mx-auto px-4 py-6">{children}</div>
    </div>
  )
}

export function SkeletonPageHeader() {
  return (
    <header className="mb-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <SkLine className="h-9 w-44 sm:w-56" />
        <SkLine className="h-9 w-28 rounded-lg" />
      </div>
      <SkLine className="h-4 w-full max-w-md" />
    </header>
  )
}

/** 책 목록 한 줄 (표지 + 텍스트) */
export function SkeletonBookRow() {
  return (
    <div className="flex gap-3 rounded-lg border-card bg-theme-secondary p-4 shadow-sm">
      <SkLine className="h-16 w-12 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkLine className="h-5 w-[72%] max-w-sm" />
        <SkLine className="h-3.5 w-40" />
        <SkLine className="h-3 w-full max-w-xs" />
      </div>
    </div>
  )
}

/** 탐색 결과 카드 (접기 헤더 느낌) */
export function SkeletonExploreCard() {
  return (
    <div className="overflow-hidden rounded-lg border-card bg-theme-secondary shadow-sm">
      <div className="flex gap-3 p-4">
        <SkLine className="h-16 w-12 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkLine className="h-5 w-[80%]" />
          <SkLine className="h-3.5 w-1/2 max-w-[200px]" />
          <div className="flex flex-wrap gap-2">
            <SkLine className="h-3 w-20 rounded-full" />
            <SkLine className="h-3 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 리더보드 행 */
export function SkeletonLeaderboardRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg border-card bg-theme-primary px-3 py-2.5">
      <SkCircle className="h-9 w-9" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkLine className="h-3.5 w-32" />
        <SkLine className="h-3 w-24" />
      </div>
      <SkLine className="h-6 w-14 shrink-0 rounded-md" />
    </div>
  )
}

/** 댓글/스레드 줄 */
export function SkeletonCommentRow() {
  return (
    <div className="space-y-2 rounded-lg bg-theme-tertiary p-3">
      <div className="flex items-center gap-2">
        <SkCircle className="h-8 w-8" />
        <SkLine className="h-3.5 w-28" />
      </div>
      <SkLine className="h-3 w-full" />
      <SkLine className="h-3 w-[92%]" />
    </div>
  )
}

/** 범용: 헤더 + 책형 목록 */
export function GenericRouteSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ShellSkeleton>
      <SkeletonPageHeader />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBookRow key={i} />
        ))}
      </div>
    </ShellSkeleton>
  )
}

/** 홈: 통계 타일 + 주간 카드 + 최근 책 */
export function HomePageSkeleton() {
  return (
    <ShellSkeleton>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <SkLine className="h-10 w-52 max-w-full" />
          <SkLine className="h-4 w-64 max-w-full" />
        </div>
        <SkLine className="h-9 w-32 shrink-0 rounded-lg" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkCard key={i} className="space-y-2">
            <SkLine className="h-3 w-16" />
            <SkLine className="h-8 w-10" />
          </SkCard>
        ))}
      </div>
      <SkCard className="mb-6 space-y-3">
        <div className="flex gap-3">
          <SkLine className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkLine className="h-4 w-36" />
            <SkLine className="h-3 w-48" />
          </div>
        </div>
        <SkLine className="h-14 w-full rounded-lg" />
        <SkLine className="h-2.5 w-full rounded-full" />
      </SkCard>
      <SkLine className="mb-3 h-6 w-40" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBookRow key={i} />
        ))}
      </div>
    </ShellSkeleton>
  )
}

/** 책 상세 */
export function BookDetailRouteSkeleton() {
  return (
    <ShellSkeleton>
      <SkLine className="mb-4 h-4 w-28" />
      <SkCard>
        <div className="flex flex-col gap-4 sm:flex-row">
          <SkLine className="mx-auto h-44 w-32 shrink-0 rounded-lg sm:mx-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkLine className="h-9 w-full max-w-lg" />
            <SkLine className="h-4 w-40" />
            <SkLine className="h-4 w-full max-w-md" />
            <div className="flex flex-wrap gap-2 pt-1">
              <SkLine className="h-9 w-24 rounded-lg" />
              <SkLine className="h-9 w-24 rounded-lg" />
              <SkLine className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </SkCard>
      <div className="mt-6 space-y-2">
        <SkLine className="h-11 w-full rounded-lg" />
        <SkLine className="h-11 w-full rounded-lg" />
        <SkLine className="h-24 w-full rounded-lg" />
      </div>
    </ShellSkeleton>
  )
}

/** 기록 허브 4칸 */
export function RecordHubSkeleton() {
  return (
    <ShellSkeleton>
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SkCard key={i} className="flex min-h-[100px] flex-col justify-center space-y-3">
            <SkLine className="h-6 w-12" />
            <SkLine className="h-5 w-3/4 max-w-[200px]" />
            <SkLine className="h-3 w-full max-w-xs" />
          </SkCard>
        ))}
      </div>
    </ShellSkeleton>
  )
}

export function ExploreListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonExploreCard key={i} />
      ))}
    </div>
  )
}

/** 통계 본문(차트·숫자 타일 자리) */
export function StatisticsBodySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
      <SkCard className="space-y-4">
        <SkLine className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg bg-theme-tertiary/40 p-3"
            >
              <SkLine className="mx-auto h-6 w-6 rounded-full" />
              <SkLine className="mx-auto h-3 w-20" />
              <SkLine className="mx-auto h-8 w-16" />
            </div>
          ))}
        </div>
      </SkCard>
      <SkLine className="h-56 w-full rounded-xl sm:h-72" />
      <div className="grid gap-3 sm:grid-cols-2">
        <SkLine className="h-32 rounded-xl" />
        <SkLine className="h-32 rounded-xl" />
      </div>
    </div>
  )
}

export function LeaderboardBlockSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="불러오는 중">
      <SkLine className="mb-3 h-6 w-36" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLeaderboardRow key={i} />
      ))}
    </div>
  )
}

export function CommentThreadSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCommentRow key={i} />
      ))}
    </div>
  )
}

/** 로그인 화면: 세션 확인 중 */
export function LoginAuthSkeleton() {
  return (
    <div
      className="flex min-h-screen cursor-wait select-none items-center justify-center bg-theme-gradient p-4 [&_*]:cursor-wait"
      aria-busy="true"
      aria-label="불러오는 중"
    >
      <div className="w-full max-w-md space-y-4 rounded-xl border-card bg-theme-secondary/90 p-8 shadow-lg">
        <SkLine className="mx-auto h-16 w-16 rounded-full" />
        <SkLine className="mx-auto h-8 w-48" />
        <SkLine className="mx-auto h-3 w-full max-w-xs" />
        <SkLine className="h-12 w-full rounded-lg" />
        <SkLine className="h-11 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function AnswerThreadSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-4" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border-card bg-theme-secondary p-4 space-y-2">
          <SkLine className="h-4 w-3/4" />
          <SkLine className="h-4 w-full" />
          <SkLine className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}
