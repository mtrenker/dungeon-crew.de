import assert from "node:assert/strict";
import { test } from "node:test";
import { DiscordAPIError, HTTPError } from "discord.js";
import { registrationError } from "./registration-error.js";

test("missing access gives an actionable hint without request or error contents", () => {
  const secret = "sensitive-request-content";
  const error = new DiscordAPIError(
    { message: secret, code: 50001 }, 50001, 403, "PUT",
    `https://example.invalid/${secret}`, { body: secret },
  );
  const result = registrationError(error);
  assert.match(result, /HTTP 403, Discord code 50001/);
  assert.match(result, /applications.commands/);
  assert.ok(!result.includes(secret));
});

test("unauthorized responses point to the token without exposing it", () => {
  const result = registrationError(new HTTPError(
    401, "secret", "PUT", "https://example.invalid/secret", { body: "secret" },
  ));
  assert.match(result, /token was rejected/);
  assert.ok(!result.includes("secret"));
});

test("unexpected errors never expose their message", () => {
  const result = registrationError(new Error("sensitive-request-content"));
  assert.match(result, /network connectivity/);
  assert.ok(!result.includes("sensitive-request-content"));
});
