import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  Timestamp,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export class ApiError extends Error {
  constructor(message: string, public code: string, public status?: number) {
    super(message)
    this.name = "ApiError"
  }
}

const convertTimestampToDate = (timestamp: any): Date | undefined => {
  if (!timestamp) return undefined
  return timestamp.toDate?.() || undefined
}

const removeUndefinedValues = (obj: any): any => {
  const cleaned: any = {}
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key]
    }
  })
  return cleaned
}

const convertFirestoreData = (data: any, docId?: string): any => {
  return {
    ...data,
    id: docId,
    created_at: convertTimestampToDate(data.created_at),
    updated_at: convertTimestampToDate(data.updated_at),
  }
}

export class ApiClient {
  static async createDocument<T extends DocumentData>(
    collectionName: string,
    id: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id)
      await setDoc(docRef, {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      throw new ApiError(
        `문서를 생성하는 중 오류가 발생했습니다.`,
        "DOCUMENT_CREATE_ERROR"
      )
    }
  }

  static async createDocumentWithAutoId<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const cleanedData = removeUndefinedValues(data)
      const collectionRef = collection(db, collectionName)
      const docRef = await addDoc(collectionRef, {
        ...cleanedData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })

      return docRef.id
    } catch (error) {
      throw new ApiError(
        `문서를 생성하는 중 오류가 발생했습니다.`,
        "DOCUMENT_CREATE_ERROR"
      )
    }
  }

  static async getDocument<T>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as any
        return convertFirestoreData(data, docSnap.id) as T
      }
      return null
    } catch (error) {
      throw new ApiError(
        `문서를 가져오는 중 오류가 발생했습니다.`,
        "DOCUMENT_FETCH_ERROR"
      )
    }
  }

  static async updateDocument<T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id)
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      throw new ApiError(
        `문서를 업데이트하는 중 오류가 발생했습니다.`,
        "DOCUMENT_UPDATE_ERROR"
      )
    }
  }

  static async deleteDocument(
    collectionName: string,
    id: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)
    } catch (error) {
      throw new ApiError(
        `문서를 삭제하는 중 오류가 발생했습니다.`,
        "DOCUMENT_DELETE_ERROR"
      )
    }
  }

  static async queryDocuments<T>(
    collectionName: string,
    conditions: Array<[string, string, any]> = [],
    orderByField?: string,
    orderDirection: "asc" | "desc" = "desc",
    limitCount?: number
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionName)
      let q = query(collectionRef)

      conditions.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator as any, value))
      })

      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection))
      }

      if (limitCount) {
        q = query(q, limit(limitCount))
      }

      const querySnapshot = await getDocs(q)

      const results = querySnapshot.docs.map((doc) => {
        const data = doc.data() as any
        return convertFirestoreData(data, doc.id) as T
      })

      return results
    } catch (error: any) {
      console.error("ApiClient.queryDocuments error:", error)

      if (error.code === "permission-denied") {
        throw new ApiError(
          "데이터에 접근할 권한이 없습니다.",
          "PERMISSION_DENIED"
        )
      }

      if (error.code === "unavailable") {
        throw new ApiError("네트워크 연결을 확인해주세요.", "NETWORK_ERROR")
      }

      if (error.code === "failed-precondition") {
        throw new ApiError(
          "필요한 인덱스가 없습니다. Firebase Console에서 인덱스를 생성해주세요.",
          "INDEX_ERROR"
        )
      }

      throw new ApiError(
        `문서를 조회하는 중 오류가 발생했습니다: ${
          error.message || error.code
        }`,
        "DOCUMENT_QUERY_ERROR"
      )
    }
  }

  static getServerTimestamp() {
    return serverTimestamp()
  }
}
