"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Link2, LogIn, RefreshCw, Unlink, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getClientIdToken } from "@/lib/getClientIdToken"
import {
  isFocusLevelAuthConfigured,
  signInFocusLevelWithGoogle,
  signOutFocusLevel,
} from "@/lib/focusLevelAuth"
import type { FocusLevelLink } from "@/lib/focusLevelLink"

type ActivityRow = {
  id: string
  name: string
  isPinned: boolean
  achievementUnit: string
}

export default function FocusLevelLinkPage() {
  const router = useRouter()
  const { loading, isLoggedIn } = useAuth()
  const [link, setLink] = useState<FocusLevelLink | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [focusEmail, setFocusEmail] = useState<string | null>(null)
  const [focusLevelIdToken, setFocusLevelIdToken] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const configured = isFocusLevelAuthConfigured()
  const picking = activities.length > 0

  const clearPicker = useCallback(() => {
    setActivities([])
    setFocusLevelIdToken(null)
    setFocusEmail(null)
    setSelectedId("")
  }, [])

  const loadLink = useCallback(async () => {
    try {
      const idToken = await getClientIdToken()
      const res = await fetch("/api/focus-level/link", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = (await res.json()) as { link?: FocusLevelLink | null; error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 조회 실패")
      setLink(data.link ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
    if (isLoggedIn) void loadLink()
  }, [loading, isLoggedIn, router, loadLink])

  const handleLoadActivities = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { idToken, user } = await signInFocusLevelWithGoogle()
      setFocusLevelIdToken(idToken)
      setFocusEmail(user.email)
      const res = await fetch("/api/focus-level/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusLevelIdToken: idToken }),
      })
      const data = (await res.json()) as {
        activities?: ActivityRow[]
        focusEmail?: string | null
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? "활동 목록 실패")
      setActivities(data.activities ?? [])
      if (data.focusEmail) setFocusEmail(data.focusEmail)
      setSelectedId("")
      setMessage("활동을 선택한 뒤 연동 저장을 눌러 주세요.")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleSaveLink = async () => {
    if (!focusLevelIdToken || !selectedId) return
    const selected = activities.find((a) => a.id === selectedId)
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const idToken = await getClientIdToken()
      const res = await fetch("/api/focus-level/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          focusLevelIdToken,
          activityId: selected.id,
          activityName: selected.name,
        }),
      })
      const data = (await res.json()) as { link?: FocusLevelLink; error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 저장 실패")
      setLink(data.link ?? null)
      clearPicker()
      setMessage(`「${selected.name}」 활동에 연동되었습니다.`)
      await signOutFocusLevel().catch(() => undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleUnlink = async () => {
    if (!confirm("나혼자만레벨업 연동을 해제할까요?")) return
    setBusy(true)
    setError(null)
    try {
      const idToken = await getClientIdToken()
      const res = await fetch("/api/focus-level/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 해제 실패")
      setLink(null)
      clearPicker()
      setMessage("연동이 해제되었습니다.")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !isLoggedIn) return null

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          뒤로가기
        </button>
        <h1 className="text-2xl font-bold text-theme-primary mb-2 flex items-center gap-2">
          <Link2 className="h-6 w-6" />
          나혼자만레벨업 연동
        </h1>
        <p className="text-sm text-theme-secondary mb-6">
          focus-level 계정으로 로그인한 뒤, 독서 시간을 넣을 활동을 선택하세요.
          이메일이 달라도 됩니다.
        </p>

        {!configured && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
            NEXT_PUBLIC_FOCUS_LEVEL_* 환경변수가 없습니다. 배포/로컬 env를 확인하세요.
          </div>
        )}

        {link && (
          <div className="bg-theme-secondary rounded-lg p-4 shadow-sm mb-4">
            <p className="text-sm text-theme-secondary mb-1">현재 연동</p>
            <p className="font-semibold text-theme-primary">{link.activityName}</p>
            {link.focusEmail && (
              <p className="text-xs text-theme-tertiary mt-1">{link.focusEmail}</p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleUnlink()}
              className="mt-3 inline-flex items-center gap-2 text-sm text-red-600 hover:underline"
            >
              <Unlink className="h-4 w-4" />
              연동 해제
            </button>
          </div>
        )}

        <div className="bg-theme-secondary rounded-lg p-4 shadow-sm space-y-4">
          {!picking && (
            <button
              type="button"
              disabled={busy || !configured}
              onClick={() => void handleLoadActivities()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-theme px-4 py-2 text-white disabled:opacity-50"
            >
              {link ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  활동 다시 불러오기
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  focus-level Google 로그인
                </>
              )}
            </button>
          )}

          {picking && (
            <div className="space-y-2">
              {focusEmail && (
                <p className="text-xs text-theme-secondary">로그인: {focusEmail}</p>
              )}
              <p className="text-sm font-medium text-theme-primary">활동 선택</p>
              {activities.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-theme-tertiary p-3 cursor-pointer hover:bg-theme-tertiary"
                >
                  <input
                    type="radio"
                    name="activity"
                    value={a.id}
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                  />
                  <span className="text-theme-primary">
                    {a.name}
                    {a.isPinned ? " · 고정" : ""}
                  </span>
                </label>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy || !selectedId || !focusLevelIdToken}
                  onClick={() => void handleSaveLink()}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  연동 저장
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    clearPicker()
                    setMessage(null)
                    void signOutFocusLevel().catch(() => undefined)
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-theme-tertiary px-4 py-2 text-sm text-theme-secondary"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <p className="mt-4 text-sm text-green-700 dark:text-green-400">{message}</p>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
