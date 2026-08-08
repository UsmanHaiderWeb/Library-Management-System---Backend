import { prisma } from '../src/helpers/prismaDb';
import { redisClient } from '../src/helpers/redisClient';

// Tests must run without live Redis: ioredis connects eagerly with infinite
// retries, which hangs jest on machines where Redis is not running.
jest.mock('../src/helpers/redisClient', () => {
  const store = new Map<string, string>();
  const hashes = new Map<string, Record<string, string>>();
  return {
    redisClient: {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
      expire: jest.fn(async () => 1),
      hset: jest.fn(async (key: string, value: Record<string, string>) => {
        hashes.set(key, { ...hashes.get(key), ...value });
        return Object.keys(value).length;
      }),
      hgetall: jest.fn(async (key: string) => hashes.get(key) ?? {}),
      ping: jest.fn(async () => 'PONG'),
      quit: jest.fn(async () => 'OK'),
    },
    checkRedisConnection: jest.fn(async () => true),
  };
});

afterAll(async () => {
  // Individual test files often replace prisma/redis with partial mocks that
  // lack these methods — never let cleanup fail a suite.
  try {
    if (typeof prisma.$disconnect === 'function') await prisma.$disconnect();
  } catch { /* noop */ }
  try {
    if (typeof redisClient.quit === 'function') await redisClient.quit();
  } catch { /* noop */ }
});
