"use client"

import { forwardRef } from "react"
import { Calendar, Clock } from "lucide-react"

export type FormNativePickerInputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type"
> & {
  picker: "date" | "time"
  /**
   * true면 `form-control` 없이 `className`만 적용 (관리자 필터 등).
   * 이 경우 높이·테두리·배경은 className에 모두 넣어야 함.
   */
  bare?: boolean
  /** 바깥 래퍼 (flex 레이아웃 등) */
  wrapperClassName?: string
}

export const FormNativePickerInput = forwardRef<
  HTMLInputElement,
  FormNativePickerInputProps
>(function FormNativePickerInput(
  { picker, className = "", bare, wrapperClassName = "", onClick, ...rest },
  ref
) {
  const Icon = picker === "date" ? Calendar : Clock

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    onClick?.(e)
    if (typeof window === "undefined") return
    if (!/firefox/i.test(navigator.userAgent)) return
    try {
      e.currentTarget.showPicker?.()
    } catch {
      /* ignore */
    }
  }

  const inputClass = bare
    ? `box-border w-full min-w-0 cursor-pointer pr-10 ${className}`.trim()
    : `form-control w-full min-w-0 cursor-pointer pr-10 ${className}`.trim()

  return (
    <div
      className={`form-native-picker-field relative w-full min-w-0 ${wrapperClassName}`.trim()}
    >
      <input
        ref={ref}
        type={picker}
        className={inputClass}
        onClick={handleClick}
        {...rest}
      />
      <Icon
        className="pointer-events-none absolute right-3 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-accent-theme"
        aria-hidden
      />
    </div>
  )
})
