# Library Management System Backend

This is the backend API for the Library Management System, built with **Express.js**, **TypeScript**, **Prisma (MySQL)**, and **Redis**.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- MySQL
- Redis

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL="mysql://user:password@localhost:3306/lms"
JWT_SECRET="your-secret-key"
Session_Secret="your-session-secret"
REDIS_URL="redis://localhost:6379"

# ImageKit Credentials
IMAGE_KIT_PUBLIC_KEY="your-public-key"
IMAGE_KIT_PRIVATE_KEY="your-private-key"
IMAGE_KIT_URL="your-url-endpoint"
```

---

## 🔐 Authentication APIs

### Student Authentication

#### Signup
- **Endpoint:** `POST /api/students/signup`
- **Body:** `{ name, email, password, studentId, collegeCode }`
- **Logic:** Creates a student user and returns a JWT.

#### Login
- **Endpoint:** `POST /api/students/login`
- **Body:** `{ email, password, collegeCode }`
- **Logic:** Authenticates student and returns a JWT.

#### Verify Email
- **Endpoint:** `POST /api/students/verify-email`
- **Header:** `Authorization: Bearer <token>`
- **Body:** `{ verificationCode }` (6-digit numeric)
- **Logic:** Marks student email as verified.

### Admin Authentication

#### Signup
- **Endpoint:** `POST /api/admin/signup`
- **Body:** `{ name, email, password, collegeCode }`
- **Logic:** Creates an admin for a specific college.

#### Login
- **Endpoint:** `POST /api/admin/login`
- **Body:** `{ email, password }`
- **Logic:** Authenticates admin and returns a JWT.

---

## 📚 Book Management (Admin Only)

#### Create Book
- **Endpoint:** `POST /api/books/create`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Body:** `{ bookNumber, bookName, summary, author, genre, image, bgColor, totalBooks, almirahNumber, shelfNumber, isOnline?, onlineFileUrl? }`
- **Logic:** Creates a book record and automatically generates `totalBooks` copies in the database.

#### Update Book
- **Endpoint:** `POST /api/books/update/:bookId`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Body:** (Same as Create)
- **Logic:** Updates metadata. If `totalBooks` increases, it adds new copies. If it decreases, it attempts to remove unborrowed copies.

#### Delete Book
- **Endpoint:** `DELETE /api/books/delete/:bookId`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Logic:** Deletes the book and all associated copies/requests (Cascade).

---

## 🔄 Borrowing System

#### Borrow Request (Student)
- **Endpoint:** `POST /api/books/borrow/:bookId`
- **Header:** `Authorization: Bearer <Student_Token>`
- **Logic:** Creates a "pending" borrow request. Limit: 2 active borrows per student (enforced via Redis/DB).

#### List All Requests (Admin)
- **Endpoint:** `GET /api/admin/all-borrow-requests`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Query Params:** `pageNumber`, `searchQuery`
- **Logic:** View all pending/accepted/rejected requests for the admin's college.

#### Accept/Reject Request (Admin)
- **Endpoint:** `POST /api/admin/borrow-requests/change-status/:borrowRequestId`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Body:** `{ status: "accepted" | "rejected" }`
- **Logic:** 
  - If **Accepted**: Assigns an available `BookCopy`, creates a `BorrowedBook` record, and sets a 14-day due date.
  - If **Rejected**: Updates request status.

#### Return Book (Admin)
- **Endpoint:** `POST /api/admin/borrowed-books/:borrowedBookId/change-status`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Body:** `{ status: "returned" }`
- **Logic:** Marks book as returned, releases the `BookCopy`, and clears the user's borrow count from Redis.

#### View History (Admin)
- **Endpoint:** `GET /api/admin/borrowed-books/history`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Query Params:** `pageNumber`, `searchQuery`
- **Logic:** List all returned books.

---

## 👤 User & Profile

#### Get Student Details
- **Endpoint:** `GET /api/students/getUserDetails`
- **Header:** `Authorization: Bearer <Student_Token>`
- **Logic:** Returns student info and their full borrowing history.

#### Get Admin Details
- **Endpoint:** `GET /api/admin/getAdminDetails`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Logic:** Returns authenticated admin info.

#### List All Students (Admin)
- **Endpoint:** `GET /api/admin/getAllUsers`
- **Header:** `Authorization: Bearer <Admin_Token>`
- **Query Params:** `pageNumber`, `searchQuery`
- **Logic:** Paginated list of students in the admin's college.

---

## 🛠️ Infrastructure & Security

- **Redis Caching:** Used to store and verify `college` and `admin` session data to reduce DB load in middlewares. Also caches student borrow counts.
- **ImageKit:** Admin can get auth tokens for client-side uploads via `GET /api/admin/imagekit-authentication-tokens`.
- **Validation:** Robust input validation using `express-validator`.
- **RBAC:** Middleware ensures students cannot access admin routes and vice-versa.
