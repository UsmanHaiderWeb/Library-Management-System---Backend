import { prisma } from '../src/helpers/prismaDb';
import { redisClient } from '../src/helpers/redisClient';

beforeAll(async () => {
  // Setup logic if needed
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
});
