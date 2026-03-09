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
- **Endpoint**: `POST /api/admin/return-book/:borrowedBookId`
- **Body**: `{ "status": "returned" }`
- **Expected**: `fineApplied` amount in response if the book is overdue (DueDate < Now).
- **Verification**: Check the user's `fineBalance` in the database to see if it incremented correctly.

## 4. Email Notifications
### Signup Verification
- **Endpoint**: `POST /api/student/signup`
- **Expected**: Success response + Console log "Email service: Verification email sent to..."
- **Verification**: Verify that an OTP is generated and linked to the user.

## 5. Deployment Checklist
- [ ] Run `npx prisma db push` once the database is reachable.
- [ ] Update `.env` with valid `EMAIL_USER` and `EMAIL_PASS`.
- [ ] Verify Redis is running for caching dashboard stats.
