import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Library Management System API',
            version: '1.0.0',
            description: 'REST API documentation for the GICCL Library Management System. Covers student auth, book management, borrowing, reviews, reservations, fines, and admin operations.',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            parameters: {
                collegeCode: {
                    name: 'collegeCode',
                    in: 'query',
                    required: true,
                    schema: { type: 'string' },
                    description: 'College code identifier',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
                Book: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        bookNumber: { type: 'string' },
                        isbn: { type: 'string', nullable: true },
                        bookName: { type: 'string' },
                        author: { type: 'string' },
                        genre: { type: 'string' },
                        summary: { type: 'string' },
                        image: { type: 'string', format: 'uri' },
                        bgColor: { type: 'string' },
                        totalBooks: { type: 'integer' },
                        almirahNumber: { type: 'integer' },
                        shelfNumber: { type: 'integer' },
                        isOnline: { type: 'boolean' },
                        onlineFileUrl: { type: 'string', nullable: true },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        studentId: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        avatar: { type: 'string', nullable: true },
                        role: { type: 'string', enum: ['STUDENT', 'FACULTY', 'STAFF'] },
                        isEmailVerified: { type: 'boolean' },
                        isVerifiedByAdmin: { type: 'boolean' },
                        fineBalance: { type: 'integer' },
                    },
                },
                Review: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        rating: { type: 'integer', minimum: 1, maximum: 5 },
                        comment: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        isRead: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Student authentication & password management' },
            { name: 'Books', description: 'Book CRUD and search' },
            { name: 'Borrowing', description: 'Borrow requests, returns, history' },
            { name: 'Reviews', description: 'Book reviews' },
            { name: 'Wishlist', description: 'Saved books' },
            { name: 'Reservations', description: 'Waitlist/queue management' },
            { name: 'Renewals', description: 'Book renewal requests' },
            { name: 'Fines', description: 'Fine balance and history' },
            { name: 'Notifications', description: 'User notifications and preferences' },
            { name: 'Profile', description: 'User profile and avatar' },
            { name: 'Admin', description: 'Admin-only operations' },
        ],
        paths: {
            // ── Auth ──
            '/api/students/signup': {
                post: {
                    tags: ['Auth'], summary: 'Register a new student',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password', 'studentId', 'collegeCode'], properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, studentId: { type: 'string' }, phoneNumber: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '201': { description: 'Account created, verification email sent' }, '409': { description: 'Email already registered' } },
                },
            },
            '/api/students/login': {
                post: {
                    tags: ['Auth'], summary: 'Student login',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'collegeCode'], properties: { email: { type: 'string' }, password: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Login successful, returns JWT token' }, '401': { description: 'Invalid credentials' } },
                },
            },
            '/api/students/logout': {
                post: {
                    tags: ['Auth'], summary: 'Student logout', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Logged out, Redis token deleted' } },
                },
            },
            '/api/students/verify-email': {
                post: {
                    tags: ['Auth'], summary: 'Verify email with OTP code',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'code', 'collegeCode'], properties: { email: { type: 'string' }, code: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Email verified' }, '400': { description: 'Invalid/expired code' } },
                },
            },
            '/api/students/resend-verification': {
                post: {
                    tags: ['Auth'], summary: 'Resend email verification code',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'collegeCode'], properties: { email: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Verification code sent' }, '429': { description: 'Rate limited (60s cooldown)' } },
                },
            },
            '/api/students/forgot-password': {
                post: {
                    tags: ['Auth'], summary: 'Request password reset email',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'collegeCode'], properties: { email: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Reset email sent' }, '429': { description: 'Rate limited (3/24h)' } },
                },
            },
            '/api/students/reset-password': {
                post: {
                    tags: ['Auth'], summary: 'Reset password with token',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'password', 'collegeCode'], properties: { token: { type: 'string' }, password: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Password reset successful' } },
                },
            },
            '/api/students/change-password': {
                post: {
                    tags: ['Auth'], summary: 'Change password (logged in)', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Password changed' } },
                },
            },

            // ── Profile ──
            '/api/students/getUserDetails': {
                get: {
                    tags: ['Profile'], summary: 'Get current user details + borrowed books', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'User details with borrowed books and fine balance' } },
                },
            },
            '/api/students/profile': {
                put: {
                    tags: ['Profile'], summary: 'Update profile (name, phone)', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, phoneNumber: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Profile updated' } },
                },
            },
            '/api/students/avatar': {
                post: {
                    tags: ['Profile'], summary: 'Upload avatar image', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } },
                    responses: { '200': { description: 'Avatar uploaded, returns URL + size variants' } },
                },
                delete: {
                    tags: ['Profile'], summary: 'Remove avatar', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Avatar removed' } },
                },
            },

            // ── Books ──
            '/api/books/public': {
                get: {
                    tags: ['Books'], summary: 'List public books (paginated, filterable)',
                    parameters: [
                        { name: 'collegeCode', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'pageNumber', in: 'query', schema: { type: 'integer', default: 0 } },
                        { name: 'searchQuery', in: 'query', schema: { type: 'string' } },
                        { name: 'genre', in: 'query', schema: { type: 'string' } },
                        { name: 'isOnline', in: 'query', schema: { type: 'boolean' } },
                        { name: 'availableOnly', in: 'query', schema: { type: 'boolean' } },
                    ],
                    responses: { '200': { description: 'Paginated book list with availability counts' } },
                },
            },
            '/api/books/{bookId}': {
                get: {
                    tags: ['Books'], summary: 'Get book details',
                    parameters: [
                        { name: 'bookId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'collegeCode', in: 'query', required: true, schema: { type: 'string' } },
                    ],
                    responses: { '200': { description: 'Book details with copy availability' }, '404': { description: 'Book not found' } },
                },
            },
            '/api/books/digital/{bookId}': {
                get: {
                    tags: ['Books'], summary: 'Access digital book file', security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Returns file URL for verified users' }, '403': { description: 'Access denied' } },
                },
            },
            '/api/books/create': {
                post: {
                    tags: ['Admin'], summary: 'Create a new book', security: [{ bearerAuth: [] }],
                    responses: { '201': { description: 'Book created with copies' }, '409': { description: 'Duplicate book number' } },
                },
            },

            // ── Borrowing ──
            '/api/books/borrow': {
                post: {
                    tags: ['Borrowing'], summary: 'Request to borrow a book', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['bookId'], properties: { bookId: { type: 'string' } } } } } },
                    responses: { '201': { description: 'Borrow request created' }, '400': { description: 'Limit exceeded or duplicate' } },
                },
            },

            // ── Reviews ──
            '/api/students/reviews': {
                post: {
                    tags: ['Reviews'], summary: 'Add or update a book review', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['bookId', 'rating'], properties: { bookId: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Review updated' }, '201': { description: 'Review created' } },
                },
            },
            '/api/students/reviews/my': {
                get: {
                    tags: ['Reviews'], summary: 'Get all my reviews with book info', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'List of user reviews with book details' } },
                },
            },
            '/api/students/reviews/{reviewId}': {
                delete: {
                    tags: ['Reviews'], summary: 'Delete a review', security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Review deleted' }, '404': { description: 'Not found or not yours' } },
                },
            },
            '/api/students/books/{bookId}/reviews': {
                get: {
                    tags: ['Reviews'], summary: 'Get reviews for a book',
                    parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Reviews list with average rating' } },
                },
            },

            // ── Wishlist ──
            '/api/students/wishlist/toggle': {
                post: {
                    tags: ['Wishlist'], summary: 'Add/remove book from wishlist', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['bookId'], properties: { bookId: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Toggled' } },
                },
            },
            '/api/students/wishlist': {
                get: {
                    tags: ['Wishlist'], summary: 'Get saved books', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'List of saved books' } },
                },
            },

            // ── Reservations ──
            '/api/students/reserve/{bookId}': {
                post: {
                    tags: ['Reservations'], summary: 'Join waitlist for a book', security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '201': { description: 'Joined waitlist with position' } },
                },
                delete: {
                    tags: ['Reservations'], summary: 'Cancel reservation', security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Reservation cancelled' } },
                },
            },
            '/api/students/reservations': {
                get: {
                    tags: ['Reservations'], summary: 'Get my reservations', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Active reservations' } },
                },
            },

            // ── Renewals ──
            '/api/students/renew/{borrowedBookId}': {
                post: {
                    tags: ['Renewals'], summary: 'Request book renewal', security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'borrowedBookId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '201': { description: 'Renewal request created' } },
                },
            },
            '/api/students/renewal-requests': {
                get: {
                    tags: ['Renewals'], summary: 'Get my renewal requests', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'List of renewal requests' } },
                },
            },

            // ── Fines ──
            '/api/students/fines': {
                get: {
                    tags: ['Fines'], summary: 'Get my fine history', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Fine records with amounts and dates' } },
                },
            },

            // ── Notifications ──
            '/api/students/notifications': {
                get: {
                    tags: ['Notifications'], summary: 'Get notifications (last 20)', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Notification list' } },
                },
            },
            '/api/students/notifications/read-all': {
                put: {
                    tags: ['Notifications'], summary: 'Mark all notifications as read', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'All marked read' } },
                },
            },
            '/api/students/notification-preferences': {
                get: {
                    tags: ['Notifications'], summary: 'Get notification preferences', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Preference settings (email + in-app per category)' } },
                },
                put: {
                    tags: ['Notifications'], summary: 'Update notification preferences', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { emailBorrowStatus: { type: 'boolean' }, emailDueReminder: { type: 'boolean' }, emailOverdue: { type: 'boolean' }, inAppBorrowStatus: { type: 'boolean' }, inAppDueReminder: { type: 'boolean' }, inAppOverdue: { type: 'boolean' } } } } } },
                    responses: { '200': { description: 'Preferences updated' } },
                },
            },

            // ── Purchase Requests ──
            '/api/students/purchase-request': {
                post: {
                    tags: ['Profile'], summary: 'Submit a book purchase request', security: [{ bearerAuth: [] }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['bookTitle'], properties: { bookTitle: { type: 'string' }, author: { type: 'string' }, reason: { type: 'string' } } } } } },
                    responses: { '201': { description: 'Request submitted' } },
                },
            },

            // ── Admin ──
            '/api/admin/login': {
                post: {
                    tags: ['Admin'], summary: 'Admin login',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'collegeCode'], properties: { email: { type: 'string' }, password: { type: 'string' }, collegeCode: { type: 'string' } } } } } },
                    responses: { '200': { description: 'Admin JWT token' } },
                },
            },
            '/api/admin/dashboard-stats': {
                get: {
                    tags: ['Admin'], summary: 'Dashboard statistics', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Books, students, requests, loans counts' } },
                },
            },
            '/api/admin/analytics': {
                get: {
                    tags: ['Admin'], summary: 'Analytics data (genres, trends, top books)', security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Analytics charts data' } },
                },
            },
            '/api/admin/audit-logs': {
                get: {
                    tags: ['Admin'], summary: 'Get audit logs (paginated)', security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer' } },
                        { name: 'action', in: 'query', schema: { type: 'string' } },
                        { name: 'entity', in: 'query', schema: { type: 'string' } },
                    ],
                    responses: { '200': { description: 'Paginated audit log entries' } },
                },
            },
        },
    },
    apis: [], // We define paths inline above
};

export const swaggerSpec = swaggerJsdoc(options);
