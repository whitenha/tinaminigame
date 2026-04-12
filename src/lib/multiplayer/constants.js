/**
 * ============================================================
 * TINA MINIGAME — Multiplayer Constants & Helpers
 * ============================================================
 */

// ── Random Room Code Generator ──────────────────────────────
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Random Image Avatar ─────────────────────────────────────
export const AVATARS = [
  '/avatars/avatar_1.png', '/avatars/avatar_2.png',
  '/avatars/avatar_3.png', '/avatars/avatar_4.png',
  '/avatars/avatar_5.png', '/avatars/avatar_6.png',
  '/avatars/avatar_7.png', '/avatars/avatar_8.png',
];

export function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

// ── Host player names (used to filter from leaderboard) ─────
export const HOST_NAMES = ['Host Teacher', 'Giáo viên'];

export function isHostName(name) {
  return HOST_NAMES.includes(name);
}

// ── Ghost cleanup grace period (ms) ─────────────────────────
export const GHOST_GRACE_MS = 20000;

// ── Heartbeat interval (ms) ─────────────────────────────────
export const HEARTBEAT_INTERVAL_MS = 8000;

// ── Fetch debounce (ms) ─────────────────────────────────────
export const FETCH_DEBOUNCE_MS = 300;
