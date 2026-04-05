import app from './app';
import { config } from './src/config';
import { scheduleOverdueReminders } from './src/jobs/overdueReminder.job';

const port = config.PORT;

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    // Start scheduled jobs
    scheduleOverdueReminders();
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
