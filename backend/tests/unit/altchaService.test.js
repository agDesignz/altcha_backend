import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { createAltchaService } from "../../src/services/altchaService.js";
import * as altcha from "altcha-lib";

describe("altchaService", () => {
  let redis;
  let logger;
  let rateLimitService;
  let service;

  beforeEach(() => {
    redis = {
      set: jest.fn(),
    };

    logger = jest.fn();

    rateLimitService = {
      checkRateLimit: jest.fn(),
    };

    service = createAltchaService({
      redis,
      logger,
      rateLimitService,
    });

    jest.spyOn(altcha, "verifySolution").mockResolvedValue(true);
  });

  test("rejects when rate limit exceeded", async () => {
    rateLimitService.checkRateLimit.mockResolvedValue(false);

    await expect(
      service.verifyToken("token", "portfolio", "127.0.0.1", "key")
    ).rejects.toThrow("Too many verification attempts");
  });

  test("detects replay attack", async () => {
    rateLimitService.checkRateLimit.mockResolvedValue(true);

    redis.set.mockResolvedValue(null);

    await expect(
      service.verifyToken("token", "portfolio", "127.0.0.1", "key")
    ).rejects.toThrow("Replay detected");
  });

  test("logs replay attempts", async () => {
    rateLimitService.checkRateLimit.mockResolvedValue(true);

    redis.set.mockResolvedValue(null);

    try {
      await service.verifyToken("token", "portfolio", "127.0.0.1", "key");
    } catch {}

    expect(logger).toHaveBeenCalled();
  });
});
