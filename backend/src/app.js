import express from "express";
import morgan from "morgan";

import { createRedisClient } from "./infrastructure/redisClient.js";
import { logSecurityEvent } from "./infrastructure/logger.js";

import { createSecurityHeaders } from "./middleware/securityHeaders.js";
import { createCorsMiddleware } from "./middleware/corsConfig.js";

import { createRateLimitService } from "./services/rateLimitService.js";
import { createAltchaService } from "./services/altchaService.js";
import { createAltchaController } from "./controllers/altchaController.js";
import { createAltchaRoutes } from "./routes/altchaRoutes.js";

export async function createApp() {
  const redis = await createRedisClient(
    process.env.REDIS_URL || "redis://redis:6379"
  );

  const logger = logSecurityEvent;

  const rateLimitService = createRateLimitService({ redis });

  const altchaService = createAltchaService({
    redis,
    logger,
    rateLimitService,
  });

  const controller = createAltchaController({
    altchaService,
    logger,
  });

  const altchaRoutes = createAltchaRoutes({ controller });

  const app = express();

  app.set("trust proxy", 1);

  app.use(createSecurityHeaders());
  app.use(createCorsMiddleware());
  app.use(morgan("combined"));
  app.use(express.json());

  app.use("/api/v1/altcha", altchaRoutes);

  app.get("/health", (req, res) => res.json({ ok: true }));

  return { app, redis };
}
