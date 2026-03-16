import { createRedisClient } from "../../src/infrastructure/redisClient.js";

export async function createTestRedis() {
  const redis = await createRedisClient("redis://localhost:6380/1");

  await redis.flushDb();

  return redis;
}
