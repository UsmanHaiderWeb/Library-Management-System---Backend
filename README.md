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

#### Forgot Password
- **Endpoint:** `POST /api/students/forgot-password`
- **Body:** `{ email }`
- **Logic:** Sends a reset link to the student's email. Includes rate limiting (max 3 requests per 24 hours).

#### Reset Password
- **Endpoint:** `POST /api/students/reset-password`
- **Body:** `{ email, token, newPassword }`
- **Logic:** Verifies the secure token and updates the password.

### Student Profile Management

#### Update Profile Details
- **Endpoint:** `PUT /api/students/profile`
- **Body:** `{ name, phoneNumber }`
- **Logic:** Updates the logged-in student's optional details.

#### Change Password
- **Endpoint:** `POST /api/students/change-password`
- **Body:** `{ currentPassword, newPassword }`
- **Logic:** Validates current password and updates to new password.

### Admin Authentication
... (Signup/Login same as before)

---

## 👥 User Roles & Permissions

The system supports three user roles with different borrowing privileges:
- **STUDENT**: Max 3 active borrows, 14-day duration.
- **FACULTY**: Max 10 active borrows, 30-day duration.
- **STAFF**: Max 5 active borrows, 21-day duration.

Admins can update user roles via:
- **Endpoint:** `PATCH /api/admin/update-user-role/:userId`
- **Body:** `{ role: "STUDENT" | "FACULTY" | "STAFF" }`

---

## 📚 Book Management (Admin Only)

#### Bulk Import Books
- **Endpoint:** `POST /api/admin/import/books`
- **Body:** `FormData` with CSV file.
- **CSV Headers:** `bookNumber, bookName, summary, author, genre, totalBooks, almirahNumber, shelfNumber, isOnline, onlineFileUrl`

#### Bulk Import Users
- **Endpoint:** `POST /api/admin/import/users`
- **Body:** `FormData` with CSV file.
- **CSV Headers:** `name, studentId, email, phoneNumber, batchYear, role`

---

## 🔄 Borrowing & Fines

#### Borrow Request (Student)
- **Endpoint:** `POST /api/books/borrow/:bookId`
- **Logic:** Enforces role-based limits. Students cannot borrow more than their allowed quota.

#### Fines & Sanctions
- **Rate:** 10 units per day overdue.
- **Logic:** Fines are automatically calculated and added to the user's `fineBalance` during the return process if the book is overdue.

---

## 💡 Purchase Requests

#### Submit Request (Student)
- **Endpoint:** `POST /api/students/purchase-request`
- **Body:** `{ bookTitle, author, reason }`

#### Manage Requests (Admin)
- **Endpoint:** `GET /api/admin/purchase-requests`
- **Endpoint:** `POST /api/admin/purchase-requests/:requestId/status`
- **Body:** `{ status: "APPROVED" | "REJECTED" }`

---

## 🌐 Digital Library

#### Secure Access
- **Endpoint:** `GET /api/books/digital/:bookId`
- **Logic:** Only verified students/faculty can access. Returns the secure file URL for online books.

---

## 👤 Dashboard & Analytics (Admin)

#### Dashboard Stats
- **Endpoint:** `GET /api/admin/dashboard-stats`
- **Returns:** Total books, members, active borrows, and college-specific metrics.

---

## 🛠️ Infrastructure
... (Redis, ImageKit, etc.)
