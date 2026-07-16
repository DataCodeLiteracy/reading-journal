"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

export type SelectOption<T extends string = string> = {
  value: T
  label: string
  disabled?: boolean
  optionClassName?: string
}

export type SelectVariant = "form-modal" | "toolbar" | "compact"

const variantClass: Record<SelectVariant, string> = {
  /** 모달·폼 전체 너비 — 터치 친화 높이 (focus-level form-modal 정렬) */
  "form-modal":
    "h-10 min-h-10 max-md:h-auto max-md:min-h-[2.75rem] max-md:py-2 max-md:leading-normal rounded-md border border-theme-secondary bg-theme-primary px-3 py-0 text-base font-medium text-theme-primary shadow-none hover:border-theme-primary",
  /** 목록·필터 바 — 입력 필드와 동일한 느낌의 rounded-lg */
  toolbar:
    "h-10 min-h-10 max-md:min-h-[2.75rem] rounded-lg border border-theme-tertiary bg-theme-primary px-3 py-0 text-sm font-medium text-theme-primary shadow-none hover:border-theme-primary",
  /** 카드 안의 짧은 상태 선택 */
  compact:
    "h-8 min-h-8 rounded-md border border-theme-tertiary bg-theme-primary px-2 py-0 text-xs font-medium text-theme-primary shadow-none hover:border-theme-primary",
}

type SelectProps<T extends string> = {
  value: T
  onChangeAction: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  disabled?: boolean
  id?: string
  fullWidth?: boolean
  variant?: SelectVariant
  className?: string
  triggerClassName?: string
  emptyValue?: string
  menuPlacement?: "top" | "bottom"
  /**
   * 기본값은 `truncate`(한 줄 줄임표)입니다.
   * 모달 등에서 긴 라벨이 박스를 넘치지 않게 하려면 `false`로 두세요.
   */
  truncate?: boolean
  "aria-label"?: string
}

export default function Select<T extends string>({
  value,
  onChangeAction,
  options,
  placeholder = "선택",
  disabled = false,
  id: idProp,
  fullWidth = true,
  variant = "form-modal",
  className = "",
  triggerClassName = "",
  emptyValue,
  menuPlacement = "bottom",
  truncate = true,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const reactId = useId()
  const listboxId = `${reactId}-listbox`
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const display =
    selected?.label ??
    (value === "" && placeholder ? placeholder : String(value ?? ""))
  const muted =
    emptyValue !== undefined
      ? value === (emptyValue as T)
      : !selected && (value === ("" as T) || value === undefined)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return
      if (e.key === "Escape") {
        setOpen(false)
        return
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    },
    [disabled],
  )

  const base = variantClass[variant]
  const widthCls = fullWidth ? "w-full" : "w-auto min-w-0"
  const alignmentCls = truncate ? "items-center" : "items-start"
  const multilineBtnCls = truncate
    ? ""
    : "h-auto min-h-[2.75rem] py-2 leading-normal"

  return (
    <div
      ref={rootRef}
      className={`relative ${widthCls} min-w-0 max-w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={idProp}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex ${alignmentCls} justify-between gap-2 border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-primary)] focus-visible:ring-offset-0 ${base} ${widthCls} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${multilineBtnCls} ${triggerClassName}`}
      >
        <span
          className={`min-w-0 ${truncate ? "truncate" : "whitespace-normal break-words"} ${
            muted ? "text-theme-secondary" : ""
          }`}
        >
          {display}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className={`absolute left-0 z-[110] max-h-60 overflow-auto rounded-md border border-card bg-theme-primary py-1 shadow-lg ${
            variant === "compact" ? "min-w-[7rem]" : "right-0"
          } ${
            menuPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <li key={String(opt.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={opt.disabled}
                  className={`flex w-full items-center text-left ${
                    variant === "compact"
                      ? "px-2 py-1.5 text-xs"
                      : "px-3 py-2.5 text-sm sm:py-2"
                  } ${
                    opt.disabled
                      ? "cursor-not-allowed text-theme-tertiary"
                      : `cursor-pointer hover:bg-theme-tertiary ${
                          isActive
                            ? "bg-accent-theme-tertiary font-medium accent-theme-primary"
                            : opt.optionClassName ?? "text-theme-primary"
                        }`
                  }`}
                  onClick={() => {
                    if (opt.disabled) return
                    onChangeAction(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
