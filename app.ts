import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { studentRouter } from './src/routes/studentRoutes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'public')));


// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the LMS Backend API' });
});

app.use('/students', studentRouter)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response) => {
    console.error(err.stack);
    
    // Default error status and message
    const statusCode = 500;
    const message = 'Internal Server Error';
    
    // Send error response
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Handle 404 routes
app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'Route not found'
    });
});


// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});