import { Book } from "@/types/book"

const BOOKS_STORAGE_KEY = "reading_journal_books"

export const getBooksFromStorage = (): Book[] => {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(BOOKS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Failed to load books from storage:", error)
    return []
  }
}

export const saveBooksToStorage = (books: Book[]): void => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books))
  } catch (error) {
    console.error("Failed to save books to storage:", error)
  }
}

export const getBookFromStorage = (bookId: string): Book | null => {
  const books = getBooksFromStorage()
  return books.find((book) => book.id === bookId) || null
}

export const saveBookToStorage = (book: Book): void => {
  const books = getBooksFromStorage()
  const existingIndex = books.findIndex((b) => b.id === book.id)

  if (existingIndex >= 0) {
    books[existingIndex] = book
  } else {
    books.push(book)
  }

  saveBooksToStorage(books)
}

export const deleteBookFromStorage = (bookId: string): void => {
  const books = getBooksFromStorage()
  const filteredBooks = books.filter((book) => book.id !== bookId)
  saveBooksToStorage(filteredBooks)
}

// 데이터베이스 연동을 위한 인터페이스 (향후 확장용)
export interface StorageService {
  getBooks(): Promise<Book[]>
  getBook(id: string): Promise<Book | null>
  saveBook(book: Book): Promise<void>
  deleteBook(id: string): Promise<void>
}

// 현재는 로컬스토리지 기반, 나중에 데이터베이스로 교체 가능
export class LocalStorageService implements StorageService {
  async getBooks(): Promise<Book[]> {
    return getBooksFromStorage()
  }

  async getBook(id: string): Promise<Book | null> {
    return getBookFromStorage(id)
  }

  async saveBook(book: Book): Promise<void> {
    saveBookToStorage(book)
  }

  async deleteBook(id: string): Promise<void> {
    deleteBookFromStorage(id)
  }
}
