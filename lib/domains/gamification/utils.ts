// ============================================================================
// Gamification Domain Utilities
// Pure functions — no Supabase, no React, no Next.js
// ============================================================================

import type { BadgeRarity } from "./types";

// ---------- XP Level Thresholds ----------
// Each index = level, value = total XP needed to reach that level.
// Level 0 = 0 XP (Recruit), Level 1 = 100 XP (Private), etc.
const LEVEL_THRESHOLDS = [
  0, // Level 0: Recruit
  100, // Level 1: Private
  300, // Level 2: Specialist
  600, // Level 3: Corporal
  1000, // Level 4: Sergeant
  1500, // Level 5: Staff Sergeant
  2200, // Level 6: Master Sergeant
  3000, // Level 7: First Sergeant
  4000, // Level 8: Sergeant Major
  5500, // Level 9: Command Sergeant Major
];

// Military-inspired rank titles matching each level
const LEVEL_TITLES = [
  "Recruit",
  "Private",
  "Specialist",
  "Corporal",
  "Sergeant",
  "Staff Sergeant",
  "Master Sergeant",
  "First Sergeant",
  "Sergeant Major",
  "Command Sergeant Major",
];

/**
 * Calculate the user's level from their total XP.
 * Returns the highest level whose threshold the user has reached.
 */
export function calculateLevel(totalXp: number): number {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

/**
 * Get the military-inspired rank title for a level.
 * Falls back to the highest title if level exceeds array bounds.
 */
export function getLevelTitle(level: number): string {
  if (level < 0) return LEVEL_TITLES[0];
  if (level >= LEVEL_TITLES.length) return LEVEL_TITLES[LEVEL_TITLES.length - 1];
  return LEVEL_TITLES[level];
}

/**
 * Get the total XP required to reach the next level.
 * Returns Infinity if the user is at max level.
 */
export function getXpForNextLevel(currentLevel: number): number {
  const nextLevel = currentLevel + 1;
  if (nextLevel >= LEVEL_THRESHOLDS.length) return Infinity;
  return LEVEL_THRESHOLDS[nextLevel];
}

/**
 * Get the total XP threshold for the current level.
 */
export function getXpForCurrentLevel(currentLevel: number): number {
  if (currentLevel < 0) return 0;
  if (currentLevel >= LEVEL_THRESHOLDS.length)
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[currentLevel];
}

/**
 * Calculate the XP progress within the current level (0 to xpNeeded).
 * E.g., if level 2 requires 300 XP and level 3 requires 600 XP,
 * a user with 450 XP has 150/300 progress in level 2.
 */
export function getXpProgressInLevel(totalXp: number): {
  earned: number;
  needed: number;
  percentage: number;
} {
  const level = calculateLevel(totalXp);
  const currentThreshold = getXpForCurrentLevel(level);
  const nextThreshold = getXpForNextLevel(level);

  if (nextThreshold === Infinity) {
    return { earned: 0, needed: 0, percentage: 100 };
  }

  const earned = totalXp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  const percentage = Math.min(Math.round((earned / needed) * 100), 100);

  return { earned, needed, percentage };
}

/**
 * Format an XP amount for display.
 * Examples: "10 XP", "1,250 XP", "0 XP"
 */
export function formatXpAmount(xp: number): string {
  return `${xp.toLocaleString()} XP`;
}

/**
 * Tailwind color classes for each badge rarity tier.
 */
const RARITY_COLORS: Record<
  BadgeRarity,
  { text: string; bg: string; border: string; ring: string }
> = {
  common: {
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-300 dark:border-slate-600",
    ring: "ring-slate-300 dark:ring-slate-600",
  },
  uncommon: {
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-300 dark:border-green-700",
    ring: "ring-green-300 dark:ring-green-700",
  },
  rare: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-300 dark:border-blue-700",
    ring: "ring-blue-300 dark:ring-blue-700",
  },
  epic: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-300 dark:border-purple-700",
    ring: "ring-purple-300 dark:ring-purple-700",
  },
  legendary: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-300 dark:border-amber-700",
    ring: "ring-amber-300 dark:ring-amber-700",
  },
};

/**
 * Get the Tailwind color classes for a badge rarity.
 */
export function getRarityColor(rarity: BadgeRarity) {
  return RARITY_COLORS[rarity];
}

/**
 * Get display label for a rarity tier.
 */
export function getRarityLabel(rarity: BadgeRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

/**
 * Get the max level available.
 */
export function getMaxLevel(): number {
  return LEVEL_THRESHOLDS.length - 1;
}
