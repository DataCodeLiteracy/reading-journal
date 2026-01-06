import { ApiClient } from "@/lib/apiClient"
import { Like, ContentType } from "@/types/content"

export class LikeService {
  /**
   * 좋아요 추가
   */
  static async addLike(
    user_id: string,
    contentType: ContentType,
    contentId: string
  ): Promise<string> {
    try {
      // 중복 확인
      const existingLike = await this.getUserLike(user_id, contentType, contentId)
      if (existingLike) {
        throw new Error("이미 좋아요를 누른 콘텐츠입니다.")
      }

      // 좋아요 생성
      const likeId = await ApiClient.createDocumentWithAutoId("likes", {
        user_id,
        contentType,
        contentId,
        created_at: ApiClient.getServerTimestamp(),
      })

      // 콘텐츠의 likesCount 증가
      await this.incrementLikesCount(contentType, contentId)

      // 콘텐츠 작성자의 totalLikesReceived 증가
      await this.incrementUserLikesReceived(contentType, contentId)

      return likeId
    } catch (error) {
      console.error("LikeService.addLike error:", error)
      throw error
    }
  }

  /**
   * 좋아요 삭제
   */
  static async removeLike(
    user_id: string,
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const existingLike = await this.getUserLike(user_id, contentType, contentId)
      if (!existingLike) {
        throw new Error("좋아요를 찾을 수 없습니다.")
      }

      // 좋아요 삭제
      await ApiClient.deleteDocument("likes", existingLike.id)

      // 콘텐츠의 likesCount 감소
      await this.decrementLikesCount(contentType, contentId)

      // 콘텐츠 작성자의 totalLikesReceived 감소
      await this.decrementUserLikesReceived(contentType, contentId)
    } catch (error) {
      console.error("LikeService.removeLike error:", error)
      throw error
    }
  }

  /**
   * 사용자가 특정 콘텐츠에 좋아요를 눌렀는지 확인
   */
  static async getUserLike(
    user_id: string,
    contentType: ContentType,
    contentId: string
  ): Promise<Like | null> {
    try {
      const likes = await ApiClient.queryDocuments<Like>("likes", [
        ["user_id", "==", user_id],
        ["contentType", "==", contentType],
        ["contentId", "==", contentId],
      ])

      return likes.length > 0 ? likes[0] : null
    } catch (error) {
      console.error("LikeService.getUserLike error:", error)
      return null
    }
  }

  /**
   * 콘텐츠의 좋아요 수 조회
   */
  static async getLikesCount(
    contentType: ContentType,
    contentId: string
  ): Promise<number> {
    try {
      const likes = await ApiClient.queryDocuments<Like>("likes", [
        ["contentType", "==", contentType],
        ["contentId", "==", contentId],
      ])

      return likes.length
    } catch (error) {
      console.error("LikeService.getLikesCount error:", error)
      return 0
    }
  }

  /**
   * 콘텐츠의 likesCount 증가
   */
  private static async incrementLikesCount(
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(contentType)
      const doc = await ApiClient.getDocument<any>(collectionName, contentId)

      if (doc) {
        const currentCount = doc.likesCount || 0
        await ApiClient.updateDocument(collectionName, contentId, {
          likesCount: currentCount + 1,
        })
      }
    } catch (error) {
      console.error("LikeService.incrementLikesCount error:", error)
      // 에러가 발생해도 계속 진행 (캐시된 값이므로)
    }
  }

  /**
   * 콘텐츠의 likesCount 감소
   */
  private static async decrementLikesCount(
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(contentType)
      const doc = await ApiClient.getDocument<any>(collectionName, contentId)

      if (doc) {
        const currentCount = doc.likesCount || 0
        await ApiClient.updateDocument(collectionName, contentId, {
          likesCount: Math.max(0, currentCount - 1),
        })
      }
    } catch (error) {
      console.error("LikeService.decrementLikesCount error:", error)
      // 에러가 발생해도 계속 진행 (캐시된 값이므로)
    }
  }

  /**
   * 콘텐츠 작성자의 totalLikesReceived 증가
   */
  private static async incrementUserLikesReceived(
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(contentType)
      const doc = await ApiClient.getDocument<any>(collectionName, contentId)

      if (doc && doc.user_id) {
        const { UserStatisticsService } = await import("./userStatisticsService")
        const stats = await UserStatisticsService.getUserStatistics(doc.user_id)

        if (stats) {
          const currentLikes = stats.totalLikesReceived || 0
          await UserStatisticsService.createOrUpdateUserStatistics(doc.user_id, {
            totalLikesReceived: currentLikes + 1,
          })

          // 레벨 및 경험치 재계산
          if (stats.totalReadingTime !== undefined) {
            await UserStatisticsService.updateLevelAndExperience(
              doc.user_id,
              stats.totalReadingTime,
              currentLikes + 1,
              stats.totalCommentsWritten
            )
          }
        }
      }
    } catch (error) {
      console.error("LikeService.incrementUserLikesReceived error:", error)
      // 에러가 발생해도 계속 진행
    }
  }

  /**
   * 콘텐츠 작성자의 totalLikesReceived 감소
   */
  private static async decrementUserLikesReceived(
    contentType: ContentType,
    contentId: string
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(contentType)
      const doc = await ApiClient.getDocument<any>(collectionName, contentId)

      if (doc && doc.user_id) {
        const { UserStatisticsService } = await import("./userStatisticsService")
        const stats = await UserStatisticsService.getUserStatistics(doc.user_id)

        if (stats) {
          const currentLikes = stats.totalLikesReceived || 0
          await UserStatisticsService.createOrUpdateUserStatistics(doc.user_id, {
            totalLikesReceived: Math.max(0, currentLikes - 1),
          })

          // 레벨 및 경험치 재계산
          if (stats.totalReadingTime !== undefined) {
            await UserStatisticsService.updateLevelAndExperience(
              doc.user_id,
              stats.totalReadingTime,
              Math.max(0, currentLikes - 1),
              stats.totalCommentsWritten
            )
          }
        }
      }
    } catch (error) {
      console.error("LikeService.decrementUserLikesReceived error:", error)
      // 에러가 발생해도 계속 진행
    }
  }

  /**
   * 콘텐츠 타입에 따른 컬렉션 이름 반환
   */
  private static getCollectionName(contentType: ContentType): string {
    switch (contentType) {
      case "quote":
        return "quotes"
      case "critique":
        return "critiques"
      case "review":
        return "books"
      case "question":
        return "bookQuestions"
      case "answer":
        return "questionAnswers"
      default:
        throw new Error(`Unknown contentType: ${contentType}`)
    }
  }
}

