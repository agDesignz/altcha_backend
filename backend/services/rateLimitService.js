export function createRateLimitService({ redis }) {
  async function checkRateLimit(site, ip, maxRequests = 20, windowSec = 60) {
    const key = `altcha:rate:${site}:${ip}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    return count <= maxRequests;
  }

  return {
    checkRateLimit,
  };
}
