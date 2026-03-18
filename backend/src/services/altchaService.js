import { verifySolution as altchaVerify, extractParams } from "altcha-lib";
import { hashPayload } from "../utils/hashPayload.js";

export function createAltchaService({
  redis,
  logger,
  rateLimitService,
  verifySolution = altchaVerify,
}) {
  async function verifyToken(token, site, ip, hmacKey) {
    const allowed = await rateLimitService.checkRateLimit(site, ip);

    if (!allowed) {
      logger("rate_limit_exceeded", { site, ip });
      const err = new Error("Too many verification attempts");
      err.status = 429;
      throw err;
    }

    const valid = await verifySolution(token, hmacKey, true);

    if (!valid) {
      const err = new Error("Unable to verify solution");
      err.status = 400;
      throw err;
    }

    const tokenId = hashPayload(token);

    const result = await redis.set(`altcha:${site}:used:${tokenId}`, "1", {
      EX: 300,
      NX: true,
    });

    if (result === null) {
      logger("replay_detected", { site, ip });
      const err = new Error("Replay detected");
      err.status = 400;
      throw err;
    }

    const params = extractParams(token);

    if (params.ip !== ip) {
      logger("ip_mismatch", { site, ip, tokenIp: params.ip });
      const err = new Error("IP mismatch");
      err.status = 403;
      throw err;
    }

    return { success: true };
  }

  return {
    verifyToken,
  };
}
