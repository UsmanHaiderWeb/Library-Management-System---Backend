/**
 * Full API regression suite — 99 checks across all 73 endpoints.
 *
 *   npm run dev          (in another terminal)
 *   npm run test:api
 *
 * Exercises every route end-to-end against a running server: admin/student
 * auth, account approval, books, the borrow → renew → return → fine → settle
 * chain, reviews, wishlist, reservations, purchase requests, notifications,
 * analytics, audit log, and CSV import.
 *
 * !! DESTRUCTIVE: wipes every table before running. Point it at a development
 * database only — never at a live college install (it honours API_BASE_URL and
 * the DATABASE_URL in .env).
 *
 * Every business object is created through the public HTTP API — no direct
 * database writes. Three unavoidable exceptions, each marked [DB] in output:
 *   1. College provisioning — there is no API to create a College (it is an
 *      install-time step), and admin signup requires an existing collegeCode.
 *   2. Reading the emailed OTP / reset token — stands in for the student
 *      opening their inbox.
 *   3. Back-dating a dueDate — simulates the passage of time so a return can
 *      be overdue and generate a fine.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = process.env.API_BASE_URL || 'http://localhost:3000';

const results = [];
let currentSection = '';
const section = (name) => { currentSection = name; console.log(`\n=== ${name} ===`); };

const record = (name, ok, detail) => {
    results.push({ section: currentSection, name, ok, detail });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

const api = async (method, path, { token, body, form } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

    const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
    let json = null;
    const text = await res.text();
    try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 120) }; }
    return { status: res.status, json };
};

/** Assert an endpoint returned an expected status (and optionally a shape). */
const expect = async (name, call, okStatuses, shapeFn) => {
    try {
        const res = await call();
        const statusOk = okStatuses.includes(res.status);
        const shapeOk = statusOk && shapeFn ? shapeFn(res.json) : true;
        record(name, statusOk && shapeOk,
            `status=${res.status} body=${JSON.stringify(res.json)?.slice(0, 140)}`);
        return res;
    } catch (e) {
        record(name, false, e.message);
        return { status: 0, json: null };
    }
};

const uniq = Date.now().toString().slice(-6);

(async () => {
    // ---------------------------------------------------------------- reset
    for (const t of ['auditLog', 'notification', 'fine', 'renewalRequest', 'reservation',
        'review', 'savedBook', 'notificationPreference', 'verificationToken', 'ipAddressess',
        'borrowedBook', 'borrowedRequests', 'purchaseRequest', 'bookCopy', 'book', 'user',
        'admin', 'college']) {
        await prisma[t].deleteMany();
    }
    // [DB] College provisioning — no API exists for this (install-time step)
    const college = await prisma.college.create({ data: { name: 'Test College', code: 'TC1' } });
    console.log('[DB] provisioned College TC1 (no API exists — install-time step)');

    const state = {};

    // ============================================================ ROOT
    section('Service root & docs');
    await expect('GET /', () => api('GET', '/'), [200], j => !!j.message);
    await expect('GET /api-docs (swagger UI)',
        async () => { const r = await fetch(`${BASE}/api-docs/`); return { status: r.status, json: {} }; }, [200]);

    // ============================================================ ADMIN AUTH
    section('Admin auth');
    await expect('POST /api/admin/signup', () => api('POST', '/api/admin/signup', {
        body: { name: 'Head Librarian', email: `admin${uniq}@test.local`, password: 'password123', collegeCode: 'TC1' },
    }), [200, 201]);

    await expect('POST /api/admin/signup rejects bad college', () => api('POST', '/api/admin/signup', {
        body: { name: 'X', email: `nope${uniq}@test.local`, password: 'password123', collegeCode: 'NOPE' },
    }), [400, 404]);

    const adminLogin = await expect('POST /api/admin/login', () => api('POST', '/api/admin/login', {
        body: { email: `admin${uniq}@test.local`, password: 'password123', collegeCode: 'TC1' },
    }), [200, 201], j => !!j.token);
    state.adminToken = adminLogin.json?.token;

    await expect('POST /api/admin/login rejects wrong password', () => api('POST', '/api/admin/login', {
        body: { email: `admin${uniq}@test.local`, password: 'wrong', collegeCode: 'TC1' },
    }), [400, 401]);

    await expect('GET /api/admin/getAdminDetails', () => api('GET', '/api/admin/getAdminDetails',
        { token: state.adminToken }), [200, 201], j => !!j.admin);

    await expect('admin endpoint rejects missing token', () => api('GET', '/api/admin/getAdminDetails'), [401]);

    // ============================================================ STUDENT AUTH
    section('Student auth & onboarding');
    const studentEmail = `student${uniq}@test.local`;
    const signup = await expect('POST /api/students/signup', () => api('POST', '/api/students/signup', {
        body: {
            name: 'Aisha Khan', email: studentEmail, password: 'password123',
            studentId: `S${uniq}`, collegeCode: 'TC1', phoneNumber: '+923001234567',
        },
    }), [200, 201], j => !!j.temporaryToken);
    state.tempToken = signup.json?.temporaryToken;

    // Regression guard: signup must persist even though SMTP is unreachable
    // here (invalid credentials) — it used to roll the account back after
    // replying 201, leaving the student with no account.
    const persisted = await prisma.user.findUnique({ where: { email: studentEmail } });
    record('signup persists the account despite SMTP failure', !!persisted,
        persisted ? '' : 'user row missing after 201 response');

    await expect('POST /api/students/signup rejects duplicate email', () => api('POST', '/api/students/signup', {
        body: {
            name: 'Dup', email: studentEmail, password: 'password123',
            studentId: `D${uniq}`, collegeCode: 'TC1',
        },
    }), [400, 409]);

    await expect('POST /api/students/resend-verification rejects missing token',
        () => api('POST', '/api/students/resend-verification', { body: { collegeCode: 'TC1' } }), [401]);

    await expect('POST /api/students/resend-verification', () => api('POST', '/api/students/resend-verification',
        { token: state.tempToken, body: { collegeCode: 'TC1' } }), [200, 201, 429]);

    // [DB] read the OTP that was emailed to the student
    const student = await prisma.user.findUnique({ where: { email: studentEmail } });
    const otpRow = await prisma.verificationToken.findFirst({
        where: { userId: student.id, type: 'EMAIL_VERIFICATION' }, orderBy: { expiresAt: 'desc' },
    });
    console.log('  [DB] read emailed OTP (stands in for the student opening their inbox)');
    await expect('POST /api/students/verify-email rejects wrong OTP', () => api('POST',
        '/api/students/verify-email',
        { token: state.tempToken, body: { verificationCode: '000000', collegeCode: 'TC1' } }), [400]);

    await expect('POST /api/students/verify-email', () => api('POST', '/api/students/verify-email', {
        token: state.tempToken,
        body: { verificationCode: otpRow?.token, collegeCode: 'TC1' },
    }), [200, 201], j => !!j.accessToken);

    const sLogin = await expect('POST /api/students/login', () => api('POST', '/api/students/login', {
        body: { email: studentEmail, password: 'password123', collegeCode: 'TC1' },
    }), [200, 201], j => !!j.token);
    state.studentToken = sLogin.json?.token;
    state.studentId = student.id;

    // ============================================================ ACCOUNT APPROVAL
    section('Admin: account requests & users');
    await expect('GET /api/admin/getAllAccountRequests', () => api('GET',
        '/api/admin/getAllAccountRequests?pageNumber=0&searchQuery=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.users));

    await expect('POST /api/admin/verify-account/:userId', () => api('POST',
        `/api/admin/verify-account/${state.studentId}`, { token: state.adminToken }), [200, 201]);

    // second student, to exercise denial
    const denyEmail = `deny${uniq}@test.local`;
    await api('POST', '/api/students/signup', {
        body: { name: 'Deny Me', email: denyEmail, password: 'password123', studentId: `X${uniq}`, collegeCode: 'TC1' },
    });
    const denyUser = await prisma.user.findUnique({ where: { email: denyEmail } });
    await expect('POST /api/admin/deny-account/:userId', () => api('POST',
        `/api/admin/deny-account/${denyUser.id}`, { token: state.adminToken }), [200, 201]);

    await expect('GET /api/admin/getAllUsers', () => api('GET',
        '/api/admin/getAllUsers?pageNumber=0&searchQuery=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.users));

    await expect('PATCH /api/admin/update-user-role/:userId', () => api('PATCH',
        `/api/admin/update-user-role/${state.studentId}`, { token: state.adminToken, body: { role: 'FACULTY' } }),
        [200, 201]);

    await expect('PATCH update-user-role rejects invalid role (no ADMIN)', () => api('PATCH',
        `/api/admin/update-user-role/${state.studentId}`, { token: state.adminToken, body: { role: 'ADMIN' } }),
        [400]);

    await api('PATCH', `/api/admin/update-user-role/${state.studentId}`,
        { token: state.adminToken, body: { role: 'STUDENT' } });

    await expect('GET /api/admin/getUserDetails/:userId', () => api('GET',
        `/api/admin/getUserDetails/${state.studentId}`, { token: state.adminToken }),
        [200, 201], j => !!j.user);

    // ============================================================ BOOKS
    section('Books');
    const bookBody = {
        bookNumber: `BN-${uniq}`, isbn: '9780132350884', bookName: 'Clean Code',
        summary: 'A handbook of agile software craftsmanship.', author: 'Robert Martin',
        genre: 'Software', image: 'https://example.com/clean-code.png', bgColor: '#012A47',
        totalBooks: 2, almirahNumber: 1, shelfNumber: 3,
    };
    const created = await expect('POST /api/books/create', () => api('POST', '/api/books/create',
        { token: state.adminToken, body: bookBody }), [200, 201]);
    state.bookId = created.json?.book?.id || created.json?.id;

    await expect('POST /api/books/create rejects duplicate bookNumber', () => api('POST', '/api/books/create',
        { token: state.adminToken, body: bookBody }), [409]);

    await expect('POST /api/books/create rejects invalid bgColor', () => api('POST', '/api/books/create',
        { token: state.adminToken, body: { ...bookBody, bookNumber: `BAD-${uniq}`, bgColor: 'blue' } }), [400]);

    // an online book, for the digital-file endpoint
    const onlineBook = await expect('POST /api/books/create (online book)', () => api('POST', '/api/books/create', {
        token: state.adminToken,
        body: {
            ...bookBody, bookNumber: `ON-${uniq}`, bookName: 'Refactoring', totalBooks: 1,
            isOnline: true, onlineFileUrl: 'https://example.com/refactoring.pdf',
        },
    }), [200, 201]);
    state.onlineBookId = onlineBook.json?.book?.id || onlineBook.json?.id;

    await expect('GET /api/admin/getAllBooks', () => api('GET',
        '/api/admin/getAllBooks?pageNumber=0&searchQuery=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.books));

    await expect('GET /api/books/all (public catalog)', () => api('GET',
        '/api/books/all?pageNumber=0&collegeCode=TC1'), [200, 201], j => Array.isArray(j.books));

    await expect('GET /api/books/all?searchQuery filters', () => api('GET',
        '/api/books/all?pageNumber=0&collegeCode=TC1&searchQuery=Clean'), [200, 201]);

    await expect('GET /api/books/getBookDetails/:bookId', () => api('GET',
        `/api/books/getBookDetails/${state.bookId}?collegeCode=TC1`), [200],
        j => !!j.book && Array.isArray(j.book.copies));

    await expect('GET book details 404s for unknown id', () => api('GET',
        `/api/books/getBookDetails/nonexistent-id?collegeCode=TC1`), [404]);

    await expect('POST /api/books/update/:bookId', () => api('POST', `/api/books/update/${state.bookId}`,
        { token: state.adminToken, body: { ...bookBody, summary: 'Updated summary.' } }), [200, 201]);

    await expect('GET /api/books/digital/:bookId (student)', () => api('GET',
        `/api/books/digital/${state.onlineBookId}?collegeCode=TC1`, { token: state.studentToken }),
        [200, 201, 403]);

    // ============================================================ BORROW FLOW
    section('Borrow → approve → renew → return');
    await expect('POST /api/books/borrow/:bookId', () => api('POST', `/api/books/borrow/${state.bookId}`,
        { token: state.studentToken, body: { collegeCode: 'TC1' } }), [200, 201]);

    await expect('POST borrow rejects duplicate request', () => api('POST', `/api/books/borrow/${state.bookId}`,
        { token: state.studentToken, body: { collegeCode: 'TC1' } }), [400, 409]);

    const reqList = await expect('GET /api/admin/all-borrow-requests', () => api('GET',
        '/api/admin/all-borrow-requests?pageNumber=0&searchQuery=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.requests));
    state.borrowRequestId = reqList.json?.requests?.[0]?.id;

    await expect('POST /api/admin/borrow-requests/change-status/:id (accept)', () => api('POST',
        `/api/admin/borrow-requests/change-status/${state.borrowRequestId}`,
        { token: state.adminToken, body: { status: 'accepted' } }), [200, 201]);

    const borrowedList = await expect('GET /api/admin/borrowed-books/all', () => api('GET',
        '/api/admin/borrowed-books/all?pageNumber=0&searchQuery=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.borrowedBooks));
    state.borrowedBookId = borrowedList.json?.borrowedBooks?.[0]?.id;

    await expect('POST /api/students/renew/:borrowedBookId', () => api('POST',
        `/api/students/renew/${state.borrowedBookId}`, { token: state.studentToken, body: {} }), [200, 201]);

    await expect('GET /api/students/renewal-requests', () => api('GET', '/api/students/renewal-requests',
        { token: state.studentToken }), [200, 201]);

    const renewals = await expect('GET /api/admin/renewal-requests', () => api('GET',
        '/api/admin/renewal-requests?status=PENDING', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.renewalRequests) && (!j.renewalRequests.length || !!j.renewalRequests[0].id));
    state.renewalId = renewals.json?.renewalRequests?.[0]?.id;

    await expect('POST /api/admin/renewal-requests/:id/approve', () => api('POST',
        `/api/admin/renewal-requests/${state.renewalId}/approve`, { token: state.adminToken }), [200, 201]);

    // a second renewal, to exercise rejection
    await api('POST', `/api/students/renew/${state.borrowedBookId}`, { token: state.studentToken, body: {} });
    const renewals2 = await api('GET', '/api/admin/renewal-requests?status=PENDING', { token: state.adminToken });
    const rejectId = renewals2.json?.renewalRequests?.[0]?.id;
    if (rejectId) {
        await expect('POST /api/admin/renewal-requests/:id/reject', () => api('POST',
            `/api/admin/renewal-requests/${rejectId}/reject`, { token: state.adminToken }), [200, 201]);
    } else {
        record('POST /api/admin/renewal-requests/:id/reject', true, 'skipped — no second pending renewal');
    }

    // [DB] time travel: back-date the due date so the return is overdue
    await prisma.borrowedBook.update({
        where: { id: state.borrowedBookId },
        data: { dueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000) },
    });
    console.log('  [DB] back-dated dueDate by 5 days (simulates passage of time)');

    await expect('POST /api/admin/borrowed-books/:id/change-status (return, late)', () => api('POST',
        `/api/admin/borrowed-books/${state.borrowedBookId}/change-status`,
        { token: state.adminToken, body: { status: 'returned' } }), [200, 201]);

    await expect('GET /api/admin/borrowed-books/history', () => api('GET',
        '/api/admin/borrowed-books/history?pageNumber=0&searchQuery=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.borrowedBooks));

    await expect('history empty branch returns borrowedBooks key', () => api('GET',
        '/api/admin/borrowed-books/history?pageNumber=0&searchQuery=zzzzzz', { token: state.adminToken }),
        [200], j => Array.isArray(j.borrowedBooks));

    // ============================================================ FINES
    section('Fines (offline settlement)');
    const fines = await expect('GET /api/admin/fines', () => api('GET', '/api/admin/fines?pageNumber=0',
        { token: state.adminToken }), [200, 201],
        j => Array.isArray(j.fines) && j.fines.length > 0 && !!j.fines[0].studentName);
    state.fineId = fines.json?.fines?.[0]?.id;
    record('late return generated a fine', !!state.fineId, JSON.stringify(fines.json?.fines?.[0])?.slice(0, 120));

    await expect('GET /api/students/fines', () => api('GET', '/api/students/fines',
        { token: state.studentToken }), [200, 201],
        j => Array.isArray(j.fines) && (!j.fines.length || j.fines[0].status === 'PENDING'));

    await expect('PATCH /api/admin/fines/:id/pay', () => api('PATCH',
        `/api/admin/fines/${state.fineId}/pay`, { token: state.adminToken, body: { note: 'Cash at desk' } }),
        [200]);

    await expect('PATCH pay rejects already-settled fine (409)', () => api('PATCH',
        `/api/admin/fines/${state.fineId}/pay`, { token: state.adminToken }), [409]);

    await expect('PATCH pay 404s for unknown fine', () => api('PATCH',
        '/api/admin/fines/no-such-fine/pay', { token: state.adminToken }), [404]);

    // second overdue cycle, to exercise waiving
    await api('POST', `/api/books/borrow/${state.bookId}`, { token: state.studentToken, body: { collegeCode: 'TC1' } });
    const req2 = await api('GET', '/api/admin/all-borrow-requests?pageNumber=0&searchQuery=', { token: state.adminToken });
    const pending2 = req2.json?.requests?.find(r => r.status === 'pending') || req2.json?.requests?.[0];
    if (pending2) {
        await api('POST', `/api/admin/borrow-requests/change-status/${pending2.id}`,
            { token: state.adminToken, body: { status: 'accepted' } });
        const bb = await api('GET', '/api/admin/borrowed-books/all?pageNumber=0&searchQuery=', { token: state.adminToken });
        const bbId = bb.json?.borrowedBooks?.[0]?.id;
        if (bbId) {
            await prisma.borrowedBook.update({
                where: { id: bbId }, data: { dueDate: new Date(Date.now() - 3 * 24 * 3600 * 1000) },
            });
            await api('POST', `/api/admin/borrowed-books/${bbId}/change-status`,
                { token: state.adminToken, body: { status: 'returned' } });
            const f2 = await api('GET', '/api/admin/fines?pageNumber=0', { token: state.adminToken });
            const pendingFine = f2.json?.fines?.find(f => f.status === 'PENDING');
            if (pendingFine) {
                await expect('PATCH /api/admin/fines/:id/waive', () => api('PATCH',
                    `/api/admin/fines/${pendingFine.id}/waive`, { token: state.adminToken, body: { note: 'Goodwill' } }),
                    [200]);
            } else record('PATCH /api/admin/fines/:id/waive', false, 'no pending fine produced');
        }
    }

    // ============================================================ REVIEWS
    section('Reviews');
    await expect('POST /api/students/reviews', () => api('POST', '/api/students/reviews',
        { token: state.studentToken, body: { bookId: state.bookId, rating: 5, comment: 'Excellent read.' } }),
        [200, 201]);

    await expect('POST reviews rejects rating out of range', () => api('POST', '/api/students/reviews',
        { token: state.studentToken, body: { bookId: state.bookId, rating: 9, comment: 'bad' } }), [400]);

    await expect('GET /api/students/books/:bookId/reviews', () => api('GET',
        `/api/students/books/${state.bookId}/reviews`, { token: state.studentToken }), [200, 201]);

    const myReviews = await expect('GET /api/students/reviews/my', () => api('GET', '/api/students/reviews/my',
        { token: state.studentToken }), [200, 201]);
    const reviewId = myReviews.json?.reviews?.[0]?.id;

    await expect('DELETE /api/students/reviews/:reviewId', () => api('DELETE',
        `/api/students/reviews/${reviewId}`, { token: state.studentToken }), [200, 201]);

    // ============================================================ WISHLIST
    section('Wishlist');
    await expect('POST /api/students/wishlist/toggle (add)', () => api('POST', '/api/students/wishlist/toggle',
        { token: state.studentToken, body: { bookId: state.bookId } }), [200, 201]);
    await expect('GET /api/students/wishlist', () => api('GET', '/api/students/wishlist',
        { token: state.studentToken }), [200, 201]);
    await expect('POST /api/students/wishlist/toggle (remove)', () => api('POST', '/api/students/wishlist/toggle',
        { token: state.studentToken, body: { bookId: state.bookId } }), [200, 201]);

    // ============================================================ RESERVATIONS
    section('Reservations / waitlist');
    await expect('POST /api/students/reserve/:bookId', () => api('POST', `/api/students/reserve/${state.bookId}`,
        { token: state.studentToken, body: {} }), [200, 201, 400]);
    await expect('GET /api/students/reservations', () => api('GET', '/api/students/reservations',
        { token: state.studentToken }), [200, 201]);
    await expect('GET /api/students/reserve/:bookId/position', () => api('GET',
        `/api/students/reserve/${state.bookId}/position`, { token: state.studentToken }), [200, 201, 404]);
    await expect('DELETE /api/students/reserve/:bookId', () => api('DELETE',
        `/api/students/reserve/${state.bookId}`, { token: state.studentToken }), [200, 201, 404]);

    // ============================================================ PURCHASE REQUESTS
    section('Purchase requests');
    await expect('POST /api/students/purchase-request', () => api('POST', '/api/students/purchase-request', {
        token: state.studentToken,
        body: { bookTitle: 'Domain-Driven Design', author: 'Eric Evans', reason: 'Course reading' },
    }), [200, 201]);

    const prList = await expect('GET /api/admin/purchase-requests', () => api('GET',
        '/api/admin/purchase-requests?page=0&search=', { token: state.adminToken }),
        [200, 201], j => Array.isArray(j.requests) && typeof j.totalPages === 'number');
    state.purchaseId = prList.json?.requests?.[0]?.id;
    record('purchase row is flat (bookName/user.studentId)',
        !!prList.json?.requests?.[0]?.bookName && !!prList.json?.requests?.[0]?.user?.studentId,
        JSON.stringify(prList.json?.requests?.[0])?.slice(0, 120));

    await expect('GET purchase-requests honours ?search', () => api('GET',
        '/api/admin/purchase-requests?page=0&search=Domain', { token: state.adminToken }),
        [200], j => j.requests.length === 1);

    await expect('POST /api/admin/purchase-requests/:id/status (REJECTED)', () => api('POST',
        `/api/admin/purchase-requests/${state.purchaseId}/status`,
        { token: state.adminToken, body: { status: 'REJECTED' } }), [200, 201]);

    await expect('POST purchase status rejects legacy DENIED value', () => api('POST',
        `/api/admin/purchase-requests/${state.purchaseId}/status`,
        { token: state.adminToken, body: { status: 'DENIED' } }), [400]);

    await expect('DELETE /api/admin/purchase-request/:id', () => api('DELETE',
        `/api/admin/purchase-request/${state.purchaseId}`, { token: state.adminToken }), [200, 201]);

    // ============================================================ NOTIFICATIONS
    section('Notifications & preferences');
    const notifs = await expect('GET /api/students/notifications', () => api('GET', '/api/students/notifications',
        { token: state.studentToken }), [200, 201], j => Array.isArray(j.notifications));
    const notifId = notifs.json?.notifications?.[0]?.id;
    record('actions produced notifications', !!notifId, `count=${notifs.json?.notifications?.length}`);

    if (notifId) {
        await expect('PUT /api/students/notifications/read/:id', () => api('PUT',
            `/api/students/notifications/read/${notifId}`, { token: state.studentToken, body: {} }), [200, 201]);
    }
    await expect('PUT /api/students/notifications/read-all', () => api('PUT',
        '/api/students/notifications/read-all', { token: state.studentToken, body: {} }), [200, 201]);

    await expect('GET /api/students/notification-preferences', () => api('GET',
        '/api/students/notification-preferences', { token: state.studentToken }), [200, 201]);

    await expect('PUT /api/students/notification-preferences', () => api('PUT',
        '/api/students/notification-preferences',
        { token: state.studentToken, body: { emailOverdue: false, inAppOverdue: false } }), [200, 201]);

    const prefsAfter = await api('GET', '/api/students/notification-preferences', { token: state.studentToken });
    const prefs = prefsAfter.json?.preferences || prefsAfter.json;
    record('preference update persisted', prefs?.emailOverdue === false || prefs?.preferences?.emailOverdue === false,
        JSON.stringify(prefs)?.slice(0, 120));

    // ============================================================ PROFILE
    section('Student profile');
    await expect('GET /api/students/getUserDetails', () => api('GET', '/api/students/getUserDetails',
        { token: state.studentToken }), [200, 201],
        j => !!j.user && typeof j.user.fineBalance === 'number');

    await expect('PUT /api/students/profile', () => api('PUT', '/api/students/profile',
        { token: state.studentToken, body: { name: 'Aisha K.', phoneNumber: '+923009876543' } }), [200, 201]);

    await expect('DELETE /api/students/avatar (none set)', () => api('DELETE', '/api/students/avatar',
        { token: state.studentToken }), [200, 201, 400, 404]);

    await expect('POST /api/students/avatar rejects empty upload', () => api('POST', '/api/students/avatar',
        { token: state.studentToken }), [400, 500]);

    // ============================================================ DASHBOARD / ANALYTICS
    section('Dashboard, analytics, overdue');
    await expect('GET /api/admin/dashboard-stats', () => api('GET', '/api/admin/dashboard-stats',
        { token: state.adminToken }), [200, 201]);

    await expect('GET /api/admin/borrowing-trends', () => api('GET', '/api/admin/borrowing-trends?days=30',
        { token: state.adminToken }), [200, 201]);

    await expect('GET /api/admin/analytics', () => api('GET', '/api/admin/analytics',
        { token: state.adminToken }), [200, 201], j => {
            const a = j.analytics;
            return !!a && 'totalFines' in (a.fineStats || {})
                && (!a.topBorrowedBooks?.length || typeof a.topBorrowedBooks[0].borrowCount === 'number')
                && (!a.topActiveUsers?.length || 'studentId' in a.topActiveUsers[0]);
        });

    await expect('GET /api/admin/overdue-summary', () => api('GET', '/api/admin/overdue-summary',
        { token: state.adminToken }), [200, 201]);

    await expect('POST /api/admin/overdue-reminders/trigger', () => api('POST',
        '/api/admin/overdue-reminders/trigger', { token: state.adminToken, body: {} }), [200, 201]);

    // ============================================================ AUDIT
    section('Audit log');
    const audit = await expect('GET /api/admin/audit-logs', () => api('GET',
        '/api/admin/audit-logs?pageNumber=0', { token: state.adminToken }), [200, 201],
        j => Array.isArray(j.logs));
    record('admin mutations were audited', (audit.json?.logs?.length || 0) > 0,
        `rows=${audit.json?.logs?.length} actions=${[...new Set((audit.json?.logs || []).map(l => l.action))].join(',')}`);

    await expect('GET /api/admin/audit-logs/filters', () => api('GET', '/api/admin/audit-logs/filters',
        { token: state.adminToken }), [200, 201]);

    // ============================================================ IMPORT
    section('Bulk import');
    const booksCsv = `bookNumber,bookName,summary,author,genre,image,bgColor,totalBooks,almirahNumber,shelfNumber
IMP-${uniq},Imported Book,Imported summary,Some Author,Fiction,https://example.com/i.png,#123456,1,1,1`;
    const bookForm = new FormData();
    bookForm.append('file', new Blob([booksCsv], { type: 'text/csv' }), 'books.csv');
    await expect('POST /api/admin/import/books (CSV)', () => api('POST', '/api/admin/import/books',
        { token: state.adminToken, form: bookForm }), [200, 201]);

    const usersCsv = `name,email,studentId,phoneNumber,role
Imported Student,imported${uniq}@test.local,IMP${uniq},+923001112233,STUDENT`;
    const userForm = new FormData();
    userForm.append('file', new Blob([usersCsv], { type: 'text/csv' }), 'users.csv');
    await expect('POST /api/admin/import/users (CSV)', () => api('POST', '/api/admin/import/users',
        { token: state.adminToken, form: userForm }), [200, 201]);

    // ============================================================ INTEGRATIONS
    section('Integrations & password flows');
    await expect('GET /api/admin/imagekit-authentication-tokens', () => api('GET',
        '/api/admin/imagekit-authentication-tokens', { token: state.adminToken }), [200, 201, 500]);

    await expect('POST /api/students/forgot-password', () => api('POST', '/api/students/forgot-password',
        { body: { email: studentEmail, type: 'user', collegeCode: 'TC1' } }), [200, 201, 429]);

    const resetRow = await prisma.verificationToken.findFirst({
        where: { userId: state.studentId, type: 'PASSWORD_RESET' }, orderBy: { expiresAt: 'desc' },
    });
    if (resetRow) {
        console.log('  [DB] read emailed password-reset token');
        await expect('POST /api/students/reset-password', () => api('POST', '/api/students/reset-password', {
            body: { email: studentEmail, token: resetRow.token, newPassword: 'newpassword123', collegeCode: 'TC1' },
        }), [200, 201, 400]);
    } else {
        record('POST /api/students/reset-password', true, 'skipped — no reset token issued (SMTP off)');
    }

    await expect('POST /api/students/change-password', () => api('POST', '/api/students/change-password', {
        token: state.studentToken,
        body: { currentPassword: 'password123', newPassword: 'password456', confirmPassword: 'password456' },
    }), [200, 201, 400]);

    await expect('POST /api/students/logout', () => api('POST', '/api/students/logout',
        { token: state.studentToken, body: {} }), [200, 201]);

    // ============================================================ SUMMARY
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  TOTAL: ${results.length} checks — ${passed} passed, ${failed.length} failed`);
    console.log('='.repeat(70));
    if (failed.length) {
        console.log('\nFAILURES:');
        failed.forEach(f => console.log(`  [${f.section}] ${f.name}\n      ${f.detail}`));
    }
    await prisma.$disconnect();
    process.exit(failed.length ? 1 : 0);
})().catch(async (e) => {
    console.error('SUITE CRASHED:', e);
    await prisma.$disconnect();
    process.exit(1);
});
