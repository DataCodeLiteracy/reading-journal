"use client"

import { useState, useRef, useEffect } from "react"
import { X, Upload, FileJson, AlertCircle } from "lucide-react"
import { ReadingContentPackService } from "@/services/readingContentPackService"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import type { ReadingExcerptSummaryJson } from "@/types/readingContent"

interface ReadingExcerptUploadModalProps {
  isOpen: boolean
  onClose: () => void
  bookTitle: string
  userId: string
  onSuccess: () => void
}

export default function ReadingExcerptUploadModal({
  isOpen,
  onClose,
  bookTitle,
  userId,
  onSuccess,
}: ReadingExcerptUploadModalProps) {
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setJsonText("")
      setError(null)
    }
  }, [isOpen])

  useBodyScrollLock(isOpen)

  const handleUpload = async () => {
    setError(null)
    if (!jsonText.trim()) {
      setError("JSON을 입력하거나 파일을 선택해 주세요.")
      return
    }
    try {
      const parsed = JSON.parse(jsonText) as unknown
      if (!ReadingContentPackService.validateExcerptJson(parsed)) {
        setError("발췌 요약 JSON 형식이 올바르지 않습니다. book_metadata, chapter_summaries를 확인해 주세요.")
        return
      }
      setIsUploading(true)
      await ReadingContentPackService.upsertExcerptJson(
        bookTitle,
        parsed as ReadingExcerptSummaryJson,
        userId
      )
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했습니다.")
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden overscroll-none bg-theme-backdrop p-4">
      <div className="modal-dialog-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-theme-primary">발췌 요약 JSON 등록</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-theme-tertiary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-theme-secondary mb-3">
          <strong>{bookTitle}</strong> · overall_summary는 독서 리뷰 AI 비교에 사용됩니다.
          chapter_summaries의 page_estimate는 텍스트 추출 한계로 부정확할 수 있어, 등록·표시·채점 모두에서
          의미를 두지 않아도 됩니다.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const reader = new FileReader()
            reader.onload = () => setJsonText(String(reader.result || ""))
            reader.readAsText(f)
          }}
        />
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-theme-tertiary rounded-lg hover:bg-theme-tertiary"
          >
            <FileJson className="h-4 w-4" /> 파일
          </button>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full h-48 text-sm font-mono border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
          placeholder='{ "book_metadata": {...}, "chapter_summaries": [...] }'
        />
        {error && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-theme-tertiary rounded-lg">
            취소
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={handleUpload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-theme text-white rounded-lg disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "저장 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  )
}
