import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { createChallenge, verifySolution } from "altcha-lib";

const app = express();
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
      // allow requests with no origin (curl, postman) - adjust if you want to block them
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
app.get("/api/altcha/challenge", async (req, res) => {
  console.log("Received get request", req.body);
  try {
    const challenge = await createChallenge({
      hmacKey: process.env.ALTCHA_HMAC_KEY,
      maxNumber: 100000,
    });
    res.json(challenge);
  } catch (err) {
    console.error("createChallenge error:", err);
    res.status(500).json({ error: "Failed to generate challenge" });
  }
});

// Optional: verify endpoint - when your form is submitted, post token here
app.post("/api/altcha/verify", async (req, res) => {
  console.log("POST - req:", req.body);
  try {
    const { token, extra } = req.body; // token from client (altcha payload)
    // call the lib's verify function - adapt API name/params to altcha-lib
    const valid = await verifySolution({
      secret: process.env.ALTCHA_SECRET,
      token,
      extra, // optional: context like user/ip
    });
    if (valid && valid.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, detail: valid });
    }
  } catch (err) {
    console.error("verifySolution error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Altcha backend listening on ${PORT}`);
});
