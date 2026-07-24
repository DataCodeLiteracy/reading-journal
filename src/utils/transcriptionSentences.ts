export type TranscriptionUnitMode = "sentence" | "quote"

const SENTENCE_END = /([.?!。？！]+)/

/**
 * 마침표·느낌표·물음표(한/영)와 줄바꿈을 기준으로 문장 분리.
 * 부호는 앞 문장에 붙인다.
 */
export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  const byLines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const sentences: string[] = []
  for (const line of byLines) {
    const parts = line.split(SENTENCE_END)
    let current = ""
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? ""
      if (!part) continue
      if (SENTENCE_END.test(part)) {
        current += part
        const trimmed = current.trim()
        if (trimmed) sentences.push(trimmed)
        current = ""
      } else {
        current += part
      }
    }
    const rest = current.trim()
    if (rest) sentences.push(rest)
  }
  return sentences
}

export function unitsFromQuoteText(
  quoteText: string,
  mode: TranscriptionUnitMode,
): string[] {
  if (mode === "quote") {
    const t = quoteText.trim()
    return t ? [t] : []
  }
  return splitIntoSentences(quoteText)
}
