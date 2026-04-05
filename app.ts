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

app.use('/api/admin', adminRouter);
app.use('/api/books', bookRouter);
app.use('/api/students', studentRouter);


export default app;