/**
 * ============================================================
 * TINA MINIGAME — Power-Up System
 * ============================================================
 * 20 unique power-up items with rarity tiers.
 * Each player can hold max 2 items at once.
 * Each player receives 2 random items at game start.
 *
 * Rarity tiers:
 *   Common   (40%) — basic utility
 *   Uncommon (30%) — moderate impact
 *   Rare     (20%) — strong effects
 *   Epic     (8%)  — game-changing
 *   Legendary(2%)  — ultra rare
 */

// ── Rarity definitions ──────────────────────────────────────
export const RARITY = {
  COMMON:    { id: 'common',    label: 'Common',    color: '#95a5a6', weight: 40, glow: 'none' },
  UNCOMMON:  { id: 'uncommon',  label: 'Uncommon',  color: '#2ecc71', weight: 30, glow: '0 0 8px #2ecc71' },
  RARE:      { id: 'rare',      label: 'Rare',      color: '#3498db', weight: 20, glow: '0 0 12px #3498db' },
  EPIC:      { id: 'epic',      label: 'Epic',      color: '#9b59b6', weight: 8,  glow: '0 0 16px #9b59b6' },
  LEGENDARY: { id: 'legendary', label: 'Legendary', color: '#f1c40f', weight: 2,  glow: '0 0 20px #f1c40f, 0 0 40px #f39c12' },
};

// ── 20 Power-Up Items ───────────────────────────────────────
export const POWER_UPS = [
  // ─── COMMON (40%) ───
  {
    id: 'double_points',
    name: 'Double Points',
    emoji: '💎',
    description: '×2 points for the next question',
    instruction: 'Activate before answering. Score doubles!',
    category: 'boost',
    rarity: RARITY.COMMON,
    effect: { type: 'score_multiply', value: 2, duration: 1 },
  },
  {
    id: 'shield',
    name: 'Shield',
    emoji: '🛡️',
    description: 'Block 1 incoming attack',
    instruction: 'Auto-activates when you are attacked.',
    category: 'defense',
    rarity: RARITY.COMMON,
    effect: { type: 'block_attack', value: 1 },
  },
  {
    id: 'speed_boost',
    name: 'Speed Boost',
    emoji: '⚡',
    description: '+5 seconds for current question',
    instruction: 'Tap to add 5 extra seconds to the timer.',
    category: 'boost',
    rarity: RARITY.COMMON,
    effect: { type: 'time_extend', value: 5 },
  },
  {
    id: 'hint',
    name: 'Hint',
    emoji: '💡',
    description: 'Remove 1 wrong answer (MCQ only)',
    instruction: 'Tap to eliminate one incorrect option.',
    category: 'boost',
    rarity: RARITY.COMMON,
    effect: { type: 'eliminate_wrong', value: 1 },
  },
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    emoji: '🍀',
    description: '+50% chance to get next item',
    instruction: 'Passive: boosts your loot luck for 1 round.',
    category: 'boost',
    rarity: RARITY.COMMON,
    effect: { type: 'luck_boost', value: 1.5 },
  },
  {
    id: 'mini_heal',
    name: 'Bandage',
    emoji: '🩹',
    description: 'Restore streak to 2',
    instruction: 'Tap to recover part of your lost streak.',
    category: 'boost',
    rarity: RARITY.COMMON,
    effect: { type: 'restore_streak', value: 2 },
  },

  // ─── UNCOMMON (30%) ───
  {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    emoji: '💨',
    description: 'Blur a random opponent\'s screen for 3s',
    instruction: 'Tap to blind a random player!',
    category: 'attack',
    rarity: RARITY.UNCOMMON,
    effect: { type: 'blur_screen', duration: 3 },
  },
  {
    id: 'freeze',
    name: 'Freeze',
    emoji: '❄️',
    description: 'Freeze a random opponent for 3s',
    instruction: 'Tap to freeze a random player\'s input!',
    category: 'attack',
    rarity: RARITY.UNCOMMON,
    effect: { type: 'freeze_player', duration: 3 },
  },
  {
    id: 'reverse',
    name: 'Reverse',
    emoji: '🔄',
    description: 'Flip an opponent\'s answer buttons for 5s',
    instruction: 'Tap to reverse a random player\'s controls!',
    category: 'attack',
    rarity: RARITY.UNCOMMON,
    effect: { type: 'reverse_controls', duration: 5 },
  },
  {
    id: 'ghost',
    name: 'Ghost Mode',
    emoji: '👻',
    description: 'Hide your name on the leaderboard for 1 round',
    instruction: 'Become invisible on the scoreboard!',
    category: 'defense',
    rarity: RARITY.UNCOMMON,
    effect: { type: 'hide_name', duration: 1 },
  },
  {
    id: 'fog',
    name: 'Fog',
    emoji: '🌫️',
    description: 'Shrink question text for an opponent for 5s',
    instruction: 'Tap to make the question tiny for a random player!',
    category: 'attack',
    rarity: RARITY.UNCOMMON,
    effect: { type: 'shrink_text', duration: 5 },
  },
  {
    id: 'scramble',
    name: 'Scramble',
    emoji: '🌀',
    description: 'Shuffle an opponent\'s answer positions',
    instruction: 'Tap to mix up a random player\'s options!',
    category: 'attack',
    rarity: RARITY.UNCOMMON,
    effect: { type: 'scramble_options' },
  },

  // ─── RARE (20%) ───
  {
    id: 'pirate',
    name: 'Pirate',
    emoji: '🏴‍☠️',
    description: 'Steal 150 points from the leader',
    instruction: 'Tap to steal points from 1st place!',
    category: 'attack',
    rarity: RARITY.RARE,
    effect: { type: 'steal_points', value: 150 },
  },
  {
    id: 'magnifier',
    name: 'Magnifier',
    emoji: '🔍',
    description: 'Flash the correct answer for 1 second',
    instruction: 'Tap to briefly see the correct answer!',
    category: 'boost',
    rarity: RARITY.RARE,
    effect: { type: 'reveal_answer', duration: 1 },
  },
  {
    id: 'barricade',
    name: 'Barricade',
    emoji: '🚧',
    description: 'Hide the correct answer from an opponent for 2s',
    instruction: 'Tap to hide the right answer from a random player!',
    category: 'attack',
    rarity: RARITY.RARE,
    effect: { type: 'hide_correct', duration: 2 },
  },
  {
    id: 'boomerang',
    name: 'Boomerang',
    emoji: '🪃',
    description: 'Reflect any attack back to the attacker',
    instruction: 'Auto-activates: returns the attack to sender!',
    category: 'defense',
    rarity: RARITY.RARE,
    effect: { type: 'reflect_attack' },
  },
  {
    id: 'medkit',
    name: 'Medkit',
    emoji: '❤️‍🩹',
    description: 'Fully restore streak to 5',
    instruction: 'Tap to max out your streak bonus!',
    category: 'boost',
    rarity: RARITY.RARE,
    effect: { type: 'restore_streak', value: 5 },
  },

  // ─── EPIC (8%) ───
  {
    id: 'lightning',
    name: 'Lightning Strike',
    emoji: '🌩️',
    description: '-200 points to 3 random opponents',
    instruction: 'Tap to strike 3 random players!',
    category: 'attack',
    rarity: RARITY.EPIC,
    effect: { type: 'mass_damage', value: 200, targets: 3 },
  },
  {
    id: 'swap',
    name: 'Rank Swap',
    emoji: '🔀',
    description: 'Swap rank with the player above you',
    instruction: 'Tap to trade scores with the player ahead!',
    category: 'control',
    rarity: RARITY.EPIC,
    effect: { type: 'swap_rank' },
  },

  // ─── LEGENDARY (2%) ───
  {
    id: 'triple_points',
    name: 'Triple Points',
    emoji: '👑',
    description: '×3 points for the next question!',
    instruction: 'Activate before answering. Score TRIPLES!',
    category: 'boost',
    rarity: RARITY.LEGENDARY,
    effect: { type: 'score_multiply', value: 3, duration: 1 },
  },
];

// ── Lookup map ──────────────────────────────────────────────
const POWER_UP_MAP = {};
POWER_UPS.forEach(p => { POWER_UP_MAP[p.id] = p; });

export function getPowerUp(id) {
  return POWER_UP_MAP[id] || null;
}

// ── Weighted random selection ───────────────────────────────
/**
 * Roll for a random item based on rarity weights.
 * @param {number} [luckMultiplier=1] - Multiplier for rare+ chances
 * @returns {Object|null} - A power-up item or null if unlucky
 */
export function rollForItem(luckMultiplier = 1) {
  // Build weighted pool
  const pool = [];
  POWER_UPS.forEach(item => {
    let weight = item.rarity.weight;
    // Luck boosts rare+ items
    if (item.rarity.weight <= 20 && luckMultiplier > 1) {
      weight = Math.round(weight * luckMultiplier);
    }
    for (let i = 0; i < weight; i++) {
      pool.push(item);
    }
  });

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get 2 random starting items for a player (no duplicates)
 * @returns {Object[]} - Array of 2 power-up items
 */
export function getStartingItems() {
  const first = rollForItem();
  let second = rollForItem();
  // Avoid exact duplicate
  let attempts = 0;
  while (second.id === first.id && attempts < 10) {
    second = rollForItem();
    attempts++;
  }
  return [first, second];
}

// ── Inventory management ────────────────────────────────────
export const MAX_INVENTORY = 2;

/**
 * Try to add an item to inventory
 * @param {Object[]} inventory - Current items
 * @param {Object} newItem - Item to add
 * @returns {{ success: boolean, inventory: Object[], dropped: Object|null }}
 */
export function addToInventory(inventory, newItem) {
  if (inventory.length < MAX_INVENTORY) {
    return { success: true, inventory: [...inventory, newItem], dropped: null };
  }
  // Inventory full — item is lost
  return { success: false, inventory, dropped: newItem };
}

/**
 * Use an item from inventory
 * @param {Object[]} inventory - Current items
 * @param {number} slotIndex - Which slot to use (0 or 1)
 * @returns {{ item: Object|null, inventory: Object[] }}
 */
export function useFromInventory(inventory, slotIndex) {
  if (slotIndex < 0 || slotIndex >= inventory.length) {
    return { item: null, inventory };
  }
  const item = inventory[slotIndex];
  const newInventory = inventory.filter((_, i) => i !== slotIndex);
  return { item, inventory: newInventory };
}

/**
 * Category display helpers
 */
export const CATEGORY_INFO = {
  attack:  { label: 'Attack',  color: '#e74c3c', icon: '⚔️' },
  defense: { label: 'Defense', color: '#3498db', icon: '🛡️' },
  boost:   { label: 'Boost',   color: '#2ecc71', icon: '⬆️' },
  control: { label: 'Control', color: '#9b59b6', icon: '🎯' },
};
