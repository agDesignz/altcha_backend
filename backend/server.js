import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
// Import altcha functions - adjust names to match the package API
import { createChallenge, verifySolution } from "altcha-lib";

const hmacKey = process.env.ALTCHA_HMAC_KEY;
console.log("hmacKey:", hmacKey);

// dotenv.config();

const app = express();
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());

// CORS config: allow listing from ALLOWED_ORIGINS env var
// const allowed = (process.env.ALLOWED_ORIGINS || "")
//   .split(",")
//   .map((s) => s.trim())
//   .filter(Boolean);
// console.log("ALLOWED:", allowed);

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
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
  console.log("Received get request", req.body);
  try {
    const challenge = await createChallenge({
      hmacKey,
      maxNumber: 100000,
    });
    res.json(challenge);
  } catch (err) {
    console.error("createChallenge error:", err);
    res.status(500).json({ error: "Failed to generate challenge" });
  }
});

// Optional: verify endpoint - when your form is submitted, post token here
// app.post("/api/altcha/verify", async (req, res) => {
//   console.log("POST - req:", req.body);
//   try {
//     const { token, extra } = req.body; // token from client (altcha payload)
//     // call the lib's verify function - adapt API name/params to altcha-lib
//     const valid = await verifySolution({
//       secret: process.env.ALTCHA_SECRET,
//       token,
//       extra, // optional: context like user/ip
//     });
//     if (valid && valid.success) {
//       res.json({ success: true });
//     } else {
//       res.status(400).json({ success: false, detail: valid });
//     }
//   } catch (err) {
//     console.error("verifySolution error:", err);
//     res.status(500).json({ error: "Verification failed" });
//   }
// });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Altcha backend listening on ${PORT}`);
});
