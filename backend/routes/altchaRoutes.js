import express from "express";

export function createAltchaRoutes({ controller }) {
  const router = express.Router();

  router.get("/challenge", controller.createChallengeHandler);
  router.post("/verify", controller.verifyHandler);

  return router;
}
