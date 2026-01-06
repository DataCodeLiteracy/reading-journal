import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadResult,
} from "firebase/storage"
import { storage } from "@/lib/firebase"
import { ApiError } from "@/lib/apiClient"

export class StorageService {
  /**
   * 오디오 파일을 Firebase Storage에 업로드
   * @param file 업로드할 파일 (Blob 또는 File)
   * @param path 저장 경로 (예: "answers/audio/userId/questionId/timestamp.webm")
   * @returns 다운로드 URL
   */
  static async uploadAudioFile(
    file: Blob | File,
    path: string
  ): Promise<string> {
    try {
      const storageRef = ref(storage, path)
      const uploadResult: UploadResult = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(uploadResult.ref)
      return downloadURL
    } catch (error) {
      console.error("Error uploading audio file:", error)
      throw new ApiError(
        "오디오 파일을 업로드하는 중 오류가 발생했습니다.",
        "STORAGE_UPLOAD_ERROR"
      )
    }
  }

  /**
   * 파일의 다운로드 URL 가져오기
   * @param path 파일 경로
   * @returns 다운로드 URL
   */
  static async getDownloadURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path)
      const downloadURL = await getDownloadURL(storageRef)
      return downloadURL
    } catch (error) {
      console.error("Error getting download URL:", error)
      throw new ApiError(
        "파일 URL을 가져오는 중 오류가 발생했습니다.",
        "STORAGE_GET_URL_ERROR"
      )
    }
  }

  /**
   * Firebase Storage에서 파일 삭제
   * @param path 삭제할 파일 경로
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path)
      await deleteObject(storageRef)
    } catch (error) {
      console.error("Error deleting file:", error)
      throw new ApiError(
        "파일을 삭제하는 중 오류가 발생했습니다.",
        "STORAGE_DELETE_ERROR"
      )
    }
  }

  /**
   * URL에서 파일 경로 추출
   * @param url Firebase Storage URL
   * @returns 파일 경로
   */
  static extractPathFromURL(url: string): string | null {
    try {
      // Firebase Storage URL 형식: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
      const match = url.match(/\/o\/(.+?)\?/)
      if (match && match[1]) {
        return decodeURIComponent(match[1])
      }
      return null
    } catch (error) {
      console.error("Error extracting path from URL:", error)
      return null
    }
  }

  /**
   * 답변 오디오 파일 경로 생성
   * @param userId 사용자 ID
   * @param questionId 질문 ID
   * @param timestamp 타임스탬프 (선택, 없으면 현재 시간 사용)
   * @returns 파일 경로
   */
  static generateAnswerAudioPath(
    userId: string,
    questionId: string,
    timestamp?: number
  ): string {
    const ts = timestamp || Date.now()
    const fileName = `${ts}.webm`
    return `answers/audio/${userId}/${questionId}/${fileName}`
  }
}

