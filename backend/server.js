import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
// Import altcha functions - adjust names to match the package API
import { generateChallenge, verifySolution } from "altcha-lib";

dotenv.config();

const app = express();
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());

// CORS config: allow listing from ALLOWED_ORIGINS env var
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
  windowMs: 60 * 1000, // 1 minute
  max: 30, // adjust as needed
});
app.use(limiter);

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Generate challenge
app.get("/api/altcha/challenge", async (req, res) => {
  try {
    const challenge = await generateChallenge({
      secret: process.env.ALTCHA_SECRET,
      // other generate options if the library requires them
    });
    res.json(challenge);
  } catch (err) {
    console.error("generateChallenge error:", err);
    res.status(500).json({ error: "Failed to generate challenge" });
  }
});

// Optional: verify endpoint - when your form is submitted, post token here
app.post("/api/altcha/verify", async (req, res) => {
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Altcha backend listening on ${PORT}`);
});
