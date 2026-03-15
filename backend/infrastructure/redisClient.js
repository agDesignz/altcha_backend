import { createClient } from "redis";

export async function createRedisClient(url) {
  const redis = createClient({ url });

  redis.on("error", (err) => {
    console.error("Redis error:", err);
  });

  await redis.connect();

  return redis;
}
