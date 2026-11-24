import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";
import { requiredDiscordId, requiredEnv } from "./env.js";
import { registrationError } from "./registration-error.js";

// Explicit operation: never rewrite guild commands on every bot startup.
const rest = new REST().setToken(requiredEnv("DISCORD_TOKEN"));
const applicationId = requiredDiscordId("DISCORD_APPLICATION_ID");
const guildId = requiredDiscordId("DISCORD_GUILD_ID");
try {
  await rest.put(
    Routes.applicationGuildCommands(applicationId, guildId),
    { body: commands.map((command) => command.toJSON()) },
  );
  console.log("Guild commands registered.");
} catch (error) {
  console.error(registrationError(error));
  process.exitCode = 1;
}
