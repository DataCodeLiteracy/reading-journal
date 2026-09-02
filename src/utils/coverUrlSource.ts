export function isCloudinaryCoverUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("res.cloudinary.com")
  } catch {
    return false
  }
}

export function coverPreviewCaption(url: string): string {
  if (isCloudinaryCoverUrl(url)) {
    return "업로드한 표지 (Cloudinary)"
  }
  if (url.includes("kakaocdn.net") || url.includes("daumcdn.net")) {
    return "외부 도서 표지"
  }
  if (url.includes("cover.nl.go.kr") || url.includes("nl.go.kr")) {
    return "국립중앙도서관 표지"
  }
  if (url.includes("aladin.co.kr")) {
    return "알라딘 표지"
  }
  return "표지 미리보기"
}
