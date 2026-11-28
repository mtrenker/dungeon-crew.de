import assert from "node:assert/strict";
import { test } from "node:test";
import { classes, gatheringProfessions, viableFrom } from "@dungeon/knowledge";
import { farmReply, findFarmSpots } from "./farm.js";

test("a miner gets the best-paying route they can survive first", () => {
  const spots = findFarmSpots({ level: 35, professions: ["Mining"], wowClass: "Warlock" });
  assert.equal(spots[0]?.name, "Gold veins, ogre caves");
  assert.ok(!spots.some((spot) => spot.name === "Mithril circuit"));
  assert.equal(findFarmSpots({ level: 40, professions: ["Mining"] })[0]?.name, "Mithril circuit");
});

test("no suggested spot has mobs more than 5 levels above the character", () => {
  for (let level = 1; level <= 60; level++) {
    for (const spot of findFarmSpots({ level, professions: [...gatheringProfessions] })) {
      assert.ok(viableFrom(spot) <= level, spot.name);
      if (spot.mobLevels) assert.ok(spot.mobLevels[1] - level <= 5, `${spot.name} at level ${level}`);
    }
  }
});

test("profession and class spots stay hidden unless the character has them", () => {
  for (const spot of findFarmSpots({ level: 60 })) {
    assert.ok(spot.kind === "mobs" || spot.kind === "dungeon", spot.name);
    assert.equal(spot.classes, undefined);
  }
  assert.ok(findFarmSpots({ level: 60, wowClass: "Hunter" }).some((spot) => spot.classes?.includes("Hunter")));
});

test("every class at every level gets a reply that fits in one Discord message", () => {
  for (const wowClass of classes) {
    for (let level = 1; level <= 60; level++) {
      const reply = farmReply({ level, professions: [...gatheringProfessions], wowClass });
      assert.ok(reply.length <= 2000, `${wowClass} ${level}: ${reply.length} characters`);
    }
  }
  assert.match(farmReply({ level: 3 }), /No spot on the list fits yet/);
});

test("every class has its own runs, shown in a separate section", () => {
  // The guides leave gaps (no Priest runs below 44, for one), so check both ends only.
  for (const wowClass of classes) {
    assert.ok(findFarmSpots({ level: 60, wowClass }).some((spot) => spot.classes), `${wowClass} at 60`);
    const early = Array.from({ length: 50 }, (_, index) => index + 1);
    assert.ok(early.some((level) => findFarmSpots({ level, wowClass }).some((spot) => spot.classes)), `${wowClass} below 51`);
  }
  assert.match(farmReply({ level: 60, wowClass: "Hunter" }), /\*\*Hunter runs\*\*\n- \*\*North wing tribute run\*\*, Dire Maul \(~55-90g\/h\)/);
});
