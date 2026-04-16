/**
 * ============================================================
 * TINA MINIGAME — useRevealEngine (Headless)
 * ============================================================
 * Pure logic hook for Reveal/Random games:
 * SpinWheel, OpenBox, FlashCards, RandomCards, SpeakingCards.
 *
 * Zero UI — only state & functions.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameEvents } from './useGameEvents';
import { GameEvent } from '@/lib/gameEvents';
import { speak as ttsSpeak, cancelSpeech } from '@/lib/tts';

/**
 * @param {Array} items — content items
 * @param {Object} options
 * @param {string} options.musicType
 * @param {string} options.mode — 'wheel' | 'box' | 'cards' | 'random'
 */
export function useRevealEngine(items: any[], options: Record<string, any> = {}) {
  const {
    musicType = 'fun',
    mode = 'cards',
  } = options;

  const { emit } = useGameEvents(musicType);

  // ── Shared State ────────────────────────────────────────
  const [revealedItems, setRevealedItems] = useState(new Set());
  const [activeItem, setActiveItem] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // ── Cards-specific State ────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<any[]>([]);
  const [unknown, setUnknown] = useState<any[]>([]);
  const [isDone, setIsDone] = useState(false);

  // ── Wheel-specific State ────────────────────────────────
  const [spinning, setSpinning] = useState(false);
  const [chosenIndex, setChosenIndex] = useState<any>(null);

  // Music on mount
  useEffect(() => {
    emit(GameEvent.MUSIC_START, { type: musicType });
    return () => emit(GameEvent.MUSIC_STOP);
  }, []);

  // ── WHEEL METHODS ───────────────────────────────────────
  /**
   * Spin the wheel — logic-first approach.
   * Returns the chosen index BEFORE animation starts.
   * The UI component animates to the pre-determined result.
   */
  const spin = useCallback(() => {
    if (spinning || items.length === 0) return null;
    
    emit(GameEvent.CLICK);
    setSpinning(true);
    setActiveItem(null);

    // LOGIC-FIRST: Random selection happens HERE, not in animation
    const idx = Math.floor(Math.random() * items.length);
    setChosenIndex(idx);

    return idx;
  }, [spinning, items, emit]);

  /**
   * Called by UI after spin animation completes
   */
  const onSpinComplete = useCallback((idx: any) => {
    const chosen = idx !== undefined ? idx : chosenIndex;
    if (chosen === null || chosen === undefined) return;

    setActiveItem(items[chosen]);
    setActiveIndex(chosen);
    setHistory(prev => [{ item: items[chosen], index: chosen }, ...prev]);
    setRevealedItems(prev => new Set([...prev, chosen]));
    setSpinning(false);
    emit(GameEvent.WHEEL_STOP);
  }, [chosenIndex, items, emit]);

  // ── BOX METHODS ─────────────────────────────────────────
  const openBox = useCallback((index: any) => {
    if (revealedItems.has(index) || activeItem !== null) return;

    emit(GameEvent.BOX_OPEN);
    
    setTimeout(() => {
      setRevealedItems(prev => new Set([...prev, index]));
      setActiveItem(items[index]);
      setActiveIndex(index);
      setHistory(prev => [{ item: items[index], index }, ...prev]);
    }, 600);
  }, [revealedItems, activeItem, items, emit]);

  const closePopup = useCallback(() => {
    setActiveItem(null);
    setActiveIndex(null);

    // Check completion
    if (revealedItems.size >= items.length) {
      emit(GameEvent.GAME_COMPLETE);
    }
  }, [revealedItems, items, emit]);

  // ── CARDS METHODS ───────────────────────────────────────
  const flipCard = useCallback(() => {
    emit(GameEvent.CARD_FLIP);
    setFlipped(prev => !prev);
  }, [emit]);

  const markKnown = useCallback(() => {
    emit(GameEvent.CORRECT);
    setKnown(prev => [...prev, currentIndex]);
    setTimeout(() => nextCard(), 400);
  }, [currentIndex, emit]);

  const markUnknown = useCallback(() => {
    emit(GameEvent.CLICK);
    setUnknown(prev => [...prev, currentIndex]);
    setTimeout(() => nextCard(), 400);
  }, [currentIndex, emit]);

  const nextCard = useCallback(() => {
    if (currentIndex + 1 >= items.length) {
      setIsDone(true);
      emit(GameEvent.GAME_COMPLETE);
    } else {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    }
  }, [currentIndex, items, emit]);

  const restartCards = useCallback(() => {
    setCurrentIndex(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
    setIsDone(false);
    emit(GameEvent.MUSIC_START, { type: musicType });
  }, [musicType, emit]);

  // ── TTS ─────────────────────────────────────────────────
  const speakText = useCallback((text: any) => {
    cancelSpeech();
    ttsSpeak(text, { rate: 0.95 });
  }, []);

  // ── Derived State ───────────────────────────────────────
  const isAllRevealed = revealedItems.size >= items.length;
  const currentCard = items[currentIndex] || null;
  const knownPercent = items.length > 0 ? Math.round((known.length / items.length) * 100) : 0;

  return {
    // Shared
    revealedItems, activeItem, activeIndex, history,
    isAllRevealed, closePopup, speakText,
    emit, GameEvent,

    // Wheel
    spinning, chosenIndex, spin, onSpinComplete,

    // Box
    openBox,

    // Cards
    currentIndex, currentCard, flipped, known, unknown, isDone,
    flipCard, markKnown, markUnknown, restartCards, knownPercent,
  };
}
