import express from "express";
import { jest } from "@jest/globals";

import { createRateLimitService } from "../../src/services/rateLimitService.js";
import { createAltchaService } from "../../src/services/altchaService.js";
import { createAltchaController } from "../../src/controllers/altchaController.js";
import { createAltchaRoutes } from "../../src/routes/altchaRoutes.js";

export async function createTestApp(redis) {
  const logger = jest.fn();

  const rateLimitService = createRateLimitService({ redis });

  // Mock verifySolution
  const mockVerifySolution = jest.fn().mockResolvedValue(true);

  const altchaService = createAltchaService({
    redis,
    logger,
    rateLimitService,
    verifySolution: mockVerifySolution,
  });

  const controller = createAltchaController({
    altchaService,
    logger,
  });

  const routes = createAltchaRoutes({
    controller,
  });

  const app = express();

  app.use(express.json());
  app.use("/api/v1/altcha", routes);

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  return { app, logger };
}
