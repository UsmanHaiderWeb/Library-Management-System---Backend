import Redis from "ioredis";
import logger from './logger';

export const redisClient = new Redis();

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
