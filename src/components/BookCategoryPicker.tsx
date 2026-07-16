"use client"

import { useEffect, useMemo, useState } from "react"
import Select, { type SelectOption } from "@/components/Select"
import { useBookCategories } from "@/hooks/useBookCategories"
import { BookCategoryService } from "@/services/bookCategoryService"

type Props = {
  depth1Id: string
  depth2Id: string
  onDepth1Change: (id: string) => void
  onDepth2Change: (id: string) => void
  variant?: "form-modal" | "toolbar"
  disabled?: boolean
}

export default function BookCategoryPicker({
  depth1Id,
  depth2Id,
  onDepth1Change,
  onDepth2Change,
  variant = "form-modal",
  disabled = false,
}: Props) {
  const { data: tree, isLoading, isError } = useBookCategories()
  const [depth2Query, setDepth2Query] = useState("")

  const depth1List = useMemo(
    () => (tree ? BookCategoryService.getActiveDepth1(tree) : []),
    [tree]
  )

  const depth2List = useMemo(() => {
    if (!tree || !depth1Id) return []
    return BookCategoryService.getActiveDepth2ForParent(tree, depth1Id)
  }, [tree, depth1Id])

  useEffect(() => {
    // 대분류가 바뀌면 중분류 검색어도 초기화
    setDepth2Query("")
  }, [depth1Id])

  const filteredDepth2List = useMemo(() => {
    const q = depth2Query.trim().toLowerCase()
    if (!q) return depth2List
    return depth2List.filter((d) =>
      d.label.toLowerCase().includes(q)
    )
  }, [depth2List, depth2Query])

  useEffect(() => {
    if (!tree || !depth2Id || depth1Id) return
    const d2 = BookCategoryService.findDepth2(tree, depth2Id)
    if (d2) onDepth1Change(d2.parentId)
  }, [tree, depth1Id, depth2Id, onDepth1Change])

  useEffect(() => {
    if (!depth1Id || !depth2Id || !tree) return
    const valid = depth2List.some((d) => d.id === depth2Id)
    if (!valid) onDepth2Change("")
  }, [depth1Id, depth2Id, depth2List, tree, onDepth2Change])

  const depth1Options: SelectOption<string>[] = useMemo(
    () => [
      { value: "", label: "대분류 선택" },
      ...depth1List.map((d) => ({ value: d.id, label: d.label })),
    ],
    [depth1List]
  )

  const depth2Options: SelectOption<string>[] = useMemo(
    () => [
      {
        value: "",
        label: depth1Id ? "중분류 선택" : "먼저 대분류를 선택하세요",
      },
      ...depth2List.map((d) => ({
        value: d.id,
        label: d.isOther ? `${d.label} (애매할 때)` : d.label,
      })),
    ],
    [depth1Id, depth2List]
  )

  if (isError) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-400">
        분야 목록을 불러오지 못했습니다. 관리자에게 분야 시드를 요청하세요.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-0.5 block text-sm font-medium text-theme-primary">
          대분류
        </label>
        <Select
          value={depth1Id}
          onChangeAction={(v) => {
            onDepth1Change(v)
            onDepth2Change("")
          }}
          options={depth1Options}
          variant={variant}
          disabled={disabled || isLoading}
          aria-label="대분류"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-sm font-medium text-theme-primary">
          중분류
        </label>
        <input
          type="text"
          value={depth2Query}
          onChange={(e) => setDepth2Query(e.target.value)}
          placeholder={depth1Id ? "중분류 검색" : "먼저 대분류를 선택하세요"}
          disabled={disabled || isLoading || !depth1Id}
          className="form-control mb-2"
          aria-label="중분류 검색"
        />
        <Select
          value={depth2Id}
          onChangeAction={onDepth2Change}
          options={[
            depth2Options[0]!,
            ...filteredDepth2List.map((d) => ({
              value: d.id,
              label: d.isOther ? `${d.label} (애매할 때)` : d.label,
            })),
          ]}
          variant={variant}
          disabled={disabled || isLoading || !depth1Id}
          aria-label="중분류"
        />
        {depth1Id && depth2Query.trim() && filteredDepth2List.length === 0 && (
          <p className="mt-1 text-xs text-theme-tertiary">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}
