# Manual Testing Guide

Since the automated testing environment (Docker/DB) is currently unavailable, please use the following guide to verify the new features manually via Postman or Curl.

## 1. Authentication & Password Reset
### Request Password Reset
- **Endpoint**: `POST /api/student/forgot-password` (or `/api/admin/forgot-password`)
- **Body**: `{ "email": "user@example.com", "type": "user" }`
- **Expected**: A 6-digit OTP returned in the response (and logged in console/email).
- **Verification**: Check if the `VerificationToken` record is created in the DB.

### Reset Password
- **Endpoint**: `POST /api/student/reset-password`
- **Body**: `{ "email": "user@example.com", "otp": "123456", "newPassword": "newSecurePassword", "type": "user" }`
- **Expected**: `200 OK` with success message.
- **Verification**: Try logging in with the new password.

## 2. Admin Dashboard & Search
### Dashboard Statistics
- **Endpoint**: `GET /api/admin/dashboard-stats`
- **Auth**: Admin JWT required.
- **Expected**: JSON object containing `totalBooks`, `totalMembers`, `activeBorrows`, etc.

### Advanced Book Search
- **Endpoint**: `GET /api/books/getAllBooks?genre=Fiction&available=true&isOnline=false`
- **Expected**: List of books matching all criteria.

### Advanced User Search
- **Endpoint**: `GET /api/admin/getAllUsers?isVerifiedByAdmin=false&activeBorrows=0`
- **Expected**: List of users matching criteria.

## 3. Fines & Sanctions
### Book Return with Fine
- **Endpoint**: `POST /api/admin/borrowed-books/:borrowedBookId/change-status`
- **Body**: `{ "status": "returned" }`
- **Verification**: Check user `fineBalance` in DB if return is past `dueDate`.

## 4. User Roles & Borrow Limits
### Role Update
- **Endpoint**: `PATCH /api/admin/update-user-role/:userId`
- **Body**: `{ "role": "FACULTY" }`
- **Test**: Attempt to borrow 4 books (should be allowed for Faculty, denied for Student).

## 5. Book Purchase Requests
### Submit Request
- **Endpoint**: `POST /api/students/purchase-request`
- **Body**: `{ "bookTitle": "Clean Code", "author": "Robert C. Martin", "reason": "Academic" }`
- **Verification**: Admin can view this in `GET /api/admin/purchase-requests`.

## 6. Admin Bulk Import (CSV)
### Import Books
- **Endpoint**: `POST /api/admin/import/books`
- **Body**: `FormData` (file: `books.csv`)
- **Expected**: Count of created books in JSON response.

## 7. Digital Library Access
### Secure Access
- **Endpoint**: `GET /api/books/digital/:bookId`
- **Auth**: Student JWT.
- **Expected**: `403 Forbidden` for unverified users, `200 OK` with `fileUrl` for verified users.

## 8. Deployment Checklist
... (rest)
