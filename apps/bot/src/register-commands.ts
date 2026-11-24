import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";
import { requiredEnv } from "./env.js";

// Explicit operation: never rewrite guild commands on every bot startup.
const rest = new REST().setToken(requiredEnv("DISCORD_TOKEN"));
try {
  await rest.put(
    Routes.applicationGuildCommands(requiredEnv("DISCORD_APPLICATION_ID"), requiredEnv("DISCORD_GUILD_ID")),
    { body: commands.map((command) => command.toJSON()) },
  );
  console.log("Guild commands registered.");
} catch {
  console.error("Registration failed. Check application/guild IDs, token, and bot installation.");
  process.exitCode = 1;
}
