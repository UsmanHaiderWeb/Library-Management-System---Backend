import Redis from "ioredis";

export const redisClient = new Redis();

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

export const checkRedisConnection = async () => {
    try {
        await redisClient.ping();
        console.log('Redis connection successful');
        return true;
    } catch (error) {
        console.error('Redis connection failed:', error);
        return false;
    }
};
