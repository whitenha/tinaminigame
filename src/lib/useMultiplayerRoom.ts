/**
 * ============================================================
 * TINA MINIGAME — useMultiplayerRoom (Re-export)
 * ============================================================
 * This file is kept for backward compatibility.
 * The actual implementation has been modularized into:
 *
 *   src/lib/multiplayer/
 *   ├── roomStore.js         — Zustand state store
 *   ├── useRoomChannel.js    — Channel subscription + handlers
 *   ├── useRoomActions.js    — Create/Join/Leave room
 *   ├── useGameplay.js       — Host controls + scoring
 *   ├── usePowerUps.js       — Inventory + effects system
 *   ├── useMultiplayerRoom.js— Thin wrapper (same API)
 *   └── constants.js         — Shared constants
 *
 * All existing consumers continue to work without changes.
 */

export { useMultiplayerRoom } from '@/lib/multiplayer/useMultiplayerRoom';
