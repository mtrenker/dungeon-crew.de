import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { fetchCharacter, parseCharacterRef } from "./armory.js";
import { classes, gatheringProfessions, type GatheringProfession, type WowClass } from "@dungeon/knowledge";
import { farmReply } from "./farm.js";

const choices = (values: readonly string[]) => values.map((value) => ({ name: value, value }));

export const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check whether the guild bot is online."),
  new SlashCommandBuilder()
    .setName("farm")
    .setDescription("Find gold farming spots that fit your character.")
    .addStringOption((option) =>
      option.setName("character").setDescription("Armory link or name, e.g. tilli-copperspark").setMaxLength(200))
    .addIntegerOption((option) =>
      option.setName("level").setDescription("Without an armory link: your level").setMinValue(1).setMaxValue(60))
    .addStringOption((option) =>
      option.setName("profession").setDescription("Without an armory link: a gathering profession").addChoices(...choices(gatheringProfessions)))
    .addStringOption((option) =>
      option.setName("profession2").setDescription("Without an armory link: a second gathering profession").addChoices(...choices(gatheringProfessions)))
    .addStringOption((option) =>
      option.setName("class").setDescription("Without an armory link: your class").addChoices(...choices(classes))),
];

const hidden = (content: string) => ({ content, flags: MessageFlags.Ephemeral } as const);

async function farm(interaction: ChatInputCommandInteraction) {
  const character = interaction.options.getString("character");
  if (character) {
    const ref = parseCharacterRef(character);
    if (!ref) {
      await interaction.reply(hidden("That is not an armory link. Open your character on worldofwarcraft.blizzard.com and paste the address, or type the name as it appears there, such as `tilli-copperspark`."));
      return;
    }
    await interaction.deferReply();
    try {
      const found = await fetchCharacter(ref);
      await interaction.editReply(found
        ? farmReply(found)
        : `The armory has no Forever character \`${ref.slug}\` in ${ref.region.toUpperCase()}. New characters can take a while to appear; until then use the level option.`);
    } catch {
      console.error("Armory lookup failed");
      await interaction.editReply("The armory could not be read right now. Try again later, or use the level option.");
    }
    return;
  }
  const level = interaction.options.getInteger("level");
  if (level === null) {
    await interaction.reply(hidden("Give me your armory link in `character`, or at least your `level`."));
    return;
  }
  const picked = [interaction.options.getString("profession"), interaction.options.getString("profession2")];
  await interaction.reply(farmReply({
    level,
    professions: [...new Set(picked.filter((value) => value !== null))] as GatheringProfession[],
    wowClass: (interaction.options.getString("class") ?? undefined) as WowClass | undefined,
  }));
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === "ping") await interaction.reply("Pong!");
  if (interaction.commandName === "farm") await farm(interaction);
}
