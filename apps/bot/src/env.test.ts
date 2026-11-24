import assert from "node:assert/strict";
import { test } from "node:test";
import { requiredEnv } from "./env.js";

test("missing or blank configuration fails without exposing values", () => {
  const name = "TAVERN_TEST_ENV";
  try {
    delete process.env[name];
    assert.throws(() => requiredEnv(name), /Missing required environment variable/);
    process.env[name] = "  ";
    assert.throws(() => requiredEnv(name));
    process.env[name] = " configured ";
    assert.equal(requiredEnv(name), "configured");
  } finally {
    delete process.env[name];
  }
});
