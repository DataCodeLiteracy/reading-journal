/** KDC 대·중분류 + 세부 번호(예: 181, 소수점 이하 제외) */
export type BookKdcClassification = {
  kdcMajorCode?: string
  kdcMajorLabel?: string
  kdcMiddleCode?: string
  kdcMiddleLabel?: string
  /** 청구기호·서지 KDC에서 추출한 3자리 정수 (181.7 → 181) */
  kdcDetailCode?: string
}
