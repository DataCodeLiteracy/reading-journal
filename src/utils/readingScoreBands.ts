/** 이해도 점검·발췌 요약 평균(1~10)에 따른 구간 문구 */
export function labelForAverageScore(avg: number): string {
  const a = Math.round(avg * 10) / 10
  if (a <= 5) return "5점 이하 · 다시 읽으며 정리해 보면 좋아요"
  if (a < 8) return "6~7점대 · 흐름을 조금 더 다듬어 보면 좋아요"
  if (a < 9) return "8점대 · 괜찮은 이해예요"
  if (a < 10) return "9점대 · 잘 이해하고 있어요"
  return "10점 만점 구간 · 요지를 잘 짚었어요"
}
