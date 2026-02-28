import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { createChallenge, verifySolution, extractParams } from "altcha-lib";
import { createClient } from "redis";
import crypto from "crypto";

const app = express();

// Connect to Redis:
const redis = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379",
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

await redis.connect();

// End Connect to Redis

app.set("trust proxy", 1); // for Cooligy reverse proxy

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());

const allowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error("CORS not allowed"), false);
    },
  })
);

// rate limit for protection
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});
app.use(limiter);

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Generate challenge
app.get("/api/v1/altcha/challenge", async (req, res) => {
  const site = req.query.site;
  if (!site) {
    return res.status(400).json({ error: "Missing site" });
  }
  const hmacKey = process.env[`ALTCHA_KEY_${site}`];
  if (!hmacKey) {
    return res.status(400).json({ error: "Invalid site" });
  }
  try {
    const challenge = await createChallenge({
      hmacKey,
      maxnumber: 100000,
      expires: new Date(Date.now() + 5 * 60 * 1000),
      params: {
        ip: req.ip,
      },
    });
    res.json(challenge);
  } catch (err) {
    console.error("createChallenge error:", err);
    res.status(500).json({ error: "Failed to generate challenge" });
  }
});

const hashPayload = function (payload) {
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const checkRateLimit = async (site, ip, maxRequests = 20, windowSec = 60) => {
  const key = `altcha:rate:${site}:${ip}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  return count <= maxRequests;
};

app.post("/api/v1/altcha/verify", async (req, res) => {
  try {
    const { token, site } = req.body;

    if (!token || !site) {
      return res.status(400).json({ error: "Missing token or site" });
    }

    const hmacKey = process.env[`ALTCHA_KEY_${site}`];
    if (!hmacKey) {
      return res.status(400).json({ error: "Invalid site" });
    }

    // Per-site per-IP rate limiting
    const allowed = await checkRateLimit(site, req.ip, 20, 60);

    if (!allowed) {
      return res.status(429).json({
        error: "Too many verification attempts",
      });
    }

    // VERIFY TOKEN
    const valid = await verifySolution(token, hmacKey, true);

    if (!valid) {
      return res.status(400).json({
        success: false,
        reason: "Unable to verify solution",
      });
    }

    // REDIS REPLAY VERIFICATION
    const tokenId = hashPayload(token);

    const result = await redis.set(`altcha:${site}:used:${tokenId}`, "1", {
      EX: 300, // match challenge expiration
      NX: true,
    });

    if (result === null) {
      return res.status(400).json({ error: "Replay detected" });
    }

    // VERIFY IP
    const params = extractParams(token);

    if (params.ip !== req.ip) {
      return res.status(403).json({
        success: false,
        reason: "IP mismatch",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("verifySolution error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Altcha backend listening on ${PORT}`);
});
