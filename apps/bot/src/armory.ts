import { classes, type GatheringProfession } from "@dungeon/knowledge";
import type { FarmQuery } from "./farm.js";

// The armory has no public API for Forever, but every character page embeds its
// data as JSON. Profession IDs are the same in every locale.
const professionIds: Record<number, GatheringProfession> = { 186: "Mining", 182: "Herbalism", 393: "Skinning", 356: "Fishing" };
const armoryHost = "worldofwarcraft.blizzard.com";

export type CharacterRef = { region: string; slug: string };

/** Accepts an armory link or a bare character slug such as "tilli-copperspark" (EU). */
export function parseCharacterRef(input: string): CharacterRef | undefined {
  const text = input.trim();
  let region = "eu";
  let slug = text;
  if (text.includes("/")) {
    const url = URL.parse(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const path = url?.pathname.match(/^\/[a-z-]+\/forever\/(eu|us|kr|tw)\/armory\/character\/([^/]+)\/?$/i);
    if (url?.hostname !== armoryHost || !path) return undefined;
    region = path[1]!.toLowerCase();
    try {
      slug = decodeURIComponent(path[2]!);
    } catch {
      return undefined;
    }
  }
  slug = slug.toLowerCase();
  return /^[\p{L}\p{N}'-]{2,60}$/u.test(slug) ? { region, slug } : undefined;
}

type ArmoryProfession = { id?: number; tiers?: { skillPoints?: number }[] };
type ArmoryCharacter = {
  name?: string;
  level?: number;
  class?: { enum?: string };
  professions?: { primaries?: ArmoryProfession[]; secondaries?: ArmoryProfession[] };
};

/** Reads level, class and gathering skills from an armory character page. */
export function parseCharacterPage(html: string): FarmQuery | undefined {
  const script = html.match(/id="character-profile-mount-initial-state">([\s\S]*?)<\/script>/)?.[1];
  if (!script) return undefined;
  let character: ArmoryCharacter | undefined;
  try {
    character = JSON.parse(script.slice(script.indexOf("{"), script.lastIndexOf("}") + 1)).character;
  } catch {
    return undefined;
  }
  const level = character?.level;
  if (typeof level !== "number" || !Number.isInteger(level) || level < 1) return undefined;
  const skills: FarmQuery["skills"] = {};
  for (const entry of [...(character?.professions?.primaries ?? []), ...(character?.professions?.secondaries ?? [])]) {
    const profession = professionIds[entry.id ?? 0];
    if (profession) skills[profession] = Math.max(0, ...(entry.tiers ?? []).map((tier) => tier.skillPoints ?? 0));
  }
  const className = character?.class?.enum?.toLowerCase();
  return {
    name: typeof character?.name === "string" ? character.name : undefined,
    level,
    wowClass: classes.find((value) => value.toLowerCase() === className),
    professions: Object.keys(skills) as GatheringProfession[],
    skills,
  };
}

/** Resolves to undefined when the armory has no such character; throws when it cannot be read. */
export async function fetchCharacter({ region, slug }: CharacterRef): Promise<FarmQuery | undefined> {
  const url = `https://${armoryHost}/en-gb/forever/${region}/armory/character/${encodeURIComponent(slug)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Armory responded with ${response.status}`);
  const character = parseCharacterPage(await response.text());
  if (!character) throw new Error("Armory page had no readable character data");
  return character;
}
