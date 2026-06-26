import { normalizeBookDuplicateKey } from "@/utils/bookTitleKey"
import { titleKeyToPackDocId } from "@/utils/titleKeyDocId"

export function editionKeyFromBook(
  title: string,
  publisher?: string,
): string {
  return normalizeBookDuplicateKey(title, publisher)
}

/** 기본 판본 canonical 문서 ID (제목+출판사 키) */
export function primaryCanonicalDocId(title: string, publisher?: string): string {
  return titleKeyToPackDocId(editionKeyFromBook(title, publisher))
}
