"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const studentRoutes_1 = require("./src/routes/studentRoutes");
const express_session_1 = __importDefault(require("express-session"));
const bookRoutes_1 = require("./src/routes/bookRoutes");
const adminRoutes_1 = require("./src/routes/adminRoutes");
require("./src/helpers/redisClient");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use((0, express_session_1.default)({
    secret: process.env.Session_Secret || 'session-secret',
    resave: false,
    saveUninitialized: false
}));
// Basic route
app.get('/', (_, res) => {
    res.json({ message: 'Welcome to the LMS Backend API' });
    return;
});
// app.get('/generate-password-hashes', (req, res): void => {
//     try {
//         [
//             "STD000001",
//             "STD000002",
//             "STD000003",
//             "STD000004",
//             "STD000005",
//             "STD000006",
//             "STD000007",
//             "STD000008",
//             "STD000009",
//             "STD000010",
//             "STD000011",
//             "STD000012",
//             "STD000013",
//             "STD000014",
//             "STD000015",
//             "STD000016",
//             "STD000017",
//             "STD000018",
//             "STD000019",
//             "STD000020",
//             "STD000021",
//             "STD000022",
//             "STD000023",
//             "STD000024",
//             "STD000025",
//         ].forEach(async (password) => {
//             const salt = await bcrypt.genSalt(10);
//             const hashedPassword = await bcrypt.hash(password, salt);
//             console.log(password, hashedPassword);
//         });
//         res.json("working");
//         return;
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Something went wrong.' });
//         return;
//     }
// });
app.use('/api/admin', adminRoutes_1.adminRouter);
app.use('/api/books', bookRoutes_1.bookRouter);
app.use('/api/students', studentRoutes_1.studentRouter);
exports.default = app;
