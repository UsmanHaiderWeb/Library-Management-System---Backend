"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
exports.redisClient = new ioredis_1.default();
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
