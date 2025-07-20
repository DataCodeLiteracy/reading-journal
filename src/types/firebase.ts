import { Timestamp } from "firebase/firestore"

export type FirestoreTimestamp = Timestamp

export type AppDate = Date

export interface FirestoreDocument {
  createdAt?: FirestoreTimestamp
  updatedAt?: FirestoreTimestamp
}

export interface AppDocument {
  createdAt?: AppDate
  updatedAt?: AppDate
}

export interface FirestoreInput {
  createdAt?: any
  updatedAt?: any
}
