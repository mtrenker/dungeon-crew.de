export type GatheringProfession = "Mining" | "Herbalism" | "Skinning" | "Fishing";
export type WowClass = "Druid" | "Hunter" | "Mage" | "Paladin" | "Priest" | "Rogue" | "Shaman" | "Warlock" | "Warrior";
export type SourceId = "warcraftmaps" | "conquestcapped" | "forevermastery" | "mmonster";

/** A zone or dungeon. `levels` is the Group Finder range, wider than the mobs inside. */
export type Place = { name: string; levels?: [number, number]; new?: boolean };
export type Source = { name: string; url: string; note: string };

export type FarmSpot = {
  name: string;
  /** Names from `zones` or `dungeons`. */
  zones: string[];
  kind: "mobs" | "mining" | "herbalism" | "skinning" | "fishing" | "dungeon";
  /** Levels of the mobs you kill, or that stand along the route. */
  mobLevels?: [number, number];
  /** Entry level a guide gives for this exact run; overrides the derived one. */
  from?: number;
  /** Last character level the spot is worth it. */
  until: number;
  loot: string;
  /** A guide's estimate, [low, high]. Absent when no guide gives one. */
  goldPerHour?: [number, number];
  /** Minimum skill in the spot's gathering profession. */
  skill?: number;
  /** Only these classes can run it solo. */
  classes?: WowClass[];
  /** beta: seen in the Forever beta. classic: Classic route, unconfirmed. report: a player's result. */
  evidence?: "beta" | "classic" | "report";
  note?: string;
  sources: SourceId[];
};

export const levelCap: 60;
export const gatheringProfessions: readonly GatheringProfession[];
export const classes: readonly WowClass[];
export const zones: Place[];
export const dungeons: Place[];
export const sources: Record<SourceId, Source>;
export const farmSpots: FarmSpot[];
export function findPlace(name: string): Place | undefined;
export function professionFor(spot: FarmSpot): GatheringProfession | undefined;
export function viableFrom(spot: FarmSpot): number;
