import cors from "cors";
import "dotenv/config";

export function createCorsMiddleware() {
  const allowed = (process.env.ALLOWED_ORIGINS || "")

    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowed.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"), false);
    },
  });
}
