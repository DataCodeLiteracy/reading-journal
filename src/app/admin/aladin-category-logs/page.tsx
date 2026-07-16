"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { fetchAladinCategoryApplyLogs } from "@/services/aladinCategoryApplyLogService"
import type {
  AladinCategoryApplyLogEntry,
  AladinCategoryDiagnosisSeverity,
} from "@/types/aladinCategoryApplyLog"
import { GenericRouteSkeleton } from "@/components/skeletons"
import Select, { type SelectOption } from "@/components/Select"

const SOURCE_LABELS: Record<AladinCategoryApplyLogEntry["source"], string> = {
  "add-book-modal": "새 책 추가",
  "edit-book-modal": "책 정보 편집",
}

function formatWhen(iso?: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ko-KR")
}

function SeverityBadge({ severity }: { severity: AladinCategoryDiagnosisSeverity }) {
  if (severity === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        정상
      </span>
    )
  }
  if (severity === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        주의
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
      <XCircle className="h-3.5 w-3.5" aria-hidden />
      오류
    </span>
  )
}

export default function AdminAladinCategoryLogsPage() {
  const router = useRouter()
  const { loading, isLoggedIn, userData } = useAuth()
  const [logs, setLogs] = useState<AladinCategoryApplyLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<
    AladinCategoryDiagnosisSeverity | "all"
  >("all")

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await fetchAladinCategoryApplyLogs(150)
      setLogs(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그를 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
      return
    }
    if (!loading && isLoggedIn && userData && !userData.isAdmin) {
      router.push("/mypage")
      return
    }
    if (userData?.isAdmin) {
      void loadLogs()
    }
  }, [loading, isLoggedIn, userData, router, loadLogs])

  const severityOptions: SelectOption<AladinCategoryDiagnosisSeverity | "all">[] =
    useMemo(
      () => [
        { value: "all", label: "전체 심각도" },
        { value: "error", label: "오류만" },
        { value: "warning", label: "주의만" },
        { value: "ok", label: "정상만" },
      ],
      [],
    )

  const filteredLogs = useMemo(() => {
    if (severityFilter === "all") return logs
    return logs.filter((l) => l.severity === severityFilter)
  }, [logs, severityFilter])

  const counts = useMemo(
    () => ({
      total: logs.length,
      error: logs.filter((l) => l.severity === "error").length,
      warning: logs.filter((l) => l.severity === "warning").length,
      ok: logs.filter((l) => l.severity === "ok").length,
    }),
    [logs],
  )

  if (loading || !isLoggedIn) {
    return <GenericRouteSkeleton rows={6} />
  }
  if (!userData?.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-4 flex items-center gap-2 text-theme-secondary transition-colors hover:text-theme-primary"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            관리자 페이지로 돌아가기
          </button>
          <h1 className="mb-2 text-3xl font-bold text-theme-primary">
            알라딘 분류 매핑 로그
          </h1>
          <p className="text-sm text-theme-secondary">
            책 등록·수정 시 «알라딘에서 불러오기»를 사용할 때마다 분류 매핑
            진단 결과가 기록됩니다. 대분류 없이 중분류만 채워지는 등의 문제를
            추적할 때 사용하세요.
          </p>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-theme-secondary p-4 shadow-sm">
            <div className="text-2xl font-bold text-theme-primary">{counts.total}</div>
            <div className="text-xs text-theme-secondary">전체</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {counts.error}
            </div>
            <div className="text-xs text-theme-secondary">오류</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 shadow-sm dark:bg-amber-900/20">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {counts.warning}
            </div>
            <div className="text-xs text-theme-secondary">주의</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 shadow-sm dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {counts.ok}
            </div>
            <div className="text-xs text-theme-secondary">정상</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={severityFilter}
              onChangeAction={setSeverityFilter}
              options={severityOptions}
              variant="toolbar"
              aria-label="심각도 필터"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-theme-secondary px-3 py-2 text-sm font-medium text-theme-primary shadow-sm hover:bg-theme-tertiary disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden
            />
            새로고침
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="space-y-3">
          {isLoading && logs.length === 0 ? (
            <p className="text-sm text-theme-secondary">불러오는 중...</p>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-lg bg-theme-secondary p-6 text-center text-sm text-theme-secondary shadow-sm">
              {logs.length === 0
                ? "아직 기록된 로그가 없습니다. 책 추가/수정에서 알라딘 불러오기를 사용해 보세요."
                : "선택한 필터에 맞는 로그가 없습니다."}
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <article
                key={`${log.createdAt ?? "t"}-${log.bookTitle}-${idx}`}
                className="rounded-lg border border-theme-tertiary/60 bg-theme-secondary p-4 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-theme-primary">
                      {log.bookTitle}
                    </h2>
                    <p className="text-xs text-theme-tertiary">
                      {formatWhen(log.createdAt)} ·{" "}
                      {SOURCE_LABELS[log.source]} · uid {log.userId}
                      {log.isbn13 ? ` · ISBN ${log.isbn13}` : ""}
                    </p>
                  </div>
                  <SeverityBadge severity={log.severity} />
                </div>

                {log.messages.length > 0 ? (
                  <ul className="mb-3 space-y-1">
                    {log.messages.map((msg) => (
                      <li
                        key={msg}
                        className="text-sm text-theme-secondary before:mr-1.5 before:content-['•']"
                      >
                        {msg}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-3 text-sm text-green-700 dark:text-green-400">
                    분류 매핑에 문제가 감지되지 않았습니다.
                  </p>
                )}

                <details className="text-xs text-theme-secondary">
                  <summary className="cursor-pointer font-medium text-theme-primary">
                    상세 데이터
                  </summary>
                  <div className="mt-2 space-y-2 rounded-md bg-theme-tertiary/30 p-3 font-mono">
                    <p>
                      <span className="text-theme-tertiary">서버 매핑:</span>{" "}
                      {log.rawCategoryDepth1Label || log.rawCategoryDepth1Id || "-"} /{" "}
                      {log.rawCategoryDepth2Label || log.rawCategoryDepth2Id || "-"}
                    </p>
                    <p>
                      <span className="text-theme-tertiary">적용(enrich):</span>{" "}
                      {log.enrichedCategoryDepth1Label ||
                        log.enrichedCategoryDepth1Id ||
                        "-"}{" "}
                      /{" "}
                      {log.enrichedCategoryDepth2Label ||
                        log.enrichedCategoryDepth2Id ||
                        "-"}
                    </p>
                    <p>
                      <span className="text-theme-tertiary">트리:</span>{" "}
                      {log.treeLoaded
                        ? `로드됨 (대 ${log.treeDepth1Count ?? 0} · 중 ${log.treeDepth2Count ?? 0})`
                        : "미로드"}
                    </p>
                    <p>
                      <span className="text-theme-tertiary">검증:</span> d1
                      inTree={String(log.depth1InTree)} active=
                      {String(log.depth1Active)} · d2 inTree=
                      {String(log.depth2InTree)} active=
                      {String(log.depth2Active)} parentMatch=
                      {String(log.depth2ParentMatches)}
                    </p>
                    {log.aladinCategoryInfos?.length ? (
                      <p>
                        <span className="text-theme-tertiary">알라딘 CID:</span>{" "}
                        {log.aladinCategoryInfos
                          .map((i) => `${i.categoryName}(${i.categoryId})`)
                          .join(" → ")}
                      </p>
                    ) : null}
                    {log.issues.length > 0 ? (
                      <p>
                        <span className="text-theme-tertiary">issue codes:</span>{" "}
                        {log.issues.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </details>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
