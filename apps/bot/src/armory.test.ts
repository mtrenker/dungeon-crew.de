import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCharacterPage, parseCharacterRef } from "./armory.js";
import { farmReply } from "./farm.js";

const page = (character: unknown) =>
  `<html><script type="text/javascript" id="character-profile-mount-initial-state">var characterProfileInitialState = ${JSON.stringify({ character })};\n</script></html>`;

test("armory links in any locale and bare names resolve to region and slug", () => {
  const expected = { region: "eu", slug: "tilli-copperspark" };
  for (const input of [
    "https://worldofwarcraft.blizzard.com/de-de/forever/eu/armory/character/tilli-copperspark",
    "worldofwarcraft.blizzard.com/en-gb/forever/eu/armory/character/Tilli-Copperspark/",
    " tilli-copperspark ",
  ]) assert.deepEqual(parseCharacterRef(input), expected);
  assert.equal(parseCharacterRef("https://worldofwarcraft.blizzard.com/en-us/forever/us/armory/character/bob")?.region, "us");
});

test("links to other sites, other games and odd names are rejected", () => {
  for (const input of [
    "https://example.com/de-de/forever/eu/armory/character/tilli-copperspark",
    "https://worldofwarcraft.blizzard.com.example.com/de-de/forever/eu/armory/character/tilli",
    "https://worldofwarcraft.blizzard.com/de-de/character/eu/blackhand/tilli",
    "https://worldofwarcraft.blizzard.com/de-de/forever/eu/armory/character/%E0%A4%A",
    "../../admin",
    "tilli copperspark",
    "x",
  ]) assert.equal(parseCharacterRef(input), undefined, input);
});

test("a character page yields level, class and gathering skills only", () => {
  const character = parseCharacterPage(page({
    name: "Tilli",
    level: 35,
    class: { id: 9, name: "Hexenmeisterin", enum: "WARLOCK" },
    professions: {
      primaries: [
        { id: 186, name: "Bergbau", tiers: [{ maxSkillPoints: 225, skillPoints: 195 }] },
        { id: 202, name: "Ingenieurskunst", tiers: [{ maxSkillPoints: 225, skillPoints: 196 }] },
      ],
      secondaries: [{ id: 356, name: "Angeln", tiers: [{ maxSkillPoints: 225, skillPoints: 225 }] }],
    },
  }));
  assert.deepEqual(character, {
    name: "Tilli",
    level: 35,
    wowClass: "Warlock",
    professions: ["Mining", "Fishing"],
    skills: { Mining: 195, Fishing: 225 },
  });
  const reply = farmReply(character!);
  assert.match(reply, /Farming spots for Tilli \(level 35, Warlock, Mining 195, Fishing 225\)/);
  assert.match(reply, /Gold veins, ogre caves/);
  assert.match(reply, /Next up: Mining 230 opens the Truesilver loop/);
  assert.doesNotMatch(reply, /\*\*Truesilver loop\*\*/);
});

test("pages without usable character data are rejected, sparse ones still work", () => {
  assert.equal(parseCharacterPage("<html>Not found</html>"), undefined);
  assert.equal(parseCharacterPage(page({ name: "Ghost" })), undefined);
  assert.equal(parseCharacterPage(page(undefined).replace("};", "")), undefined);
  assert.deepEqual(parseCharacterPage(page({ level: 12 })), {
    name: undefined, level: 12, wowClass: undefined, professions: [], skills: {},
  });
});
