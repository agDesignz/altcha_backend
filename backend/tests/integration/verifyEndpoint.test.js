import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import request from "supertest";

import { createTestRedis } from "../helpers/createTestRedis.js";
import { createTestApp } from "../helpers/createTestApp.js";

let redis;
let app;
let logger;

beforeAll(async () => {
  redis = await createTestRedis();

  const testApp = await createTestApp(redis);

  app = testApp.app;
  logger = testApp.logger;
});

beforeEach(async () => {
  await redis.flushDb();
});

afterAll(async () => {
  await redis.quit();
});

describe("ALTCHA verify endpoint", () => {
  test("health endpoint works", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("rejects invalid site", async () => {
    const res = await request(app).post("/api/v1/altcha/verify").send({
      site: "invalidsite",
      token: "fake",
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test("detects replay attack", async () => {
    const token = "replay_test_token";

    await request(app).post("/api/v1/altcha/verify").send({
      site: "portfolio",
      token,
    });

    const replay = await request(app).post("/api/v1/altcha/verify").send({
      site: "portfolio",
      token,
    });

    expect(replay.statusCode).toBe(400);
  });

  test("rate limiting triggers", async () => {
    for (let i = 0; i < 25; i++) {
      await request(app)
        .post("/api/v1/altcha/verify")
        .send({
          site: "portfolio",
          token: `token_${i}`,
        });
    }

    const blocked = await request(app).post("/api/v1/altcha/verify").send({
      site: "portfolio",
      token: "overflow",
    });

    expect(blocked.statusCode).toBe(429);
  });

  test("logs suspicious events", async () => {
    const token = "logging_test";

    await request(app).post("/api/v1/altcha/verify").send({
      site: "portfolio",
      token,
    });

    await request(app).post("/api/v1/altcha/verify").send({
      site: "portfolio",
      token,
    });

    expect(logger).toHaveBeenCalled();
  });
});
