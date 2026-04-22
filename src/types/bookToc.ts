/** 목차 한 줄. 내부 식별은 항상 `1` / `1.1` / `1.1.1` / `1.1.1.1` 형태(최대 4 depth). */
export type BookTocEntry = {
  path: string
  title: string
  /** 인쇄본 기준 이 장·절이 시작하는 페이지(선택). 앱 로직에 필수는 아님. */
  startPage?: number
}

export const BOOK_TOC_MAX_DEPTH = 4
