"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Cpu, Home, FileText } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { AdminAiSettingsService } from "@/services/adminAiSettingsService"
import { ReadingAiGradingPromptsService } from "@/services/readingAiGradingPromptsService"
import {
  READING_AI_MODEL_OPTIONS,
  type ReadingAiModelFamily,
} from "@/types/readingContent"
import { GenericRouteSkeleton } from "@/components/skeletons"

export default function AdminAiSettingsPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userData } = useAuth()
  const [modelId, setModelId] = useState(READING_AI_MODEL_OPTIONS[0].id)
  const [saving, setSaving] = useState(false)
  const [savingPrompts, setSavingPrompts] = useState(false)
  const [examPrompt, setExamPrompt] = useState("")
  const [excerptPrompt, setExcerptPrompt] = useState("")
  const [goldenBellPrompt, setGoldenBellPrompt] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
    }
  }, [loading, isLoggedIn, userData, router])

  useEffect(() => {
    if (!isLoggedIn || !userData?.isAdmin) return
    ;(async () => {
      try {
        const [s, p] = await Promise.all([
          AdminAiSettingsService.get(),
          ReadingAiGradingPromptsService.get(),
        ])
        setModelId(s.readingGradingModelId)
        setExamPrompt(p.examSystem)
        setExcerptPrompt(p.excerptSystem)
        setGoldenBellPrompt(p.goldenBellSystem)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "불러오기 실패")
      }
    })()
  }, [isLoggedIn, userData?.isAdmin])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await AdminAiSettingsService.setReadingGradingModelId(modelId)
      setMessage("모델 설정이 저장되었습니다.")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(false)
    }
  }

  const handleSavePrompts = async () => {
    setSavingPrompts(true)
    setMessage(null)
    try {
      await ReadingAiGradingPromptsService.setAll({
        examSystem: examPrompt,
        excerptSystem: excerptPrompt,
        goldenBellSystem: goldenBellPrompt,
      })
      setMessage("채점 프롬프트가 저장되었습니다. (Firestore: readingAiGradingPrompts/config)")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "프롬프트 저장 실패")
    } finally {
      setSavingPrompts(false)
    }
  }

  if (loading) return <GenericRouteSkeleton rows={4} />
  if (!isLoggedIn || !userData?.isAdmin) return null

  const byFamily = (f: ReadingAiModelFamily) =>
    READING_AI_MODEL_OPTIONS.filter((m) => m.family === f)

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary"
          >
            <ArrowLeft className="h-4 w-4" /> 관리자 홈
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary"
          >
            <Home className="h-4 w-4" /> 메인
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Cpu className="h-7 w-7 text-accent-theme" />
          <h1 className="text-2xl font-bold text-theme-primary">AI 채점 모델</h1>
        </div>
        <p className="text-sm text-theme-secondary mb-6">
          이해도 점검·발췌 요약·독서 골든벨 주관식·독서 리뷰 비교에 같은 모델이 사용됩니다. GPT-5 계열은 서버에서
          <code className="mx-1 text-xs">max_completion_tokens</code>로 요청합니다.
        </p>

        {loadError && (
          <p className="text-sm text-red-600 mb-4">{loadError}</p>
        )}

        <div className="bg-theme-secondary rounded-lg shadow-sm p-5 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-theme-primary mb-2">GPT-4 계열</h2>
            <div className="space-y-2">
              {byFamily("gpt4").map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-theme-tertiary px-3 py-2 cursor-pointer hover:bg-theme-tertiary/40"
                >
                  <input
                    type="radio"
                    name="reading-ai-model"
                    value={m.id}
                    checked={modelId === m.id}
                    onChange={() => setModelId(m.id)}
                  />
                  <span className="text-sm text-theme-primary">{m.label}</span>
                  <span className="text-xs text-theme-tertiary ml-auto font-mono">{m.id}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-theme-primary mb-2">GPT-5 계열</h2>
            <div className="space-y-2">
              {byFamily("gpt5").map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-theme-tertiary px-3 py-2 cursor-pointer hover:bg-theme-tertiary/40"
                >
                  <input
                    type="radio"
                    name="reading-ai-model"
                    value={m.id}
                    checked={modelId === m.id}
                    onChange={() => setModelId(m.id)}
                  />
                  <span className="text-sm text-theme-primary">{m.label}</span>
                  <span className="text-xs text-theme-tertiary ml-auto font-mono">{m.id}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-full py-3 rounded-lg bg-accent-theme text-white font-medium disabled:opacity-50"
          >
            {saving ? "저장 중…" : "설정 저장"}
          </button>
          {message && (
            <p className="text-sm text-center text-theme-secondary">{message}</p>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2 mt-10">
          <FileText className="h-7 w-7 text-accent-theme" />
          <h2 className="text-xl font-bold text-theme-primary">채점 시스템 프롬프트</h2>
        </div>
        <p className="text-sm text-theme-secondary mb-4">
          Firestore 컬렉션 <code className="text-xs">readingAiGradingPrompts</code> 문서{" "}
          <code className="text-xs">config</code>에 저장됩니다. 채점 API는 로그인 사용자 토큰으로 이 문서를
          읽어 오며, 규칙에서 인증된 읽기가 허용되어야 합니다. 비어 있으면 코드 기본값을 씁니다.
          사용자 메시지 JSON에 <code className="text-xs">book_title</code> 등이 포함됩니다.
        </p>

        <div className="bg-theme-secondary rounded-lg shadow-sm p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-theme-primary mb-1">
              이해도 점검 (시스템)
            </label>
            <p className="text-xs text-theme-tertiary mb-2">
              출력 형식: JSON 한 객체, 키 <code className="text-xs">score</code> (1~10),{" "}
              <code className="text-xs">feedback</code>.
            </p>
            <textarea
              value={examPrompt}
              onChange={(e) => setExamPrompt(e.target.value)}
              rows={8}
              className="w-full text-sm font-mono border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-theme-primary mb-1">
              발췌 요약 (시스템)
            </label>
            <p className="text-xs text-theme-tertiary mb-2">
              출력 형식: 위와 동일 (score, feedback).
            </p>
            <textarea
              value={excerptPrompt}
              onChange={(e) => setExcerptPrompt(e.target.value)}
              rows={8}
              className="w-full text-sm font-mono border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-theme-primary mb-1">
              독서 골든벨 주관식 (시스템)
            </label>
            <p className="text-xs text-theme-tertiary mb-2">
              출력 형식: JSON 한 객체, 키 <code className="text-xs">is_correct</code> (boolean),{" "}
              <code className="text-xs">feedback</code>.
            </p>
            <textarea
              value={goldenBellPrompt}
              onChange={(e) => setGoldenBellPrompt(e.target.value)}
              rows={10}
              className="w-full text-sm font-mono border border-theme-tertiary rounded-lg p-3 bg-theme-primary text-theme-primary"
            />
          </div>

          <button
            type="button"
            disabled={savingPrompts}
            onClick={() => void handleSavePrompts()}
            className="w-full py-3 rounded-lg bg-accent-theme text-white font-medium disabled:opacity-50"
          >
            {savingPrompts ? "저장 중…" : "프롬프트만 저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
