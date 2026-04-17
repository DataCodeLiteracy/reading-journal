"use client"

import { useEffect } from "react"

let lockCount = 0
let savedBodyOverflow = ""
let savedHtmlOverflow = ""

function applyLock() {
  if (typeof document === "undefined") return
  if (lockCount === 0) {
    savedBodyOverflow = document.body.style.overflow
    savedHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
  }
  lockCount += 1
}

function releaseLock() {
  if (typeof document === "undefined") return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = savedBodyOverflow
    document.documentElement.style.overflow = savedHtmlOverflow
  }
}

/**
 * 모달·시트 등 오버레이가 열려 있을 때 뒤 페이지 스크롤을 막습니다.
 * 여러 레이어가 겹쳐도 ref-count로 한 번만 해제됩니다.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    applyLock()
    return () => releaseLock()
  }, [active])
}
