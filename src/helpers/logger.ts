import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss' }),
    printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

const prodFormat = combine(
    timestamp(),
    json()
);

const isProduction = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [new winston.transports.Console()];

// On a college server nobody is watching stdout — persist logs to disk so an
// incident can be investigated after the fact. Files rotate by size so a busy
// term can't fill the disk.
if (isProduction) {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
        })
    );
}

const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: isProduction ? prodFormat : devFormat,
    transports,
    // Don't exit on uncaught exceptions
    exitOnError: false,
});

export default logger;
