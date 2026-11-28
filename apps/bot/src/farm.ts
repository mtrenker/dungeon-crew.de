import {
  farmSpots, professionFor, viableFrom, type FarmSpot, type GatheringProfession, type WowClass,
} from "@dungeon/knowledge";

export type FarmQuery = {
  level: number;
  professions?: GatheringProfession[];
  wowClass?: WowClass;
  /** Character name, when read from the armory. */
  name?: string;
  /** Known skill per profession. A profession without one counts as skilled enough. */
  skills?: Partial<Record<GatheringProfession, number>>;
};

const midpoint = (spot: FarmSpot) => (spot.goldPerHour ? (spot.goldPerHour[0] + spot.goldPerHour[1]) / 2 : -1);

function lacksSkill(spot: FarmSpot, skills: FarmQuery["skills"] = {}) {
  const profession = professionFor(spot);
  return profession !== undefined && spot.skill !== undefined && (skills[profession] ?? Infinity) < spot.skill;
}

/** Spots fitting level, professions and class, best estimated income first, unrated last. */
function candidates({ level, professions = [], wowClass }: FarmQuery, spots: FarmSpot[]): FarmSpot[] {
  return spots
    .filter((spot) => level >= viableFrom(spot) && level <= spot.until)
    .filter((spot) => {
      const profession = professionFor(spot);
      return !profession || professions.includes(profession);
    })
    .filter((spot) => !spot.classes || (wowClass !== undefined && spot.classes.includes(wowClass)))
    .sort((a, b) => midpoint(b) - midpoint(a));
}

/** Spots the character can use now. */
export function findFarmSpots(query: FarmQuery, spots = farmSpots): FarmSpot[] {
  return candidates(query, spots).filter((spot) => !lacksSkill(spot, query.skills));
}

const formatRate = (spot: FarmSpot) => {
  const [low, high] = spot.goldPerHour ?? [];
  return low === undefined ? "no estimate" : low === high ? `~${low}g/h` : `~${low}-${high}g/h`;
};

const evidenceNotes = {
  beta: "Seen in the Forever beta.",
  classic: "Classic route, unconfirmed in Forever.",
  report: "From a player report.",
};

function formatSpot(spot: FarmSpot): string {
  const profession = professionFor(spot);
  const details = [
    spot.loot,
    profession && `${profession}${spot.skill ? ` ${spot.skill}` : ""}`,
    spot.mobLevels && `mobs ${spot.mobLevels.join("-")}`,
  ].filter(Boolean).join(" · ");
  const notes = [spot.evidence && evidenceNotes[spot.evidence], spot.note].filter(Boolean).join(" ");
  return `- **${spot.name}**, ${spot.zones.join(", ")} (${formatRate(spot)})\n  ${details}${notes ? `\n  ${notes}` : ""}`;
}

export function farmReply(query: FarmQuery, limit = 5, classLimit = 3): string {
  const { level, professions = [], wowClass, name, skills = {} } = query;
  const traits = [
    `level ${level}`,
    wowClass,
    ...professions.map((profession) => [profession, skills[profession]].filter((part) => part !== undefined).join(" ")),
  ].filter(Boolean).join(", ");
  const usable = findFarmSpots(query);
  const spots = usable.filter((spot) => !spot.classes).slice(0, limit);
  const classSpots = usable.filter((spot) => spot.classes).slice(0, classLimit);
  const locked = candidates(query, farmSpots).find((spot) => spot.goldPerHour && lacksSkill(spot, skills));
  const hints: string[] = [];
  if (locked) hints.push(`Next up: ${professionFor(locked)} ${locked.skill} opens the ${locked.name} in ${locked.zones.join(", ")} (${formatRate(locked)}).`);
  if (professions.length === 0) hints.push("A gathering profession usually beats mob farming below 60.");
  if (!wowClass) hints.push("Add your class to see class-specific farms.");
  if (level >= 48) hints.push("Most quests from level 48 pay extra gold, so keep questing.");
  if (level === 60) hints.push("Pix Xizzix in Booty Bay has a weekly dungeon quest worth 10-100g.");
  const sections = [
    spots.map(formatSpot).join("\n"),
    classSpots.length > 0 ? `**${wowClass} runs**\n${classSpots.map(formatSpot).join("\n")}` : "",
  ].filter(Boolean);
  if (sections.length === 0) {
    sections.push("No spot on the list fits yet. Quest, loot everything, and sell cloth and materials on the auction house.");
  }
  return [
    `**Farming spots for ${name ? `${name} (${traits})` : traits}**`,
    ...sections,
    ...hints,
    "-# Guide estimates from November 2026 prices: a ranking, not a promise. Sell on your faction's auction house.",
  ].join("\n");
}
