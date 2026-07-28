"use client"

import { useEffect, useState } from "react"
import { Trash2, Users } from "lucide-react"
import FormModalFrame from "@/components/FormModalFrame"

export type ReadAloudDeleteTargetItem = {
  sessionId: string
  userId: string
  displayName: string
  role: "guardian" | "child"
  duration: number
  date: string
}

type Props = {
  isOpen: boolean
  targets: ReadAloudDeleteTargetItem[]
  isLoading?: boolean
  isDeleting?: boolean
  loadError?: string | null
  onClose: () => void
  onConfirm: (sessionIds: string[]) => void
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

/**
 * 읽어주기 원본 삭제 시 보호자·자녀 연계 기록 중 삭제할 대상을 고릅니다.
 */
export default function DeleteReadAloudSessionsModal({
  isOpen,
  targets,
  isLoading = false,
  isDeleting = false,
  loadError = null,
  onClose,
  onConfirm,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) return
    setSelectedIds(targets.map((t) => t.sessionId))
  }, [isOpen, targets])

  const locked = isLoading || isDeleting
  const allSelected =
    targets.length > 0 && selectedIds.length === targets.length

  const toggle = (sessionId: string) => {
    if (locked) return
    setSelectedIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId],
    )
  }

  const toggleAll = () => {
    if (locked || targets.length === 0) return
    setSelectedIds(allSelected ? [] : targets.map((t) => t.sessionId))
  }

  return (
    <FormModalFrame
      isOpen={isOpen}
      onClose={() => {
        if (locked) return
        onClose()
      }}
      title="읽어주기 기록 삭제"
      interactionLocked={locked}
      headerStart={
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <Trash2 className="h-4 w-4" aria-hidden />
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-theme-secondary">
        이 읽어주기는 보호자와 자녀 계정에 각각 기록이 남아 있을 수 있습니다.
        삭제할 대상을 선택한 뒤 확인하세요. 선택한 계정의 나혼자만레벨업 연동
        기록도 함께 삭제됩니다.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-theme-secondary">연계 기록을 불러오는 중…</p>
      ) : loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : targets.length === 0 ? (
        <p className="mt-4 text-sm text-theme-secondary">삭제할 연계 기록이 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleAll}
              disabled={locked}
              className="text-xs font-medium text-accent-theme hover:underline disabled:opacity-50"
            >
              {allSelected ? "전체 선택 해제" : "전체 선택"}
            </button>
            <span className="text-xs text-theme-tertiary">
              {selectedIds.length}/{targets.length} 선택
            </span>
          </div>
          <ul className="space-y-2">
            {targets.map((target) => {
              const checked = selectedIds.includes(target.sessionId)
              return (
                <li key={target.sessionId}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      checked
                        ? "border-accent-theme/40 bg-accent-theme/5"
                        : "border-theme-tertiary bg-theme-primary"
                    } ${locked ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-theme-tertiary"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggle(target.sessionId)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-theme-primary">
                          {target.displayName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            target.role === "guardian"
                              ? "bg-theme-tertiary text-theme-secondary"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          }`}
                        >
                          {target.role === "guardian" ? "보호자(나)" : "자녀"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-theme-secondary">
                        {target.date ? `${target.date} · ` : ""}
                        {formatDuration(target.duration)}
                      </span>
                    </span>
                    {target.role === "child" ? (
                      <Users
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                    ) : null}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="rounded-md bg-theme-secondary px-4 py-2 text-sm font-medium text-theme-primary transition-colors hover:bg-theme-tertiary disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={
            locked || Boolean(loadError) || selectedIds.length === 0 || targets.length === 0
          }
          onClick={() => onConfirm(selectedIds)}
          className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {isDeleting ? "삭제 중…" : `선택한 ${selectedIds.length}건 삭제`}
        </button>
      </div>
    </FormModalFrame>
  )
}
