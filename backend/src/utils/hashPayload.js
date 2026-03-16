import crypto from "crypto";

export function hashPayload(payload) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}
