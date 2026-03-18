import { jest } from "@jest/globals";

export function mockAltcha() {
  jest.unstable_mockModule("../../src/services/altchaService.js", () => ({
    createAltchaService: () => ({
      verifyToken: async (token, site) => {
        if (token === "replay_test_token") {
          if (global.__replaySeen) {
            throw new Error("Replay detected");
          }
          global.__replaySeen = true;
        }

        if (token === "overflow") {
          const err = new Error("Rate limit exceeded");
          err.status = 429;
          throw err;
        }

        return { success: true };
      },
    }),
  }));
}
