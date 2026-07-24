"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import {
  A4_LINES_PER_PAGE,
  DEFAULT_TRANSCRIPTION_REPETITIONS,
} from "@/utils/transcriptionLayout"
import { unitsFromQuoteText } from "@/utils/transcriptionSentences"
import {
  loadTranscriptionOptions,
  loadTranscriptionSelection,
  type TranscriptionPrintOptions,
  type TranscriptionSelectionItem,
} from "@/utils/transcriptionSelectionStorage"
import "./transcription-print.css"

type PracticeUnit = {
  key: string
  text: string
  bookTitle?: string
  bookAuthor?: string
}

type PageChunk = {
  units: Array<{
    unit: PracticeUnit
    /** 이 페이지에 넣을 줄: guide면 회색 문장, blank면 빈 줄. guide는 블록 시작 시에만 */
    lines: Array<{ kind: "guide" | "blank"; text?: string }>
    showMeta: boolean
  }>
}

function buildUnits(
  selection: TranscriptionSelectionItem[],
  options: TranscriptionPrintOptions,
): PracticeUnit[] {
  const units: PracticeUnit[] = []
  for (const item of selection) {
    const parts = unitsFromQuoteText(item.quoteText, options.unitMode)
    parts.forEach((text, idx) => {
      units.push({
        key: `${item.id}-${idx}`,
        text,
        bookTitle: item.bookTitle,
        bookAuthor: item.bookAuthor,
      })
    })
  }
  return units
}

/**
 * 화면/인쇄용으로 단위를 페이지에 배분.
 * 가이드 문장은 wrap을 고려해 대략 ceil(len/42)줄로 잡고,
 * 빈 줄은 1줄씩. 페이지당 A4_LINES_PER_PAGE 줄.
 */
function paginateUnits(
  units: PracticeUnit[],
  repetitions: number,
): PageChunk[] {
  const blankCount = Math.max(0, repetitions - 1)
  const pages: PageChunk[] = []
  let current: PageChunk = { units: [] }
  let linesUsed = 0

  const flush = () => {
    if (current.units.length > 0) pages.push(current)
    current = { units: [] }
    linesUsed = 0
  }

  const estimateGuideLines = (text: string) =>
    Math.max(1, Math.ceil(text.length / 42))

  for (const unit of units) {
    const guideLines = estimateGuideLines(unit.text)
    const totalLines = guideLines + blankCount

    if (linesUsed > 0 && linesUsed + totalLines > A4_LINES_PER_PAGE) {
      flush()
    }

    // 한 단위가 페이지보다 길면 가이드+빈줄을 여러 페이지로 쪼갬
    let remainingBlanks = blankCount
    let needGuide = true
    let showMeta = true

    while (needGuide || remainingBlanks > 0) {
      const metaLines =
        showMeta && (unit.bookTitle || unit.bookAuthor) ? 1 : 0
      const space = A4_LINES_PER_PAGE - linesUsed - metaLines
      if (space <= 0) {
        flush()
        continue
      }

      const lines: PageChunk["units"][number]["lines"] = []
      let usedNow = metaLines

      if (needGuide) {
        lines.push({ kind: "guide", text: unit.text })
        usedNow += Math.min(guideLines, space)
        needGuide = false
      }

      const blanksFit = Math.min(remainingBlanks, A4_LINES_PER_PAGE - linesUsed - usedNow)
      for (let i = 0; i < blanksFit; i++) {
        lines.push({ kind: "blank" })
      }
      remainingBlanks -= blanksFit
      usedNow += blanksFit

      current.units.push({ unit, lines, showMeta })
      showMeta = false
      linesUsed += usedNow

      if (needGuide || remainingBlanks > 0) {
        flush()
      }
    }
  }

  flush()
  return pages.length > 0 ? pages : [{ units: [] }]
}

export default function TranscriptionPrintPage() {
  const router = useRouter()
  const [selection, setSelection] = useState<TranscriptionSelectionItem[]>([])
  const [options, setOptions] = useState<TranscriptionPrintOptions>({
    mode: "print",
    repetitions: DEFAULT_TRANSCRIPTION_REPETITIONS,
    unitMode: "sentence",
    difficulty: "normal",
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSelection(loadTranscriptionSelection())
    setOptions(loadTranscriptionOptions())
    setReady(true)
  }, [])

  const pages = useMemo(() => {
    const units = buildUnits(selection, options)
    return paginateUnits(units, options.repetitions)
  }, [selection, options])

  const unitCount = useMemo(
    () => buildUnits(selection, options).length,
    [selection, options],
  )

  if (!ready) {
    return (
      <div className="transcription-print-root min-h-screen bg-theme-gradient p-6 text-theme-secondary">
        불러오는 중…
      </div>
    )
  }

  if (selection.length === 0) {
    return (
      <div className="transcription-print-root min-h-screen bg-theme-gradient px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/record/transcription")}
          className="mb-6 flex items-center gap-2 text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          구절 선택으로
        </button>
        <p className="text-theme-primary">선택된 구절이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="transcription-print-root min-h-screen overflow-x-hidden bg-theme-gradient pb-20">
      <div className="transcription-print-toolbar border-b border-theme-tertiary bg-theme-primary/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/record/transcription")}
            className="flex items-center gap-2 self-start text-sm text-theme-secondary hover:text-theme-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            선택으로 돌아가기
          </button>
          <div className="text-xs text-theme-secondary sm:text-sm">
            구절 {selection.length}개 · 단위 {unitCount}개 · {options.repetitions}
            회 반복 · {pages.length}페이지
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-medium text-white sm:w-auto sm:py-2"
          >
            <Printer className="h-4 w-4" />
            인쇄하기
          </button>
        </div>
      </div>

      <div className="transcription-print-preview">
        <p className="transcription-no-print text-center text-sm text-theme-secondary px-1">
          화면에서는 기기 폭에 맞춰 미리봅니다. 인쇄하면 A4(여백 8mm, 약{" "}
          {A4_LINES_PER_PAGE}줄/페이지)로 출력됩니다.
        </p>

        {pages.map((page, pageIdx) => (
          <article
            key={`page-${pageIdx}`}
            className="transcription-a4-page"
            aria-label={`필사 시트 ${pageIdx + 1}`}
          >
            <div className="transcription-a4-inner">
              {page.units.map((block, blockIdx) => (
                <div
                  key={`${block.unit.key}-${pageIdx}-${blockIdx}`}
                  className="transcription-block"
                >
                  {block.showMeta && (block.unit.bookTitle || block.unit.bookAuthor) ? (
                    <div className="transcription-block-meta">
                      {[block.unit.bookTitle, block.unit.bookAuthor]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                  {block.lines.map((line, lineIdx) =>
                    line.kind === "guide" ? (
                      <div
                        key={`g-${lineIdx}`}
                        className="transcription-line transcription-line-guide"
                      >
                        {line.text}
                      </div>
                    ) : (
                      <div
                        key={`b-${lineIdx}`}
                        className="transcription-line transcription-line-blank"
                      >
                        &nbsp;
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
