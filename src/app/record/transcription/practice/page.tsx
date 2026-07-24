"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, SkipForward } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { UserStatisticsService } from "@/services/userStatisticsService"
import { formatRoundedExperience } from "@/utils/experienceUtils"
import {
  DIFFICULTY_LABELS,
  countTranscriptionChars,
  getExposureSeconds,
  getHintCount,
  getTranscriptionSuccessExp,
  isTranscriptionAnswerCorrect,
  TRANSCRIPTION_PRACTICE_TEXT_CLASS,
  type TranscriptionDifficulty,
} from "@/utils/transcriptionPractice"
import {
  splitIntoSentences,
  unitsFromQuoteText,
} from "@/utils/transcriptionSentences"
import {
  loadTranscriptionOptions,
  loadTranscriptionSelection,
  type TranscriptionSelectionItem,
  type TranscriptionSessionOptions,
} from "@/utils/transcriptionSelectionStorage"
import { DEFAULT_TRANSCRIPTION_REPETITIONS } from "@/utils/transcriptionLayout"

type PracticeGroup = {
  key: string
  bookTitle?: string
  bookAuthor?: string
  sentences: string[]
}

type Phase = "preview" | "input" | "hint" | "revealed" | "correct"

function buildPracticeGroups(
  selection: TranscriptionSelectionItem[],
  options: TranscriptionSessionOptions,
): PracticeGroup[] {
  const groups: PracticeGroup[] = []

  for (const item of selection) {
    if (options.unitMode === "quote") {
      const sentences = splitIntoSentences(item.quoteText)
      const list =
        sentences.length > 0
          ? sentences
          : item.quoteText.trim()
            ? [item.quoteText.trim()]
            : []
      if (list.length === 0) continue
      groups.push({
        key: item.id,
        bookTitle: item.bookTitle,
        bookAuthor: item.bookAuthor,
        sentences: list,
      })
    } else {
      const units = unitsFromQuoteText(item.quoteText, "sentence")
      units.forEach((text, idx) => {
        groups.push({
          key: `${item.id}-${idx}`,
          bookTitle: item.bookTitle,
          bookAuthor: item.bookAuthor,
          sentences: [text],
        })
      })
    }
  }

  return groups
}

export default function TranscriptionPracticePage() {
  const router = useRouter()
  const { userUid, isLoggedIn, loading: authLoading } = useAuth()
  const [ready, setReady] = useState(false)
  const [selection, setSelection] = useState<TranscriptionSelectionItem[]>([])
  const [options, setOptions] = useState<TranscriptionSessionOptions>({
    mode: "practice",
    repetitions: DEFAULT_TRANSCRIPTION_REPETITIONS,
    unitMode: "sentence",
    difficulty: "normal",
  })

  const groups = useMemo(
    () => buildPracticeGroups(selection, options),
    [selection, options],
  )

  const [groupIndex, setGroupIndex] = useState(0)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("preview")
  const [input, setInput] = useState("")
  const [hintsLeft, setHintsLeft] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sessionExp, setSessionExp] = useState(0)
  const [awarding, setAwarding] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login")
  }, [authLoading, isLoggedIn, router])

  useEffect(() => {
    setSelection(loadTranscriptionSelection())
    setOptions(loadTranscriptionOptions())
    setReady(true)
  }, [])

  const currentGroup = groups[groupIndex] ?? null
  const currentSentence = currentGroup?.sentences[sentenceIndex] ?? ""
  const currentCharCount = countTranscriptionChars(currentSentence)
  const difficulty: TranscriptionDifficulty = options.difficulty
  const exposureMs = Math.round(
    getExposureSeconds(currentCharCount, difficulty) * 1000,
  )

  const startPreview = useCallback(
    (sentence: string, nextPhase: Phase = "input") => {
      clearTimer()
      setPhase("preview")
      setFeedback(null)
      const ms = Math.round(
        getExposureSeconds(countTranscriptionChars(sentence), difficulty) *
          1000,
      )
      timerRef.current = setTimeout(() => {
        setPhase(nextPhase)
        timerRef.current = null
      }, ms)
    },
    [difficulty],
  )

  // 새 문장 시작
  useEffect(() => {
    if (!ready || finished || !currentGroup || !currentSentence) return
    setInput("")
    setHintsLeft(getHintCount(countTranscriptionChars(currentSentence)))
    setFeedback(null)
    startPreview(currentSentence, "input")
    return () => clearTimer()
  }, [
    ready,
    finished,
    groupIndex,
    sentenceIndex,
    currentGroup,
    currentSentence,
    startPreview,
  ])

  useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus()
    }
  }, [phase])

  const goNextSentence = async () => {
    if (!currentGroup) return
    if (sentenceIndex + 1 < currentGroup.sentences.length) {
      setSentenceIndex((i) => i + 1)
      return
    }
    if (groupIndex + 1 < groups.length) {
      setGroupIndex((g) => g + 1)
      setSentenceIndex(0)
      return
    }
    setFinished(true)
  }

  const handleSubmit = async () => {
    if (phase !== "input" || awarding || !currentSentence) return
    if (!isTranscriptionAnswerCorrect(input, currentSentence)) {
      setFeedback("아직 맞지 않아요. 힌트를 쓰거나 다시 입력해 보세요.")
      return
    }

    const gained = getTranscriptionSuccessExp(
      countTranscriptionChars(currentSentence),
    )
    setPhase("correct")
    setFeedback(`정답! +${formatRoundedExperience(gained)} EXP`)
    setAwarding(true)
    try {
      if (userUid && gained > 0) {
        await UserStatisticsService.addTranscriptionBonus(userUid, gained)
      }
      setSessionExp((e) => e + gained)
    } finally {
      setAwarding(false)
    }
  }

  const handleHint = () => {
    if (phase !== "input" || hintsLeft <= 0 || !currentSentence) return
    setHintsLeft((h) => h - 1)
    clearTimer()
    setPhase("hint")
    const ms = Math.min(exposureMs, 2500)
    timerRef.current = setTimeout(() => {
      setPhase("input")
      timerRef.current = null
    }, ms)
  }

  const handleReveal = () => {
    if (phase !== "input") return
    clearTimer()
    setPhase("revealed")
    setFeedback("답을 확인했습니다. 이번 문장은 경험치가 없습니다.")
    setInput(currentSentence)
  }

  const totalSentences = groups.reduce((n, g) => n + g.sentences.length, 0)
  const doneSentences =
    groups
      .slice(0, groupIndex)
      .reduce((n, g) => n + g.sentences.length, 0) + sentenceIndex
  const isLastSentence =
    Boolean(currentGroup) &&
    groupIndex === groups.length - 1 &&
    sentenceIndex === currentGroup!.sentences.length - 1

  if (authLoading || !ready) {
    return (
      <div className="min-h-screen bg-theme-gradient p-6 text-theme-secondary">
        불러오는 중…
      </div>
    )
  }

  if (!isLoggedIn) return null

  if (selection.length === 0 || groups.length === 0) {
    return (
      <div className="min-h-screen bg-theme-gradient px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/record/transcription")}
          className="mb-6 flex items-center gap-2 text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          구절 선택으로
        </button>
        <p className="text-theme-primary">연습할 구절이 없습니다.</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-theme-gradient px-4 py-6 pb-24">
        <div className="container mx-auto max-w-lg">
          <h1 className="mb-2 text-2xl font-bold text-theme-primary">
            타자 필사 완료
          </h1>
          <p className="mb-6 text-theme-secondary">
            이번 세션에서{" "}
            <span className="font-semibold text-theme-primary">
              {formatRoundedExperience(sessionExp)}
            </span>{" "}
            EXP를 얻었습니다.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/record/transcription")}
              className="rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-medium text-white"
            >
              필사하기 홈
            </button>
            <button
              type="button"
              onClick={() => {
                setFinished(false)
                setGroupIndex(0)
                setSentenceIndex(0)
                setSessionExp(0)
              }}
              className="rounded-lg border border-theme-tertiary px-4 py-2.5 text-sm font-medium text-theme-primary"
            >
              같은 구절 다시
            </button>
          </div>
        </div>
      </div>
    )
  }

  const showText =
    phase === "preview" ||
    phase === "hint" ||
    phase === "revealed" ||
    phase === "correct"

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="border-b border-theme-tertiary bg-theme-primary/95 px-4 py-3 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push("/record/transcription")}
            className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            선택으로
          </button>
          <p className="text-xs text-theme-secondary sm:text-sm">
            {DIFFICULTY_LABELS[difficulty]} · {doneSentences + 1}/{totalSentences}{" "}
            · +{formatRoundedExperience(sessionExp)} EXP
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-6">
        {(currentGroup?.bookTitle || currentGroup?.bookAuthor) && (
          <p className="mb-4 text-sm text-theme-secondary">
            {[currentGroup.bookTitle, currentGroup.bookAuthor]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="mb-6 space-y-3">
          {currentGroup!.sentences.map((s, idx) => {
            const isCurrent = idx === sentenceIndex
            const isPast = idx < sentenceIndex
            const blurred = idx > sentenceIndex
            return (
              <div
                key={`${currentGroup!.key}-s-${idx}`}
                className={`rounded-lg border px-4 py-3 transition-all ${
                  isCurrent
                    ? "border-accent-theme bg-theme-secondary"
                    : "border-theme-tertiary/60 bg-theme-secondary/50"
                }`}
              >
                {isPast || (isCurrent && (phase === "correct" || phase === "revealed")) ? (
                  <p className={`${TRANSCRIPTION_PRACTICE_TEXT_CLASS} text-theme-primary`}>
                    {s}
                  </p>
                ) : isCurrent && showText ? (
                  <p className={`${TRANSCRIPTION_PRACTICE_TEXT_CLASS} text-theme-primary`}>
                    {s}
                  </p>
                ) : isCurrent ? (
                  <p className="text-base leading-relaxed text-theme-tertiary">······</p>
                ) : blurred ? (
                  <p
                    className={`select-none blur-sm ${TRANSCRIPTION_PRACTICE_TEXT_CLASS} text-theme-secondary`}
                    aria-hidden
                  >
                    {s}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        {(phase === "preview" || phase === "hint") && (
          <p className="mb-4 text-center text-sm text-theme-secondary">
            {phase === "hint" ? "힌트 · " : ""}
            문장을 기억하세요… ({(exposureMs / 1000).toFixed(1)}초)
          </p>
        )}

        {phase === "input" || phase === "correct" || phase === "revealed" ? (
          <div className="space-y-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (phase === "input") void handleSubmit()
                }
              }}
              disabled={phase !== "input"}
              rows={4}
              placeholder="기억한 문장을 입력하세요"
              className={`w-full rounded-lg border border-theme-tertiary bg-theme-primary px-4 py-3 ${TRANSCRIPTION_PRACTICE_TEXT_CLASS} text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent-theme disabled:opacity-70`}
            />

            {feedback ? (
              <p
                className={`text-sm ${
                  phase === "correct"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : phase === "revealed"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {feedback}
              </p>
            ) : null}

            {phase === "input" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={awarding || !input.trim()}
                  className="rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  확인
                </button>
                <button
                  type="button"
                  onClick={handleHint}
                  disabled={hintsLeft <= 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-theme-tertiary px-3 py-2.5 text-sm text-theme-primary disabled:opacity-40"
                >
                  <Eye className="h-4 w-4" />
                  다시 보기 ({hintsLeft})
                </button>
                <button
                  type="button"
                  onClick={handleReveal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-theme-tertiary px-3 py-2.5 text-sm text-theme-secondary"
                >
                  <EyeOff className="h-4 w-4" />
                  답 보기 (0 EXP)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void goNextSentence()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-medium text-white"
              >
                <SkipForward className="h-4 w-4" />
                {isLastSentence ? "완료" : "다음"}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
