"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

type Props = {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  headerAction?: ReactNode
  children: ReactNode
}

export default function StatisticsPageShell({
  title,
  description,
  backHref = "/mypage/statistics",
  backLabel = "통계 허브",
  headerAction,
  children,
}: Props) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-theme-gradient pb-20">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="mb-4 flex items-center gap-2 text-theme-secondary transition-colors hover:text-theme-primary"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            {backLabel}
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-theme-primary sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1.5 text-sm text-theme-secondary">
                  {description}
                </p>
              )}
            </div>
            {headerAction}
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
