import Redis from "ioredis";

export const redisClient = new Redis();


// Handle Redis connection errors
// redisClient.on('error', (err) => {
//     console.error('Redis Client Error:', err);
// });

// // Connect to Redis
// redisClient.connect().catch(console.error);

// // Export a function to check Redis connection
// export const checkRedisConnection = async () => {
//     try {
//         await redisClient.ping();
//         console.log('Redis connection successful');
//         return true;
//     } catch (error) {
//         console.error('Redis connection failed:', error);
//         return false;
//     }
// }; 