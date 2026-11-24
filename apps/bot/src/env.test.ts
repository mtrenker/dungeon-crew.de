import assert from "node:assert/strict";
import { test } from "node:test";
import { requiredDiscordId, requiredEnv } from "./env.js";

test("Discord IDs accept numeric snowflakes and reject invalid values safely", () => {
  const name = "DUNGEON_TEST_DISCORD_ID";
  try {
    process.env[name] = "123456789012345678";
    assert.equal(requiredDiscordId(name), "123456789012345678");
    for (const value of ["123", "a".repeat(64), "https://discord.gg/example"]) {
      process.env[name] = value;
      assert.throws(() => requiredDiscordId(name), { message: `${name} must be a numeric Discord ID, not a public key or invite link.` });
    }
  } finally {
    delete process.env[name];
  }
});

test("missing or blank configuration fails without exposing values", () => {
  const name = "DUNGEON_TEST_ENV";
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
