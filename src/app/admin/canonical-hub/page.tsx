"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Database, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getClientIdToken } from "@/lib/getClientIdToken"
import { GenericRouteSkeleton } from "@/components/skeletons"
import CanonicalBackfillOverlay, {
  formatBackfillResult,
  type CanonicalBackfillResultSummary,
} from "@/components/admin/CanonicalBackfillOverlay"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import type { CanonicalBackfillScan } from "@/lib/adminCanonicalBackfill"

const ACTION_LABELS: Record<string, string> = {
  backfillCanonical: "1. canonicalBooks 생성 · books 연결",
  backfillPacks: "2. 이해도·발췌 팩 → canonicalBookId",
  backfillGoldenBell: "3. 골든벨 퀴즈 → canonicalBookId",
  runAll: "전체 백필 (1 → 2 → 3)",
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    const preview = text.slice(0, 120).trim()
    throw new Error(
      `API 응답이 JSON이 아닙니다. (${preview || "empty response"})`,
    )
  }
}

async function backfillApi(action: string) {
  const idToken = await getClientIdToken()
  const res = await fetch("/api/admin/canonical-backfill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, action }),
  })
  const data = await parseApiResponse<{ error?: string; ok?: boolean } & Record<
    string,
    unknown
  >>(res)
  if (!res.ok) throw new Error(data.error || "요청 실패")
  return data
}

export default function AdminCanonicalHubPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userData } = useAuth()
  const [scan, setScan] = useState<CanonicalBackfillScan | null>(null)
  const [scanBusy, setScanBusy] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const [overlayOpen, setOverlayOpen] = useState(false)
  const [overlayPhase, setOverlayPhase] = useState<
    "loading" | "success" | "error"
  >("loading")
  const [overlayLoadingLabel, setOverlayLoadingLabel] = useState("")
  const [overlayRunAll, setOverlayRunAll] = useState(false)
  const [overlayResult, setOverlayResult] =
    useState<CanonicalBackfillResultSummary | null>(null)
  const [overlayError, setOverlayError] = useState<string | null>(null)

  useBodyScrollLock(overlayOpen)

  const loadScan = async (): Promise<CanonicalBackfillScan | null> => {
    setScanBusy(true)
    try {
      const data = await backfillApi("scan")
      const next = data.scan as CanonicalBackfillScan
      setScan(next)
      return next
    } catch (e) {
      console.error(e)
      return null
    } finally {
      setScanBusy(false)
    }
  }

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
    }
  }, [isLoggedIn, loading, userData, router])

  useEffect(() => {
    if (userData?.isAdmin) void loadScan()
  }, [userData?.isAdmin])

  const closeOverlay = () => {
    setOverlayOpen(false)
    setOverlayResult(null)
    setOverlayError(null)
    setOverlayPhase("loading")
  }

  const run = async (action: string) => {
    setLastResult(null)
    setOverlayOpen(true)
    setOverlayPhase("loading")
    setOverlayLoadingLabel(ACTION_LABELS[action] ?? "백필 실행 중")
    setOverlayRunAll(action === "runAll")
    setOverlayResult(null)
    setOverlayError(null)

    try {
      const data = await backfillApi(action)
      setLastResult(JSON.stringify(data, null, 2))

      let latestScan = (data.scan as CanonicalBackfillScan | undefined) ?? null
      if (action !== "scan") {
        latestScan = (await loadScan()) ?? latestScan
      }

      const summary = formatBackfillResult(action, {
        ...data,
        scan: latestScan,
      })
      setOverlayResult(summary)
      if (latestScan) setScan(latestScan)
      setOverlayPhase("success")
    } catch (e) {
      setOverlayError(e instanceof Error ? e.message : "실행 실패")
      setOverlayPhase("error")
    }
  }

  const runBusy = overlayOpen && overlayPhase === "loading"

  if (loading) return <GenericRouteSkeleton />
  if (!isLoggedIn || !userData?.isAdmin) return null

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-4 flex items-center gap-2 text-theme-secondary hover:text-theme-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            관리자 허브
          </button>
          <h1 className="mb-2 text-2xl font-bold text-theme-primary">
            공유 판본 · 콘텐츠 백필
          </h1>
          <p className="text-sm text-theme-secondary">
            canonicalBooks 연결, 목차·이해도·발췌·골든벨만 판본(canonicalBookId) 기준으로
            재구성합니다. 독서 질문은 유저별 개인 자료입니다.
          </p>
        </header>

        <section className="mb-6 rounded-lg bg-theme-secondary p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-theme-primary">
              <Database className="h-5 w-5" />
              현황
            </h2>
            <button
              type="button"
              disabled={scanBusy || runBusy}
              onClick={() => void loadScan()}
              className="inline-flex items-center gap-1 rounded-md border border-theme-tertiary px-3 py-1.5 text-xs text-theme-secondary hover:bg-theme-tertiary/30 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${scanBusy ? "animate-spin" : ""}`}
              />
              새로고침
            </button>
          </div>
          {scan ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-theme-tertiary">전체 books</dt>
                <dd className="font-medium text-theme-primary">{scan.totalBooks}</dd>
              </div>
              <div>
                <dt className="text-theme-tertiary">canonical 미연결 books</dt>
                <dd className="font-medium text-theme-primary">
                  {scan.booksWithoutCanonical}
                </dd>
              </div>
              <div>
                <dt className="text-theme-tertiary">canonicalBooks</dt>
                <dd className="font-medium text-theme-primary">
                  {scan.canonicalBooksCount}
                </dd>
              </div>
              <div>
                <dt className="text-theme-tertiary">제목만 팩 / canonical 팩</dt>
                <dd className="font-medium text-theme-primary">
                  {scan.titleOnlyPacks} / {scan.packsWithCanonical}
                </dd>
              </div>
              <div>
                <dt className="text-theme-tertiary">골든벨 미연결 / 연결</dt>
                <dd className="font-medium text-theme-primary">
                  {scan.goldenBellWithoutCanonical} / {scan.goldenBellWithCanonical}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-theme-tertiary">
              {scanBusy ? "현황 불러오는 중…" : "현황 없음"}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <button
            type="button"
            disabled={runBusy}
            onClick={() => void run("backfillCanonical")}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-left text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            1. canonicalBooks 생성 · books 연결
          </button>
          <button
            type="button"
            disabled={runBusy}
            onClick={() => void run("backfillPacks")}
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-left text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            2. 이해도·발췌 팩 → canonicalBookId
          </button>
          <button
            type="button"
            disabled={runBusy}
            onClick={() => void run("backfillGoldenBell")}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 text-left text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            3. 골든벨 퀴즈 → canonicalBookId
          </button>
          <button
            type="button"
            disabled={runBusy}
            onClick={() => void run("runAll")}
            className="w-full rounded-lg bg-slate-800 px-4 py-3 text-left text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            전체 순서대로 실행 (1 → 2 → 3)
          </button>
        </section>

        {lastResult && (
          <pre className="mt-6 max-h-80 overflow-auto rounded-lg bg-theme-tertiary/30 p-4 text-xs text-theme-secondary">
            {lastResult}
          </pre>
        )}
      </div>

      <CanonicalBackfillOverlay
        isOpen={overlayOpen}
        phase={overlayPhase}
        loadingLabel={overlayLoadingLabel}
        runAll={overlayRunAll}
        result={overlayResult}
        errorMessage={overlayError}
        onClose={closeOverlay}
      />
    </div>
  )
}
