/**
 * `?return=` 쿼리로 이전 화면을 기억하고, 없으면 브라우저 뒤로가기, 불가하면 fallback.
 * 책 하위 페이지 공통 규칙에 사용합니다.
 */

export function parseReturnPathParam(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") return null
  try {
    const path = decodeURIComponent(value)
    if (!path.startsWith("/")) return null
    if (path.startsWith("//")) return null
    return path
  } catch {
    return null
  }
}

export function getReturnPathFromWindow(): string | null {
  if (typeof window === "undefined") return null
  return parseReturnPathParam(
    new URLSearchParams(window.location.search).get("return"),
  )
}

export function withReturnQuery(toPath: string, returnTo: string): string {
  const enc = encodeURIComponent(returnTo)
  const join = toPath.includes("?") ? "&" : "?"
  return `${toPath}${join}return=${enc}`
}

type RouterBack = { push: (href: string) => void; back: () => void }

/** return 쿼리 → push, 없으면 history.back, 새 탭 등이면 fallback */
export function navigateBackSmart(router: RouterBack, fallbackPath: string): void {
  const ret = getReturnPathFromWindow()
  if (ret) {
    router.push(ret)
    return
  }
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back()
    return
  }
  router.push(fallbackPath)
}
