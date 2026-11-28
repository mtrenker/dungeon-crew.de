import assert from "node:assert/strict";
import { test } from "node:test";
import { classes, farmSpots, findPlace, gatheringProfessions, levelCap, professionFor, sources, viableFrom } from "./index.js";

test("every spot points at known places, sources and classes", () => {
  for (const spot of farmSpots) {
    for (const zone of spot.zones) assert.ok(findPlace(zone), `${spot.name}: unknown place ${zone}`);
    for (const source of spot.sources) assert.ok(sources[source], `${spot.name}: unknown source ${source}`);
    for (const wowClass of spot.classes ?? []) assert.ok(classes.includes(wowClass), `${spot.name}: ${wowClass}`);
    assert.ok(spot.sources.length > 0, spot.name);
    if (spot.goldPerHour) assert.ok(spot.goldPerHour[0] > 0 && spot.goldPerHour[0] <= spot.goldPerHour[1], spot.name);
    if (spot.skill) assert.ok(professionFor(spot), `${spot.name}: skill without a profession`);
  }
});

test("every spot has a usable level window", () => {
  for (const spot of farmSpots) {
    const from = viableFrom(spot);
    assert.ok(Number.isInteger(from) && from >= 1, `${spot.name}: entry level ${from}`);
    assert.ok(from <= spot.until && spot.until <= levelCap, `${spot.name}: ${from}-${spot.until}`);
  }
});

test("no spot sends a character to mobs far above them", () => {
  for (const spot of farmSpots) {
    if (!spot.mobLevels || spot.kind === "dungeon") continue;
    const gap = spot.mobLevels[1] - viableFrom(spot);
    const allowed = spot.kind === "mobs" || spot.kind === "skinning" ? 3 : 5;
    assert.ok(gap <= allowed, `${spot.name}: mobs up to ${spot.mobLevels[1]}, entry at ${viableFrom(spot)}`);
  }
});

test("the Badlands mithril circuit starts at 40, not 35", () => {
  const circuit = farmSpots.find((spot) => spot.name === "Mithril circuit");
  assert.equal(viableFrom(circuit), 40);
});

test("every gathering profession has a spot at every level from 12 to 60", () => {
  for (const profession of gatheringProfessions) {
    for (let level = 12; level <= levelCap; level++) {
      const found = farmSpots.some((spot) =>
        professionFor(spot) === profession && !spot.classes && viableFrom(spot) <= level && level <= spot.until);
      assert.ok(found, `${profession} at level ${level}`);
    }
  }
});
