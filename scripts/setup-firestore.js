const { initializeApp } = require("firebase/app")
const {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
} = require("firebase/firestore")

const firebaseConfig = {
  apiKey: "AIzaSyAiS9yL_zzgEpv_D2xTcJ-M_yWWiYPayHY",
  authDomain: "reading-journal-e0457.firebaseapp.com",
  projectId: "reading-journal-e0457",
  storageBucket: "reading-journal-e0457.firebasestorage.app",
  messagingSenderId: "364330223493",
  appId: "1:364330223493:web:cfe73f11ff5b20eeb9e6ec",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const sampleUsers = [
  {
    uid: "sample_user_1",
    email: "user1@example.com",
    displayName: "독서 애호가",
    photoURL: "https://via.placeholder.com/150",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true,
  },
]

const sampleBooks = [
  {
    id: "book_1",
    userId: "sample_user_1",
    title: "1984",
    author: "George Orwell",
    cover: "https://via.placeholder.com/150x200",
    rating: 4,
    status: "completed",
    startDate: "2024-01-15",
    publishedDate: "1949-06-08",
    completedDate: "2024-01-20",
    notes: [
      "매우 흥미로운 디스토피아 소설",
      "현재 사회와 비교해볼 수 있는 부분이 많음",
    ],
    hasStartedReading: true,
    isEdited: false,
    review:
      "매우 깊이 있는 내용의 소설입니다. 현재 사회와 비교해볼 수 있는 부분이 많아서 흥미롭게 읽었습니다.",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date(),
  },
  {
    id: "book_2",
    userId: "sample_user_1",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    cover: "https://via.placeholder.com/150x200",
    rating: 5,
    status: "completed",
    startDate: "2023-12-01",
    publishedDate: "1925-04-10",
    completedDate: "2024-01-10",
    notes: ["아메리칸 드림의 허상", "화려한 문체가 인상적"],
    hasStartedReading: true,
    isEdited: false,
    review: "아메리칸 드림의 허상을 다룬 작품으로, 화려한 문체가 인상적입니다.",
    createdAt: new Date("2023-12-01"),
    updatedAt: new Date(),
  },
  {
    id: "book_3",
    userId: "sample_user_1",
    title: "해리포터와 마법사의 돌",
    author: "J.K. Rowling",
    cover: "https://via.placeholder.com/150x200",
    rating: 5,
    status: "reading",
    startDate: "2024-02-01",
    publishedDate: "1997-06-26",
    notes: ["마법 세계의 매력", "어린 시절의 추억"],
    hasStartedReading: true,
    isEdited: false,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date(),
  },
]

const sampleReadingSessions = [
  {
    id: "session_1",
    userId: "sample_user_1",
    bookId: "book_1",
    date: "2024-01-15",
    startTime: "14:30:00",
    endTime: "15:45:00",
    duration: 4500,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date(),
  },
  {
    id: "session_2",
    userId: "sample_user_1",
    bookId: "book_1",
    date: "2024-01-16",
    startTime: "09:15:00",
    endTime: "10:30:00",
    duration: 4500,
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date(),
  },
  {
    id: "session_3",
    userId: "sample_user_1",
    bookId: "book_2",
    date: "2023-12-01",
    startTime: "09:15:00",
    endTime: "10:30:00",
    duration: 4500,
    createdAt: new Date("2023-12-01"),
    updatedAt: new Date(),
  },
  {
    id: "session_4",
    userId: "sample_user_1",
    bookId: "book_3",
    date: "2024-02-01",
    startTime: "20:00:00",
    endTime: "21:30:00",
    duration: 5400,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date(),
  },
]

const sampleUserSummaries = [
  {
    userId: "sample_user_1",
    totalBooks: 3,
    readingBooks: 1,
    wantToReadBooks: 0,
    averageRating: 4.7,
    updatedAt: new Date(),
  },
]

const sampleUserStatistics = [
  {
    userId: "sample_user_1",

    totalBooks: 3,
    completedBooks: 2,
    readingBooks: 1,
    wantToReadBooks: 0,
    totalReadingTime: 18900,
    averageRating: 4.7,

    totalReadingSessions: 4,
    averageSessionDuration: 4725,
    longestSessionDuration: 5400,
    shortestSessionDuration: 4500,

    thisMonthBooks: 2,
    thisYearBooks: 3,
    thisMonthReadingTime: 9900,
    thisYearReadingTime: 18900,

    readingStreak: 7,
    longestStreak: 7,
    currentStreak: 7,

    favoriteAuthors: ["George Orwell", "F. Scott Fitzgerald", "J.K. Rowling"],
    favoriteGenres: ["소설", "판타지", "클래식"],
    mostReadMonth: "2024-01",
    mostReadDayOfWeek: "Monday",
    mostReadTimeOfDay: "evening",

    averageBooksPerMonth: 0.25,
    averageReadingTimePerDay: 51.8,
    readingGoalCompletion: 75,

    readingSpeed: 30,
    averageBookLength: 300,
    totalPagesRead: 900,

    updatedAt: new Date(),
  },
]

async function setupFirestore() {
  try {
    console.log("🚀 Firestore 컬렉션 설정을 시작합니다...")

    console.log("📝 사용자 데이터 설정 중...")
    for (const user of sampleUsers) {
      await setDoc(doc(db, "users", user.uid), {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt.toISOString(),
      })
      console.log(`✅ 사용자 ${user.displayName} 설정 완료`)
    }

    console.log("📚 책 데이터 설정 중...")
    for (const book of sampleBooks) {
      await setDoc(doc(db, "books", book.id), {
        ...book,
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString(),
      })
      console.log(`✅ 책 "${book.title}" 설정 완료`)
    }

    console.log("⏱️ 독서 세션 데이터 설정 중...")
    for (const session of sampleReadingSessions) {
      await setDoc(doc(db, "readingSessions", session.id), {
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      })
      console.log(`✅ 독서 세션 ${session.id} 설정 완료`)
    }

    console.log("📊 사용자 요약 정보 설정 중...")
    for (const summary of sampleUserSummaries) {
      await setDoc(doc(db, "userSummaries", summary.userId), {
        ...summary,
        updatedAt: summary.updatedAt.toISOString(),
      })
      console.log(`✅ 사용자 요약 정보 설정 완료`)
    }

    console.log("📈 사용자 통계 설정 중...")
    for (const statistics of sampleUserStatistics) {
      await setDoc(doc(db, "statistics", statistics.userId), {
        ...statistics,
        updatedAt: statistics.updatedAt.toISOString(),
      })
      console.log(`✅ 사용자 통계 설정 완료`)
    }

    console.log("🎉 Firestore 컬렉션 설정이 완료되었습니다!")
    console.log("\n📋 설정된 컬렉션:")
    console.log("- users: 사용자 기본 정보")
    console.log("- books: 모든 책 정보 (userId로 필터링)")
    console.log("- readingSessions: 독서 세션 (userId, bookId 외래키)")
    console.log("- userSummaries: 사용자 요약 정보 (userId 외래키)")
    console.log("- statistics: 사용자 통계 및 분석 결과 (userId 외래키)")
  } catch (error) {
    console.error("❌ Firestore 설정 중 오류 발생:", error)
  }
}

if (require.main === module) {
  setupFirestore()
}

module.exports = { setupFirestore }
