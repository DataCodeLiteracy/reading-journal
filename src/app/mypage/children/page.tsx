"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Users } from "lucide-react"
import ConfirmModal from "@/components/ConfirmModal"
import { useAuth } from "@/contexts/AuthContext"
import { queryKeys } from "@/lib/queryKeys"
import { GuardianChildService } from "@/services/guardianChildService"
import type { GuardianChildLink } from "@/types/guardian"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { canLinkChildren } from "@/utils/koreanAge"

export default function ChildrenPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isLoggedIn, loading, userUid, userData } = useAuth()
  const [connectCode, setConnectCode] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<GuardianChildLink | null>(
    null,
  )
  const eligible = canLinkChildren(userData?.birthYear)

  const childrenQuery = useQuery({
    queryKey: queryKeys.guardian.children(userUid),
    queryFn: () => GuardianChildService.listChildren(userUid!),
    enabled: Boolean(userUid) && eligible,
  })

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login")
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!loading && isLoggedIn && userData && !eligible) {
      router.replace("/mypage")
    }
  }, [loading, isLoggedIn, userData, eligible, router])

  const connectChild = async (event: FormEvent) => {
    event.preventDefault()
    if (!connectCode.trim()) return
    setBusy(true)
    setError("")
    try {
      await GuardianChildService.connectByInviteCode(connectCode.trim())
      setConnectCode("")
      await queryClient.invalidateQueries({
        queryKey: queryKeys.guardian.children(userUid),
      })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "자녀를 연결하지 못했습니다.",
      )
    } finally {
      setBusy(false)
    }
  }

  const removeChild = async (link: GuardianChildLink) => {
    if (!userUid) return
    setBusy(true)
    setError("")
    try {
      await GuardianChildService.disconnectChild(userUid, link.child_user_id)
      setPendingDelete(null)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.guardian.children(userUid),
      })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "연결을 해제하지 못했습니다.",
      )
      setPendingDelete(null)
    } finally {
      setBusy(false)
    }
  }

  if (loading || !isLoggedIn || !eligible) return null

  return (
    <div className="min-h-screen bg-theme-gradient pb-24">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/mypage")}
            className="mb-3 inline-flex items-center gap-1 text-sm text-theme-secondary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            마이페이지
          </button>
          <h1 className="text-2xl font-bold text-theme-primary">자녀 연결</h1>
          <p className="mt-1 text-sm text-theme-secondary">
            자녀 계정은 마이페이지 → 프로필에서 「보호자 연결 코드」를 발급·확인할 수
            있습니다. 그 코드를 아래에 입력하면 바로 연결됩니다.
          </p>
        </header>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}

        <section className="mb-6 rounded-xl border-card bg-theme-secondary p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-theme-primary">자녀 코드로 연결</h2>
          <p className="mb-3 text-xs text-theme-secondary">
            자녀 프로필 맨 아래의 「보호자 연결 코드」를 입력하세요.
          </p>
          <form onSubmit={connectChild} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={connectCode}
              onChange={(event) => setConnectCode(event.target.value.toUpperCase())}
              maxLength={12}
              placeholder="보호자 연결 코드"
              className="form-control flex-1"
              aria-label="보호자 연결 코드"
            />
            <button
              type="submit"
              disabled={busy || !connectCode.trim()}
              className="rounded-lg bg-accent-theme px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              연결
            </button>
          </form>
        </section>

        <section className="rounded-xl border-card bg-theme-secondary p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-theme-primary">
            <Users className="h-4 w-4" aria-hidden />
            연결된 자녀
          </h2>
          {childrenQuery.isLoading ? (
            <p className="text-sm text-theme-secondary">불러오는 중…</p>
          ) : childrenQuery.data?.length ? (
            <ul className="space-y-2">
              {childrenQuery.data.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-theme-tertiary px-3 py-2.5"
                >
                  <span className="font-medium text-theme-primary">
                    {link.child_display_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(link)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    해제
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-theme-secondary">
              아직 연결된 자녀가 없습니다.
            </p>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void removeChild(pendingDelete)
        }}
        title="자녀 연결 해제"
        message={
          pendingDelete
            ? `${pendingDelete.child_display_name}님과의 연결을 해제할까요?`
            : ""
        }
        confirmText={busy ? "해제 중…" : "해제"}
        cancelText="취소"
        icon={Trash2}
      />
    </div>
  )
}
