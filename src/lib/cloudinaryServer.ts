import { v2 as cloudinary, type UploadApiResponse } from "cloudinary"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

function ensureConfigured() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const api_key = process.env.CLOUDINARY_API_KEY?.trim()
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim()
  const upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim()

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary 환경변수(CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)가 필요합니다.",
    )
  }
  if (!upload_preset) {
    throw new Error("CLOUDINARY_UPLOAD_PRESET 환경변수가 필요합니다.")
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
  return { upload_preset }
}

export async function uploadBookCoverImage(
  fileBuffer: Buffer,
  mimeType: string,
  options: { userId: string; bookId?: string },
): Promise<string> {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error("JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.")
  }
  if (fileBuffer.length > MAX_BYTES) {
    throw new Error("표지 이미지는 5MB 이하여야 합니다.")
  }

  const { upload_preset } = ensureConfigured()
  const suffix = options.bookId
    ? options.bookId
    : `draft_${Date.now()}`
  const publicId = `covers/${options.userId}/${suffix}`

  const result = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          upload_preset,
          public_id: publicId,
          overwrite: true,
          resource_type: "image",
        },
        (err, res) => {
          if (err) reject(err)
          else if (!res?.secure_url) {
            reject(new Error("Cloudinary 업로드 응답이 비어 있습니다."))
          } else resolve(res)
        },
      )
      stream.end(fileBuffer)
    },
  )

  return result.secure_url
}
