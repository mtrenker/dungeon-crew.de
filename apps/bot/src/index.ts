import { createServer } from "node:http";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { handleCommand } from "./commands.js";
import { requiredEnv } from "./env.js";

const token = requiredEnv("DISCORD_TOKEN");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once(Events.ClientReady, (ready) => console.log(`Bot ready: ${ready.user.tag}`));
client.on(Events.Error, () => console.error("Discord client error"));
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch {
    console.error("Command failed");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "The command failed. Please try again.", flags: MessageFlags.Ephemeral })
        .catch(() => console.error("Could not send error reply"));
    }
  }
});

// Internal probes only. Readiness reflects the Discord connection; liveness does not.
const server = createServer((req, res) => {
  if (req.url !== "/health" && req.url !== "/ready") {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(req.url === "/ready" && !client.isReady() ? 503 : 200).end();
});
server.listen(3001, "0.0.0.0");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    client.destroy();
    server.close();
  });
}
try {
  await client.login(token);
} catch {
  console.error("Discord login failed. Check the bot token and network access.");
  client.destroy();
  server.close();
  process.exitCode = 1;
}
