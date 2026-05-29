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
  if (url.includes("aladin.co.kr")) {
    return "알라딘 표지"
  }
  return "표지 미리보기"
}
