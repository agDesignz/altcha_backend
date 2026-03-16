import { verifySolution, extractParams } from "altcha-lib";
import { hashPayload } from "../utils/hashPayload.js";

export function createAltchaService({ redis, logger, rateLimitService }) {
  async function verifyToken(token, site, ip, hmacKey) {
    const allowed = await rateLimitService.checkRateLimit(site, ip);

    if (!allowed) {
      logger("rate_limit_exceeded", { site, ip });
      throw new Error("Too many verification attempts");
    }

    const valid = await verifySolution(token, hmacKey, true);

    if (!valid) {
      throw new Error("Unable to verify solution");
    }

    const tokenId = hashPayload(token);

    const result = await redis.set(`altcha:${site}:used:${tokenId}`, "1", {
      EX: 300,
      NX: true,
    });

    if (result === null) {
      logger("replay_detected", { site, ip });
      throw new Error("Replay detected");
    }

    const params = extractParams(token);

    if (params.ip !== ip) {
      logger("ip_mismatch", { site, ip, tokenIp: params.ip });
      throw new Error("IP mismatch");
    }

    return { success: true };
  }

  return {
    verifyToken,
  };
}
