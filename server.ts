import app from './app';
import { config } from './src/config';

const port = config.PORT;

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        process.exit(0);
    });
});
