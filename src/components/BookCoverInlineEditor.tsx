"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { BookOpen, Loader2, Pencil } from "lucide-react"
import { uploadBookCover } from "@/services/bookCoverUploadClient"
import { coverPreviewCaption } from "@/utils/coverUrlSource"

type Props = {
  bookId?: string
  coverUrl: string
  onCoverUrlChange: (url: string) => void
  /** 도서 검색 실패 등 짧은 안내 (큰 카드 없이) */
  hint?: string
}

export default function BookCoverInlineEditor({
  bookId,
  coverUrl,
  onCoverUrlChange,
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadBookCover(file, bookId)
      onCoverUrlChange(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했습니다.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-theme-primary">
        표지
      </label>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-16 shrink-0">
          <div className="relative h-full w-full overflow-hidden rounded-md bg-theme-tertiary shadow-sm">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt="표지"
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-8 w-8 text-theme-tertiary" aria-hidden />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-theme-backdrop/60">
                <Loader2
                  className="h-5 w-5 animate-spin text-theme-primary"
                  aria-hidden
                />
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-theme-tertiary bg-theme-secondary text-theme-primary shadow-sm hover:bg-accent-theme hover:text-white disabled:opacity-50"
            aria-label="표지 변경"
            title="표지 변경"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-xs text-theme-secondary">
            {coverUrl
              ? coverPreviewCaption(coverUrl)
              : "표지가 없습니다. 연필 버튼으로 올려 주세요."}
          </p>
          <p className="mt-1 text-[11px] text-theme-tertiary">
            JPEG·PNG·WebP·GIF, 최대 5MB
          </p>
        </div>
      </div>
      {hint && !coverUrl && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
