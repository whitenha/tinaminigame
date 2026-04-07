/**
 * ============================================================
 * TINA MINIGAME — Game Event Bus
 * ============================================================
 * Central pub/sub system. Game engines emit events,
 * subscribers (sound, VFX, analytics) react automatically.
 *
 * Supports both singleton (global) and scoped (per-game) modes.
 */

export const GameEvent = {
  GAME_START:      'GAME_START',
  COUNTDOWN_TICK:  'COUNTDOWN_TICK',
  COUNTDOWN_GO:    'COUNTDOWN_GO',
  CORRECT:         'CORRECT',
  WRONG:           'WRONG',
  TIMER_WARNING:   'TIMER_WARNING',
  TIME_UP:         'TIME_UP',
  STREAK_BONUS:    'STREAK_BONUS',
  GAME_COMPLETE:   'GAME_COMPLETE',
  ITEM_REVEAL:     'ITEM_REVEAL',
  CARD_FLIP:       'CARD_FLIP',
  WHEEL_SPIN:      'WHEEL_SPIN',
  WHEEL_STOP:      'WHEEL_STOP',
  BOX_OPEN:        'BOX_OPEN',
  CLICK:           'CLICK',
  LIFELINE_USED:   'LIFELINE_USED',
  BET_PLACED:      'BET_PLACED',
  MUSIC_START:     'MUSIC_START',
  MUSIC_STOP:      'MUSIC_STOP',
  // Pairing engine
  PAIR_MATCH:      'PAIR_MATCH',
  PAIR_MISMATCH:   'PAIR_MISMATCH',
  GROUP_COMPLETE:  'GROUP_COMPLETE',
  // Ordering engine
  ORDER_CORRECT:   'ORDER_CORRECT',
  ORDER_SWAP:      'ORDER_SWAP',
};

class GameEventBus {
  constructor() {
    this._listeners = new Map();
    this._id = Math.random().toString(36).slice(2, 8);
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  off(event, callback) {
    this._listeners.get(event)?.delete(callback);
  }

  emit(event, payload = {}) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(payload); } catch (e) { console.warn(`[EventBus-${this._id}] Error in ${event}:`, e); }
      });
    }
  }

  clear() {
    this._listeners.clear();
  }
}

/**
 * Create a NEW scoped bus instance (recommended for per-game isolation).
 * Each game player gets its own bus → no listener leak between games.
 */
export function createGameEventBus() {
  return new GameEventBus();
}

// Backward-compat singleton (only for global analytics/logging)
let _globalBus = null;
export function getGameEventBus() {
  if (!_globalBus) _globalBus = new GameEventBus();
  return _globalBus;
}

export default GameEventBus;
