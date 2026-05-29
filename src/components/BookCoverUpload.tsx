"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2 } from "lucide-react"
import { uploadBookCover } from "@/services/bookCoverUploadClient"

interface BookCoverUploadProps {
  bookId?: string
  coverUrl: string
  onCoverUrlChange: (url: string) => void
  /** false면 렌더하지 않음 */
  visible: boolean
  hint?: string
}

export default function BookCoverUpload({
  bookId,
  coverUrl,
  onCoverUrlChange,
  visible,
  hint = "알라딘에서 표지를 찾지 못했습니다. 직접 올려 주세요.",
}: BookCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!visible) return null

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
    <div className="rounded-lg border border-dashed border-accent-theme/40 bg-accent-theme/5 p-3">
      <p className="mb-2 text-xs text-theme-secondary">{hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-theme-tertiary">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt="표지 미리보기"
              fill
              className="object-cover"
              sizes="64px"
              unoptimized
            />
          ) : (
            <ImagePlus className="h-8 w-8 text-theme-tertiary" aria-hidden />
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent-theme bg-theme-secondary px-3 py-1.5 text-xs font-medium text-accent-theme hover:bg-accent-theme/10 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            )}
            표지 직접 올리기
          </button>
          <p className="mt-1 text-[11px] text-theme-tertiary">
            JPEG·PNG·WebP·GIF, 최대 5MB
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
