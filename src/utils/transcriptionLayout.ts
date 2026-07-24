/** A4 손필사 시트 레이아웃 상수 */

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
export const A4_MARGIN_MM = 8
export const A4_LINES_PER_PAGE = 15

/** 인쇄 가능 높이 (상하 여백 제외) */
export const A4_USABLE_HEIGHT_MM = A4_HEIGHT_MM - A4_MARGIN_MM * 2

/** 한 필사 줄 높이 */
export const A4_LINE_HEIGHT_MM = A4_USABLE_HEIGHT_MM / A4_LINES_PER_PAGE

export const TRANSCRIPTION_PRINT_FONT_PX = 15

export const DEFAULT_TRANSCRIPTION_REPETITIONS = 10
export const MIN_TRANSCRIPTION_REPETITIONS = 1
export const MAX_TRANSCRIPTION_REPETITIONS = 20
