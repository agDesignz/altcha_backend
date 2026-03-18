import { createChallenge } from "altcha-lib";

export function createAltchaController({ altchaService, logger }) {
  async function createChallengeHandler(req, res) {
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
        params: { ip: req.ip },
      });

      res.json(challenge);
    } catch (err) {
      logger("challenge_error", { error: err.message });
      res.status(500).json({ error: "Failed to generate challenge" });
    }
  }

  async function verifyHandler(req, res) {
    try {
      const { token, site } = req.body;

      if (!token || !site) {
        return res.status(400).json({ error: "Missing token or site" });
      }

      const hmacKey = process.env[`ALTCHA_KEY_${site}`];

      if (!hmacKey) {
        logger("invalid_site_attempt", { site, ip: req.ip });
        return res.status(400).json({ error: "Invalid site" });
      }

      const result = await altchaService.verifyToken(
        token,
        site,
        req.ip,
        hmacKey
      );

      res.json(result);
    } catch (err) {
      const status = err.status || 500;

      res.status(status).json({
        error: err.message || "Internal server error",
      });
    }
  }

  return {
    createChallengeHandler,
    verifyHandler,
  };
}
