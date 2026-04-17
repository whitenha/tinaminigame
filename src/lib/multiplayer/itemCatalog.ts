/**
 * ============================================================
 * ITEM CATALOG — All 15 Game Items for Gameshow Race
 * ============================================================
 * Categories:
 *   Active  — Player clicks to activate
 *   Passive — Auto-triggers when a condition is met
 *
 * Target types:
 *   self        — Affects only the user
 *   pick_target — User picks 1 opponent
 *   random      — Server picks a random opponent
 *   global      — Affects all players EXCEPT the user
 *   global_all  — Affects ALL players INCLUDING the user
 */

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  type: 'active' | 'passive';
  target: 'self' | 'pick_target' | 'random' | 'global' | 'global_all';
  instant: boolean;               // true = no 5s activation delay
  pierceShieldMirror: boolean;    // true = ignores Shield & Mirror
  expiresAtPercent?: number;      // auto-remove after X% of questions
  description: string;
  weight: number;                 // drop weight (higher = more common)
}

export const ITEM_CATALOG: Record<string, ItemDef> = {
  // ─── Self-buff (Active) ───────────────────────────────────
  double_points: {
    id: 'double_points',
    name: 'x2 Điểm',
    emoji: '✨',
    type: 'active',
    target: 'self',
    instant: true,
    pierceShieldMirror: false,
    description: 'Nhân đôi điểm câu đúng tiếp theo',
    weight: 15,
  },
  skip_question: {
    id: 'skip_question',
    name: 'Nhảy Cóc',
    emoji: '🚀',
    type: 'active',
    target: 'self',
    instant: false,
    pierceShieldMirror: false,
    description: 'Bỏ qua câu hiện tại, tính đúng, cộng điểm',
    weight: 8,
  },
  mirror: {
    id: 'mirror',
    name: 'Gương Phản Chiếu',
    emoji: '🪞',
    type: 'active',
    target: 'self',
    instant: false,
    pierceShieldMirror: false,
    description: '30s: ai dùng item chỉ định vào bạn → họ bị choáng 5s',
    weight: 5,
  },
  invisibility: {
    id: 'invisibility',
    name: 'Tàng Hình',
    emoji: '👻',
    type: 'active',
    target: 'self',
    instant: false,
    pierceShieldMirror: false,
    description: '45s không bị chỉ định bởi ai',
    weight: 4,
  },

  // ─── Passive ──────────────────────────────────────────────
  shield: {
    id: 'shield',
    name: 'Khiên',
    emoji: '🛡️',
    type: 'passive',
    target: 'self',
    instant: true,
    pierceShieldMirror: false,
    description: 'Tự động chặn 1 item chỉ định nhắm vào bạn',
    weight: 12,
  },
  save_streak: {
    id: 'save_streak',
    name: 'Cứu Viện',
    emoji: '🩺',
    type: 'passive',
    target: 'self',
    instant: true,
    pierceShieldMirror: false,
    description: 'Khi sai mà streak ≥ 3, tự bảo vệ streak',
    weight: 10,
  },

  // ─── Target (Active, pick_target) ─────────────────────────
  smoke_bomb: {
    id: 'smoke_bomb',
    name: 'Khói Mù',
    emoji: '💨',
    type: 'active',
    target: 'pick_target',
    instant: false,
    pierceShieldMirror: false,
    description: 'Khóa màn hình mục tiêu 3 giây',
    weight: 12,
  },
  freeze: {
    id: 'freeze',
    name: 'Đóng Băng',
    emoji: '🧊',
    type: 'active',
    target: 'pick_target',
    instant: false,
    pierceShieldMirror: false,
    description: 'Đóng băng 2/4 nút đáp án 10 giây',
    weight: 8,
  },
  help: {
    id: 'help',
    name: 'Giúp Đỡ',
    emoji: '🤝',
    type: 'active',
    target: 'pick_target',
    instant: false,
    pierceShieldMirror: false,
    description: 'Ép mục tiêu trả lời 2 câu; đúng = bạn +1000đ, sai = họ bị 5s đỏ',
    weight: 5,
  },
  thief_hand: {
    id: 'thief_hand',
    name: 'Bàn Tay Trộm',
    emoji: '🏴‍☠️',
    type: 'active',
    target: 'pick_target',
    instant: false,
    pierceShieldMirror: false,
    description: 'Cướp 1 item ngẫu nhiên từ mục tiêu',
    weight: 5,
  },
  infect: {
    id: 'infect',
    name: 'Gây Nhiễm',
    emoji: '✒️',
    type: 'active',
    target: 'pick_target',
    instant: false,
    pierceShieldMirror: false,
    description: 'Đảo ngược thứ tự câu hỏi mục tiêu 3 câu',
    weight: 7,
  },

  // ─── Random (Active, random) ──────────────────────────────
  vampire_bat: {
    id: 'vampire_bat',
    name: 'Dơi Hút Điểm',
    emoji: '🦇',
    type: 'active',
    target: 'random',
    instant: false,
    pierceShieldMirror: false,
    expiresAtPercent: 0.5,
    description: 'Hút 10% tổng điểm người ngẫu nhiên (hết hạn sau 50% câu)',
    weight: 4,
  },

  // ─── Global (Active, global / global_all) ─────────────────
  earthquake: {
    id: 'earthquake',
    name: 'Động Đất',
    emoji: '🌍',
    type: 'active',
    target: 'global',
    instant: false,
    pierceShieldMirror: true,
    description: 'Mọi người khác bị rung, không bấm được 5 giây',
    weight: 3,
  },
  fog: {
    id: 'fog',
    name: 'Sương Mù',
    emoji: '🌫️',
    type: 'active',
    target: 'global',
    instant: false,
    pierceShieldMirror: true,
    description: 'Mọi người khác bị mờ nhòe 10 giây',
    weight: 3,
  },
  time_bomb: {
    id: 'time_bomb',
    name: 'Bom Hẹn Giờ',
    emoji: '💣',
    type: 'active',
    target: 'global_all',
    instant: false,
    pierceShieldMirror: true,
    description: '20s: ai sai → -5000đ + choáng',
    weight: 2,
  },
};

/** All item IDs */
export const ALL_ITEM_IDS = Object.keys(ITEM_CATALOG);

/** Get an item definition by ID */
export function getItemDef(id: string): ItemDef | undefined {
  return ITEM_CATALOG[id];
}

/** Readable label: "🛡️ Khiên" */
export function itemLabel(id: string): string {
  const def = ITEM_CATALOG[id];
  return def ? `${def.emoji} ${def.name}` : id;
}

/**
 * Weighted random item drop.
 * Returns a random item ID based on weight distribution.
 */
export function rollRandomItem(): string {
  const entries = Object.values(ITEM_CATALOG);
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return entries[entries.length - 1].id; // fallback
}

/**
 * FIFO inventory: max 2 slots.
 * When full, oldest item is discarded, second becomes first, new goes to slot 2.
 */
export function addToInventory(inventory: string[], newItem: string): string[] {
  const inv = [...inventory];
  if (inv.length >= 2) {
    inv.shift(); // remove oldest (slot 0)
  }
  inv.push(newItem); // new item goes to last slot
  return inv;
}

/**
 * Check if an item should be auto-removed due to expiry (e.g. vampire_bat at 50%).
 */
export function checkItemExpiry(
  inventory: string[],
  currentQuestionIndex: number,
  totalQuestions: number
): string[] {
  return inventory.filter(itemId => {
    const def = ITEM_CATALOG[itemId];
    if (def?.expiresAtPercent) {
      const threshold = Math.floor(totalQuestions * def.expiresAtPercent);
      if (currentQuestionIndex >= threshold) return false; // expired
    }
    return true;
  });
}

/** Items that require picking a target player */
export function needsTargetPicker(itemId: string): boolean {
  const def = ITEM_CATALOG[itemId];
  return def?.target === 'pick_target';
}

/** Items that are passive (cannot be manually clicked) */
export function isPassiveItem(itemId: string): boolean {
  const def = ITEM_CATALOG[itemId];
  return def?.type === 'passive';
}
