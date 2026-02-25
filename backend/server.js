import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { createChallenge, verifySolution, extractParams } from "altcha-lib";

const app = express();

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

// Keeping track of used tokens
const usedTokens = new Set();
console.log(usedTokens);

function markTokenUsed(token) {
  console.log(
    "Marking Used Token. Let's see if something changes:",
    usedTokens
  );
  usedTokens.add(token);
  setTimeout(() => usedTokens.delete(token), 5 * 60 * 1000);
}

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Generate challenge
app.get("/api/v1/altcha/challenge", async (req, res) => {
  try {
    const challenge = await createChallenge({
      hmacKey: process.env.ALTCHA_HMAC_KEY,
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

// Optional: verify endpoint - when your form is submitted, post token here
app.post("/api/v1/altcha/verify", async (req, res) => {
  try {
    const hmacKey = process.env.ALTCHA_HMAC_KEY;
    const { token } = req.body; // token from client (altcha payload)

    if (!token) {
      return res.status(400).json({ success: false, reason: "No token" });
    }

    if (usedTokens.has(token)) {
      return res
        .status(403)
        .json({ success: false, reason: "Replay detected" });
    }

    const valid = await verifySolution(token, hmacKey, true);

    if (!valid) {
      return res
        .status(400)
        .json({ success: false, reason: "Unable to verify solution" });
    }

    const params = extractParams(token);

    if (params.ip !== req.ip) {
      return res.status(403).json({ success: false, reason: "IP mismatch" });
    }

    markTokenUsed(token);

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
