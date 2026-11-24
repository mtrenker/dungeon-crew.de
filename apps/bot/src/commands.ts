import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

export const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check whether the guild bot is online."),
];

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === "ping") await interaction.reply("Pong!");
}
