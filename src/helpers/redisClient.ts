import Redis from "ioredis";
import logger from './logger';
import { config } from '../config';

/**
 * `new Redis()` with no argument always dials 127.0.0.1:6379 — REDIS_URL was
 * validated in config and then never used, so Redis could not live anywhere
 * but the API's own machine. Anywhere it did (a container, a managed cache)
 * every cache read quietly missed and the log filled with reconnect errors.
 */
export const redisClient = new Redis(config.REDIS_URL);

redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
});

export const checkRedisConnection = async () => {
    try {
        await redisClient.ping();
        logger.info('Redis connection successful');
        return true;
    } catch (error) {
        logger.error('Redis connection failed:', error);
        return false;
    }
};
