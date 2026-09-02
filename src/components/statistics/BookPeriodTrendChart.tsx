"use client"

type TrendRow = {
  label: string
  registered: number
  completed: number
  reading: number
}

type Props = {
  rows: TrendRow[]
}

export default function BookPeriodTrendChart({ rows }: Props) {
  if (rows.length === 0) return null

  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.registered, r.completed, r.reading]),
  )

  return (
    <div className="rounded-xl border border-theme-tertiary/40 bg-theme-secondary p-4">
      <h3 className="mb-1 text-sm font-semibold text-theme-primary">
        기간별 추이
      </h3>
      <p className="mb-4 text-xs text-theme-secondary">
        최근 {rows.length}개 기간 · 등록 / 완독 / 읽는 중
      </p>
      <div className="flex items-end justify-between gap-1 sm:gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-24 w-full items-end justify-center gap-0.5">
              <Bar
                value={row.registered}
                max={max}
                className="bg-sky-500/80"
                title={`등록 ${row.registered}`}
              />
              <Bar
                value={row.completed}
                max={max}
                className="bg-emerald-500/80"
                title={`완독 ${row.completed}`}
              />
              <Bar
                value={row.reading}
                max={max}
                className="bg-amber-500/80"
                title={`읽는 중 ${row.reading}`}
              />
            </div>
            <span className="max-w-full truncate text-[10px] text-theme-tertiary">
              {row.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[10px] text-theme-secondary">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-sky-500/80" /> 등록
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-500/80" /> 완독
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-500/80" /> 읽는 중
        </span>
      </div>
    </div>
  )
}

function Bar({
  value,
  max,
  className,
  title,
}: {
  value: number
  max: number
  className: string
  title: string
}) {
  const h = value === 0 ? 2 : Math.max(8, Math.round((value / max) * 100))
  return (
    <div
      className={`w-2 rounded-t sm:w-2.5 ${className}`}
      style={{ height: `${h}%` }}
      title={title}
      aria-label={title}
    />
  )
}
