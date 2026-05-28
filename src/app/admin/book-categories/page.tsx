"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus, Trash2, Pencil, Upload } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useBookCategories } from "@/hooks/useBookCategories"
import { BookCategoryService } from "@/services/bookCategoryService"
import { getClientIdToken } from "@/lib/getClientIdToken"
import { queryKeys } from "@/lib/queryKeys"
import { GenericRouteSkeleton } from "@/components/skeletons"
import type { BookCategoryDepth1, BookCategoryDepth2 } from "@/types/bookCategory"

async function parseApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    const preview = text.slice(0, 120).trim()
    throw new Error(
      `API 응답이 JSON이 아닙니다. 경로/권한을 확인해 주세요. (${preview || "empty response"})`
    )
  }
}

async function adminCategoryApi(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>
) {
  const idToken = await getClientIdToken()
  const res = await fetch("/api/admin/book-categories", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, idToken }),
  })
  const data = await parseApiResponse<{ error?: string; ok?: boolean }>(res)
  if (!res.ok) throw new Error(data.error || "요청 실패")
  return data
}

export default function AdminBookCategoriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { loading, isLoggedIn, userData } = useAuth()
  const { data: tree, isLoading, refetch } = useBookCategories()
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [seedFiles, setSeedFiles] = useState<string[]>(["default.json"])
  const [selectedSeedFile, setSelectedSeedFile] = useState("default.json")
  const uploadInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userData?.isAdmin) return
    void (async () => {
      try {
        const idToken = await getClientIdToken()
        const res = await fetch(
          `/api/admin/book-categories?idToken=${encodeURIComponent(idToken)}`
        )
        const data = await parseApiResponse<{
          files?: string[]
          defaultFile?: string
        }>(res)
        if (res.ok && data.files?.length) {
          setSeedFiles(data.files)
          setSelectedSeedFile(data.defaultFile || data.files[0])
        }
      } catch {
        /* public 목록 실패 시 default.json만 사용 */
      }
    })()
  }, [userData?.isAdmin])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bookCategories.tree() })

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
      await invalidate()
      await refetch()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "오류")
    } finally {
      setBusy(false)
    }
  }

  const handleSeedFromPublicFile = () =>
    run(async () => {
      const result = await adminCategoryApi("POST", {
        action: "seed",
        file: selectedSeedFile,
      })
      setMessage(
        `public/분야/${selectedSeedFile} 시드를 등록했습니다.`
      )
      void result
    })

  const handleSeedFromUpload = (file: File) =>
    run(async () => {
      const text = await file.text()
      const seed = JSON.parse(text) as unknown
      await adminCategoryApi("POST", { action: "seedFromJson", seed })
      setMessage(`«${file.name}» 내용으로 시드를 등록했습니다.`)
    })

  const handleAddDepth1 = () => {
    const label = window.prompt("대분류 이름")
    if (!label?.trim()) return
    void run(async () => {
      await adminCategoryApi("POST", {
        action: "create",
        level: 1,
        label: label.trim(),
      })
      setMessage("대분류를 추가했습니다.")
    })
  }

  const handleAddDepth2 = (parentId: string) => {
    const label = window.prompt("중분류 이름")
    if (!label?.trim()) return
    const isOther = window.confirm("«기타» 항목으로 등록할까요? (애매할 때 선택용)")
    void run(async () => {
      await adminCategoryApi("POST", {
        action: "create",
        level: 2,
        parentId,
        label: label.trim(),
        isOther,
      })
      setMessage("중분류를 추가했습니다.")
    })
  }

  const handleRename = (level: 1 | 2, item: BookCategoryDepth1 | BookCategoryDepth2) => {
    const label = window.prompt("이름 수정", item.label)
    if (!label?.trim() || label.trim() === item.label) return
    void run(async () => {
      await adminCategoryApi("PATCH", { level, id: item.id, label: label.trim() })
      setMessage("이름을 수정했습니다.")
    })
  }

  const handleToggleActive = (
    level: 1 | 2,
    item: BookCategoryDepth1 | BookCategoryDepth2
  ) => {
    void run(async () => {
      await adminCategoryApi("PATCH", {
        level,
        id: item.id,
        isActive: item.isActive === false,
      })
      setMessage(item.isActive === false ? "활성화했습니다." : "비활성화했습니다.")
    })
  }

  const handleDelete = (level: 1 | 2, item: BookCategoryDepth1 | BookCategoryDepth2) => {
    if (
      !window.confirm(
        level === 1
          ? `"${item.label}" 대분류와 하위 중분류를 모두 삭제할까요?`
          : `"${item.label}" 중분류를 삭제할까요?`
      )
    ) {
      return
    }
    void run(async () => {
      await adminCategoryApi("DELETE", { level, id: item.id })
      setMessage("삭제했습니다.")
    })
  }

  if (loading || !isLoggedIn) return <GenericRouteSkeleton rows={4} />
  if (!userData?.isAdmin) {
    router.push("/mypage")
    return null
  }

  const allDepth1 = tree?.depth1 ?? []

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <button
          onClick={() => router.push("/admin")}
          className="mb-4 flex items-center gap-2 text-theme-secondary hover:text-theme-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          관리자 페이지
        </button>
        <h1 className="mb-2 text-3xl font-bold text-theme-primary">책 분야 분류</h1>
        <p className="mb-4 text-sm text-theme-secondary">
          시드 JSON은 <code className="text-xs">public/분야/</code> 폴더에
          둡니다. Firestore가 비어 있을 때만 파일·업로드 시드가 가능합니다.
        </p>

        <div className="mb-6 rounded-lg bg-theme-secondary p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-theme-primary">파일로 시드</h2>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs text-theme-tertiary">
              public/분야/
              <select
                value={selectedSeedFile}
                onChange={(e) => setSelectedSeedFile(e.target.value)}
                className="mt-1 block w-full min-w-[12rem] rounded-md border border-theme-tertiary bg-theme-primary px-2 py-1.5 text-sm"
                disabled={busy}
              >
                {seedFiles.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || isLoading}
              onClick={() => void handleSeedFromPublicFile()}
              className="rounded-lg bg-accent-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              선택 파일로 시드
            </button>
          </div>
          <div className="border-t border-theme-tertiary pt-3">
            <p className="mb-2 text-xs text-theme-tertiary">
              또는 JSON 파일 업로드 (형식은 default.json과 동일)
            </p>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleSeedFromUpload(f)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-theme-tertiary px-4 py-2 text-sm"
            >
              <Upload className="h-4 w-4" />
              JSON 업로드 시드
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleAddDepth1}
            className="inline-flex items-center gap-1 rounded-lg border border-theme-tertiary px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            대분류 추가
          </button>
        </div>

        {isLoading && <p className="text-sm text-theme-tertiary">불러오는 중…</p>}

        {!isLoading && allDepth1.length === 0 && (
          <p className="rounded-lg bg-theme-secondary p-4 text-sm text-theme-secondary">
            등록된 분야가 없습니다. public/분야/default.json으로 시드하거나 JSON을 업로드하세요.
          </p>
        )}

        <ul className="space-y-4">
          {allDepth1.map((d1) => {
            const children = tree
              ? BookCategoryService.getActiveDepth2ForParent(tree, d1.id)
              : []
            const inactive = d1.isActive === false
            return (
              <li
                key={d1.id}
                className={`rounded-lg bg-theme-secondary p-4 shadow-sm ${inactive ? "opacity-60" : ""}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-theme-primary">
                    {d1.label}
                    {inactive && (
                      <span className="ml-2 text-xs text-theme-tertiary">(비활성)</span>
                    )}
                  </h2>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRename(1, d1)}
                      className="rounded p-1.5 hover:bg-theme-tertiary"
                      aria-label="이름 수정"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleActive(1, d1)}
                      className="rounded px-2 py-1 text-xs hover:bg-theme-tertiary"
                    >
                      {inactive ? "활성" : "비활성"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(1, d1)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <ul className="mb-2 space-y-1 border-l-2 border-theme-tertiary pl-3">
                  {children.map((d2) => (
                    <li
                      key={d2.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {d2.label}
                        {d2.isOther && (
                          <span className="ml-1 text-xs text-theme-tertiary">
                            (기타)
                          </span>
                        )}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRename(2, d2)}
                          className="rounded p-1 hover:bg-theme-tertiary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(2, d2)}
                          className="rounded p-1 text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAddDepth2(d1.id)}
                  className="text-xs text-accent-theme hover:underline"
                >
                  + 중분류 추가
                </button>
              </li>
            )
          })}
        </ul>

        {message && (
          <p className="mt-4 text-sm text-theme-secondary">{message}</p>
        )}
      </div>
    </div>
  )
}
