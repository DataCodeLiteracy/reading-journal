"use client"

import { useEffect, useMemo, useState } from "react"
import Select, { type SelectOption } from "@/components/Select"
import {
  listKdcMajorOptions,
  listKdcMiddleOptionsForMajor,
  resolveKdcMajorLabel,
  resolveKdcMiddleLabel,
} from "@/lib/kdcClassification"

type Props = {
  majorCode: string
  middleCode: string
  onMajorChange: (code: string, label: string) => void
  onMiddleChange: (code: string, label: string) => void
  variant?: "form-modal" | "toolbar"
  disabled?: boolean
}

export default function KdcClassificationPicker({
  majorCode,
  middleCode,
  onMajorChange,
  onMiddleChange,
  variant = "form-modal",
  disabled = false,
}: Props) {
  const [middleQuery, setMiddleQuery] = useState("")

  const majorOptions = useMemo(() => listKdcMajorOptions(), [])

  const middleOptions = useMemo(
    () => listKdcMiddleOptionsForMajor(majorCode),
    [majorCode],
  )

  useEffect(() => {
    setMiddleQuery("")
  }, [majorCode])

  useEffect(() => {
    if (!middleCode) return
    if (!majorCode) {
      const derivedMajor = String(
        Math.floor(Number.parseInt(middleCode, 10) / 100) * 100,
      ).padStart(3, "0")
      if (resolveKdcMajorLabel(derivedMajor)) {
        onMajorChange(derivedMajor, resolveKdcMajorLabel(derivedMajor) ?? "")
      }
      return
    }
    const valid = middleOptions.some((m) => m.code === middleCode)
    if (!valid) {
      const derivedMajor = String(
        Math.floor(Number.parseInt(middleCode, 10) / 100) * 100,
      ).padStart(3, "0")
      if (derivedMajor !== majorCode && resolveKdcMajorLabel(derivedMajor)) {
        onMajorChange(derivedMajor, resolveKdcMajorLabel(derivedMajor) ?? "")
        return
      }
      onMiddleChange("", "")
    }
  }, [majorCode, middleCode, middleOptions, onMajorChange, onMiddleChange])

  const filteredMiddleOptions = useMemo(() => {
    const q = middleQuery.trim().toLowerCase()
    if (!q) return middleOptions
    return middleOptions.filter(
      (m) =>
        m.label.toLowerCase().includes(q) || m.code.includes(q),
    )
  }, [middleOptions, middleQuery])

  const majorSelectOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: "", label: "대분류 선택" },
      ...majorOptions.map((m) => ({ value: m.code, label: m.label })),
    ],
    [majorOptions],
  )

  const middleSelectOptions: SelectOption<string>[] = useMemo(
    () => [
      {
        value: "",
        label: majorCode ? "중분류 선택" : "먼저 대분류를 선택하세요",
      },
      ...filteredMiddleOptions.map((m) => ({
        value: m.code,
        label: m.label,
      })),
    ],
    [filteredMiddleOptions, majorCode],
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-theme-tertiary">
        국립중앙도서관 KDC 분류 · 도서 정보 불러오기 시 자동 입력됩니다
      </p>
      <div>
        <label className="mb-0.5 block text-sm font-medium text-theme-primary">
          대분류
        </label>
        <Select
          value={majorCode}
          onChangeAction={(code) => {
            onMajorChange(code, code ? resolveKdcMajorLabel(code) ?? "" : "")
            onMiddleChange("", "")
          }}
          options={majorSelectOptions}
          variant={variant}
          disabled={disabled}
          aria-label="KDC 대분류"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-sm font-medium text-theme-primary">
          중분류
        </label>
        <input
          type="text"
          value={middleQuery}
          onChange={(e) => setMiddleQuery(e.target.value)}
          placeholder={majorCode ? "중분류 검색" : "먼저 대분류를 선택하세요"}
          disabled={disabled || !majorCode}
          className="form-control mb-2"
          aria-label="KDC 중분류 검색"
        />
        <Select
          value={middleCode}
          onChangeAction={(code) => {
            onMiddleChange(code, code ? resolveKdcMiddleLabel(code) ?? "" : "")
          }}
          options={middleSelectOptions}
          variant={variant}
          disabled={disabled || !majorCode}
          aria-label="KDC 중분류"
        />
        {majorCode && middleQuery.trim() && filteredMiddleOptions.length === 0 && (
          <p className="mt-1 text-xs text-theme-tertiary">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}
