/**
 * ============================================================
 * TINA MINIGAME — useActionEngine (Headless)
 * ============================================================
 * Core engine for action/arcade games with real-time gameplay:
 * Whack-a-Mole, Balloon Pop, Flying Fruit.
 *
 * Uses requestAnimationFrame for smooth 60fps game loop.
 * Zero rendering — pure state management.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameEvents } from './useGameEvents';
import { GameEvent } from '@/lib/gameEvents';

export function useActionEngine(items, options = {}) {
  const {
    musicType = 'fun',
    mode = 'whack',             // 'whack' | 'balloon' | 'fruit'
    gameDuration = 60,          // seconds
    spawnInterval = 2000,       // ms between spawns
    entityLifetime = 2500,      // ms before entity hides
    maxEntities = 6,            // max visible at once
    hasCountdown = true,
    correctRatio = 0.6,         // % of spawned entities that are "correct"
  } = options;

  const { emit } = useGameEvents(musicType);

  // ── Core ────────────────────────────────────────────────
  const [phase, setPhase] = useState(hasCountdown ? 'countdown' : 'playing');
  const [countdownNum, setCountdownNum] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [entities, setEntities] = useState([]);
  const [tappedEntities, setTappedEntities] = useState(new Set());
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showHitEffect, setShowHitEffect] = useState(null); // {x, y, correct}

  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const entityIdCounter = useRef(0);
  const stateRef = useRef({});
  stateRef.current = { score, streak, combo, timeLeft, items, entities };

  // ── Countdown ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      emit(GameEvent.GAME_START);
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum === 1) emit(GameEvent.COUNTDOWN_GO);
      else emit(GameEvent.COUNTDOWN_TICK);
      setCountdownNum(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, emit]);

  // ── Game Timer ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GameEvent.TIMER_WARNING);
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(spawnRef.current);
          setPhase('result');
          emit(GameEvent.GAME_COMPLETE);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, emit]);

  // ── Entity Spawning ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    const spawn = () => {
      const s = stateRef.current;
      if (s.entities.length >= maxEntities) return;

      // Pick random item from content
      const itemIdx = Math.floor(Math.random() * s.items.length);
      const item = s.items[itemIdx];
      const isCorrect = Math.random() < correctRatio;

      // Pick random slot (for grid-based games like whack-a-mole)
      const slotCount = maxEntities + 3; // more slots than entities
      const usedSlots = s.entities.map(e => e.slot);
      let slot;
      do {
        slot = Math.floor(Math.random() * slotCount);
      } while (usedSlots.includes(slot));

      const entityId = entityIdCounter.current++;
      const newEntity = {
        id: entityId,
        itemIdx,
        item,
        isCorrect,
        slot,
        spawnedAt: Date.now(),
        lifetime: entityLifetime + Math.random() * 500, // slight randomness
        x: Math.random() * 80 + 10, // % position for non-grid modes
        y: Math.random() * 60 + 20,
      };

      setEntities(prev => [...prev, newEntity]);

      // Auto-remove after lifetime
      setTimeout(() => {
        setEntities(prev => prev.filter(e => e.id !== entityId));
      }, newEntity.lifetime);
    };

    // Initial spawn
    spawn();

    // Continuous spawning
    spawnRef.current = setInterval(spawn, spawnInterval);

    return () => clearInterval(spawnRef.current);
  }, [phase, maxEntities, spawnInterval, entityLifetime, correctRatio]);

  // ── Tap/Hit Entity ──────────────────────────────────────
  const tapEntity = useCallback((entityId) => {
    if (phase !== 'playing') return;
    if (tappedEntities.has(entityId)) return;

    const entity = stateRef.current.entities.find(e => e.id === entityId);
    if (!entity) return;

    setTappedEntities(prev => new Set([...prev, entityId]));

    if (entity.isCorrect) {
      // Correct hit!
      emit(GameEvent.CORRECT);
      const s = stateRef.current;
      const base = 100;
      const comboBonus = s.combo >= 3 ? 50 * s.combo : 0;
      setScore(prev => prev + base + comboBonus);
      setCombo(prev => prev + 1);
      setHits(prev => prev + 1);
      setStreak(prev => prev + 1);
      if ((s.combo + 1) % 5 === 0) emit(GameEvent.STREAK_BONUS);

      setShowHitEffect({ x: entity.x, slot: entity.slot, correct: true });
    } else {
      // Wrong target
      emit(GameEvent.WRONG);
      setScore(prev => Math.max(0, prev - 50));
      setCombo(0);
      setMisses(prev => prev + 1);
      setStreak(0);

      setShowHitEffect({ x: entity.x, slot: entity.slot, correct: false });
    }

    // Remove entity after tap
    setTimeout(() => {
      setEntities(prev => prev.filter(e => e.id !== entityId));
      setShowHitEffect(null);
    }, 300);
  }, [phase, tappedEntities, emit]);

  // ── Derived ─────────────────────────────────────────────
  const totalTaps = hits + misses;
  const accuracy = totalTaps > 0 ? Math.round((hits / totalTaps) * 100) : 0;

  return {
    phase, setPhase, countdownNum,
    score, setScore, streak, combo, timeLeft,
    entities, tapEntity, tappedEntities,
    hits, misses, accuracy, totalTaps,
    showHitEffect,
    maxTime: gameDuration,
    emit, GameEvent,
  };
}
