import { DiscordAPIError, HTTPError } from "discord.js";

export function registrationError(error: unknown): string {
  // Never log the error object: it can contain request bodies, URLs, and headers.
  if (error instanceof DiscordAPIError || error instanceof HTTPError) {
    const code = error instanceof DiscordAPIError && typeof error.code === "number"
      ? error.code : undefined;
    const detail = `HTTP ${error.status}${code === undefined ? "" : `, Discord code ${code}`}`;
    let hint = "Check the application/guild IDs and bot installation.";
    if (error.status === 401) {
      hint = "The bot token was rejected. Check the Token field in Proton Pass.";
    } else if (code === 50001) {
      hint = "Missing access. Check the guild ID and install this application in that server with the bot and applications.commands scopes.";
    } else if (code === 50013) {
      hint = "Missing permissions. Check the application's installation and permissions in the server.";
    } else if (code === 10002) {
      hint = "Unknown application. Use the Application ID, not the public key.";
    } else if (code === 10004) {
      hint = "Unknown guild. Use the Discord server ID.";
    } else if (code === 50035) {
      hint = "Invalid request. Check the application/guild IDs and command definitions.";
    }
    return `Registration failed (${detail}). ${hint}`;
  }
  return "Registration failed before a Discord API response could be identified. Check network connectivity and retry.";
}
