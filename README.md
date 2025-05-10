# Library Management System Backend

This is the backend API for the Library Management System. The API is built using Express.js and TypeScript.

## Authentication Routes

### Signup Route

**Endpoint:** `POST /students/signup`

Creates a new user account in the system.

#### Request Body
```json
{
    "email": "string",
    "password": "string",
    "name": "string",
    "studentId": "string",
    "phoneNumber": "string"
}
```

#### Validation Rules
- Email must be a valid email address
- Password must be at least 6 characters long
- Name is required
- Student ID is required

#### Response
- **Success (201)**
```json
{
    "message": "User created successfully",
    "token": "JWT_TOKEN",
    "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "studentId": "string",
        "verified": boolean
    }
}
```

- **Error (400)**
  - If user already exists
  - If validation fails
- **Error (500)**
  - Server error

### Login Route

**Endpoint:** `POST /students/login`

Authenticates a user and returns a JWT token.

#### Request Body
```json
{
    "email": "string",
    "password": "string"
}
```

#### Validation Rules
- Email must be a valid email address
- Password is required

#### Response
- **Success (200)**
```json
{
    "message": "Login successful",
    "token": "JWT_TOKEN",
    "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "studentId": "string",
        "verified": boolean
    }
}
```

- **Error (400)**
  - If credentials are invalid
  - If validation fails
- **Error (500)**
  - Server error

### Email Verification Route

**Endpoint:** `POST /students/verify-email`

Verifies a user's email using a 6-digit verification code.

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
    "verificationCode": "string" // 6-digit numeric code
}
```

#### Validation Rules
- Verification code must be exactly 6 digits
- Verification code must contain only numbers
- Valid JWT token must be provided in Authorization header

#### Response
- **Success (200)**
```json
{
    "message": "Email verified successfully"
}
```

- **Error (400)**
  - If verification code is invalid or expired
  - If validation fails
- **Error (401)**
  - If authentication token is missing or invalid
- **Error (500)**
  - Server error

## Security Features

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Session management is implemented
- CORS is enabled for localhost:3000
- Input validation using express-validator

## Environment Variables

The following environment variables are required:
- `JWT_SECRET`: Secret key for JWT token generation
- `Session_Secret`: Secret key for session management
- `PORT`: Server port (defaults to 3000)

## Error Handling

The API includes comprehensive error handling:
- Validation errors return 400 status code
- Authentication errors return 400 status code
- Server errors return 500 status code
- 404 errors for undefined routes 