import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { studentRouter } from './src/routes/studentRoutes';
import session from 'express-session';
import { bookRouter } from './src/routes/bookRoutes';
import { adminRouter } from './src/routes/adminRoutes';
import './src/helpers/redisClient';


// Load environment variables
dotenv.config();

const app = express();


// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
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


app.use('/api/admin', adminRouter);
app.use('/api/books', bookRouter);
app.use('/api/students', studentRouter);


export default app;