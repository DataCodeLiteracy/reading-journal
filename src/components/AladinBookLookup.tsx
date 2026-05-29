"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2, Search, BookOpen } from "lucide-react"
import {
  lookupAladinBookMetadata,
  searchAladinByTitle,
} from "@/services/aladinClientService"
import type { AladinBookMetadata, AladinSearchHit } from "@/types/aladin"

export type AladinFormApplyPayload = AladinBookMetadata

interface AladinBookLookupProps {
  title: string
  disabled?: boolean
  onApply: (metadata: AladinFormApplyPayload) => void
  /** 알라딘 조회 후 표지 URL이 없을 때 (또는 검색 결과 없음) */
  onAladinCoverMissing?: () => void
}

export default function AladinBookLookup({
  title,
  disabled,
  onApply,
  onAladinCoverMissing,
}: AladinBookLookupProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<AladinSearchHit[] | null>(null)

  const clearCandidates = () => setCandidates(null)

  const applyMetadata = async (hit: AladinSearchHit) => {
    setLoading(true)
    setError(null)
    try {
      const metadata = await lookupAladinBookMetadata(hit)
      onApply(metadata)
      if (!metadata.coverUrl?.trim()) {
        onAladinCoverMissing?.()
      }
      setCandidates(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "알라딘 조회에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    const q = title.trim()
    if (!q) {
      setError("제목을 먼저 입력해 주세요.")
      return
    }
    setLoading(true)
    setError(null)
    setCandidates(null)
    try {
      const items = await searchAladinByTitle(q)
      if (items.length === 0) {
        setError("알라딘에서 일치하는 도서를 찾지 못했습니다.")
        onAladinCoverMissing?.()
        return
      }
      if (items.length === 1) {
        await applyMetadata(items[0])
        return
      }
      setCandidates(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "알라딘 검색에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-theme-tertiary/60 bg-theme-tertiary/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || loading || !title.trim()}
          onClick={handleSearch}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-theme px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Search className="h-3.5 w-3.5" aria-hidden />
          )}
          알라딘에서 불러오기
        </button>
        <span className="text-xs text-theme-tertiary">
          제목·저자·출판사·출판일·분야·표지
        </span>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {candidates && candidates.length > 0 && (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {candidates.map((hit, idx) => (
            <li key={`${hit.isbn13 ?? hit.title}-${idx}`}>
              <button
                type="button"
                disabled={loading}
                onClick={() => applyMetadata(hit)}
                className="flex w-full gap-2 rounded-md border border-theme-tertiary/50 bg-theme-secondary p-2 text-left hover:border-accent-theme/50 transition-colors"
              >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-theme-tertiary">
                  {hit.coverUrl ? (
                    <Image
                      src={hit.coverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="h-5 w-5 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-theme-primary line-clamp-2">
                    {hit.title}
                  </p>
                  <p className="text-xs text-theme-secondary truncate">
                    {hit.author || "저자 미상"}
                    {hit.publisher ? ` · ${hit.publisher}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
