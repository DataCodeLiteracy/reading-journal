import { normalizeBookTitleKey } from "@/utils/bookTitleKey"

/** Firestore 문서 ID로 안전한 base64url (UTF-8 제목 키용) */
export function titleKeyToPackDocId(titleKey: string): string {
  const utf8 = new TextEncoder().encode(titleKey)
  let bin = ""
  utf8.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function packDocIdFromBookTitle(title: string): string {
  return titleKeyToPackDocId(normalizeBookTitleKey(title))
}
