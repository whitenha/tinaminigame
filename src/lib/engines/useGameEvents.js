/**
 * ============================================================
 * TINA MINIGAME — useGameEvents Hook v2 (TV Gameshow Edition)
 * ============================================================
 * Creates a SCOPED event bus per game instance.
 * Auto-wires Sound Manager + Confetti Visual Effects.
 * Every game automatically gets dramatic TV show effects.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createGameEventBus, GameEvent } from '@/lib/gameEvents';
import { getSoundManager } from '@/lib/sounds';
import {
  fireCorrect, fireWrong, fireStreak,
  fireGameComplete, fireJackpot,
  flashGreen, flashRedShake,
  showTimerDanger, hideTimerDanger,
} from '@/lib/confettiEffects';

export function useGameEvents(musicType = 'quiz') {
  // ✅ FIX Bug #3: Scoped bus per game — no singleton leak
  const busRef = useRef(null);
  if (!busRef.current) {
    busRef.current = createGameEventBus();
  }
  const bus = busRef.current;
  const soundRef = useRef(null);

  useEffect(() => {
    soundRef.current = getSoundManager();
    const s = () => soundRef.current;

    const wirings = [
      // ── Core Interactions ──────────────────────────────
      bus.on(GameEvent.CLICK, () => s()?.click()),

      // ── Correct: Sound + Confetti + Green Flash ────────
      bus.on(GameEvent.CORRECT, () => {
        s()?.correct();
        s()?.crowdApplause();
        fireCorrect();
        flashGreen();
      }),

      // ── Wrong: Sound + Red Shake + Sad Particles ──────
      bus.on(GameEvent.WRONG, () => {
        s()?.wrong();
        s()?.crowdAww();
        fireWrong();
        flashRedShake();
      }),

      // ── Timer ─────────────────────────────────────────
      bus.on(GameEvent.TIMER_WARNING, () => {
        s()?.timerWarning();
        showTimerDanger();
      }),
      bus.on(GameEvent.TIME_UP, () => {
        s()?.timeUp();
        hideTimerDanger();
        flashRedShake();
      }),

      // ── Countdown ─────────────────────────────────────
      bus.on(GameEvent.COUNTDOWN_TICK, () => s()?.countdownBeep(false)),
      bus.on(GameEvent.COUNTDOWN_GO,   () => s()?.countdownBeep(true)),

      // ── Game Lifecycle ────────────────────────────────
      bus.on(GameEvent.GAME_START, () => {
        s()?.gameStart();
        s()?.startMusic(musicType);
        hideTimerDanger();
      }),
      bus.on(GameEvent.GAME_COMPLETE, () => {
        s()?.stopMusic();
        s()?.gameComplete();
        hideTimerDanger();
        fireGameComplete();
      }),

      // ── Music ─────────────────────────────────────────
      bus.on(GameEvent.MUSIC_START, (p) => s()?.startMusic(p?.type || musicType)),
      bus.on(GameEvent.MUSIC_STOP,  () => s()?.stopMusic()),

      // ── Reveal Engine ─────────────────────────────────
      bus.on(GameEvent.CARD_FLIP,  () => s()?.cardFlip()),
      bus.on(GameEvent.WHEEL_SPIN, () => s()?.wheelTick()),
      bus.on(GameEvent.WHEEL_STOP, () => {
        s()?.wheelStop();
        fireCorrect();
      }),
      bus.on(GameEvent.BOX_OPEN, () => {
        s()?.boxOpen();
        fireCorrect();
        flashGreen();
      }),
      bus.on(GameEvent.ITEM_REVEAL, () => s()?.reveal()),

      // ── Gameshow ──────────────────────────────────────
      bus.on(GameEvent.LIFELINE_USED, () => s()?.lifeline()),
      bus.on(GameEvent.BET_PLACED,    () => s()?.betPlaced()),

      // ── Streak: Sound + Dual Cannons ──────────────────
      bus.on(GameEvent.STREAK_BONUS, (p) => {
        s()?.streakFire();
        s()?.bonus();
        fireStreak(p?.streak || 3);
      }),

      // ── Pairing Engine ────────────────────────────────
      bus.on(GameEvent.PAIR_MATCH, () => {
        s()?.correct();
        fireCorrect();
      }),
      bus.on(GameEvent.PAIR_MISMATCH, () => {
        s()?.wrong();
        fireWrong();
      }),
      bus.on(GameEvent.GROUP_COMPLETE, () => {
        s()?.bonus();
        s()?.jackpot();
        fireJackpot();
      }),

      // ── Ordering Engine ───────────────────────────────
      bus.on(GameEvent.ORDER_CORRECT, () => {
        s()?.correct();
        fireCorrect();
      }),
      bus.on(GameEvent.ORDER_SWAP, () => s()?.click()),
    ];

    return () => {
      wirings.forEach(unsub => unsub());
      soundRef.current?.stopMusic();
      hideTimerDanger();
      bus.clear();
    };
  }, [musicType, bus]);

  const emit = useCallback((event, payload) => {
    bus.emit(event, payload);
  }, [bus]);

  return { emit, bus, GameEvent };
}

