// WoW Forever game knowledge as plain data, for the bot, the website and anything else.
// Facts live in data/*.json; this file only adds the rules derived from them.
import dungeons from "./data/dungeons.json" with { type: "json" };
import farmSpots from "./data/farm-spots.json" with { type: "json" };
import sources from "./data/sources.json" with { type: "json" };
import zones from "./data/zones.json" with { type: "json" };

export { dungeons, farmSpots, sources, zones };

export const levelCap = 60;
export const gatheringProfessions = ["Mining", "Herbalism", "Skinning", "Fishing"];
export const classes = ["Druid", "Hunter", "Mage", "Paladin", "Priest", "Rogue", "Shaman", "Warlock", "Warrior"];

const places = new Map([...zones, ...dungeons].map((place) => [place.name, place]));
export const findPlace = (name) => places.get(name);

const professionByKind = { mining: "Mining", herbalism: "Herbalism", skinning: "Skinning", fishing: "Fishing" };
/** The gathering profession a spot needs, if any. */
export const professionFor = (spot) => professionByKind[spot.kind];

// Zone ranges are Group Finder suggestions and run wide (Badlands 33-50 holds
// mobs of 36-45), so with nothing better a character should be about mid-range.
function zoneEntryLevel(name) {
  const levels = places.get(name)?.levels;
  return levels ? Math.floor((levels[0] + Math.min(levels[1], levelCap)) / 2) - 1 : Infinity;
}

/**
 * The lowest character level a spot makes sense at.
 * 1. `from`: a guide rates this exact run, or the curator overrides (elites).
 * 2. `mobLevels`: where you kill, be at least mid-range, so no mob is more than
 *    3 levels above you; where you only gather between mobs, 5 levels.
 * 3. Otherwise the easiest of the spot's zones, by `zoneEntryLevel`.
 */
export function viableFrom(spot) {
  if (spot.from !== undefined) return spot.from;
  if (spot.mobLevels) {
    const [low, high] = spot.mobLevels;
    const kills = spot.kind === "mobs" || spot.kind === "skinning" || spot.kind === "dungeon";
    return kills ? Math.max(Math.ceil((low + high) / 2), high - 3) : high - 5;
  }
  return Math.min(...spot.zones.map(zoneEntryLevel));
}
