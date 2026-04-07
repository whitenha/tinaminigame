/**
 * ============================================================
 * TINA MINIGAME — usePairingEngine (Headless)
 * ============================================================
 * Pure logic hook for Matching/Pairing/Grouping games:
 * MatchingPairs, MatchUp, FindTheMatch, GroupSort, BalloonPop
 *
 * Modes:
 * - 'memory': Flip-to-match memory cards
 * - 'drag': Drag term → definition
 * - 'group': Sort items into categories
 * - 'tap': Tap matching pairs sequentially
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameEvents } from './useGameEvents';
import { GameEvent } from '@/lib/gameEvents';

export function usePairingEngine(items, options = {}) {
  const {
    musicType = 'calm',
    mode = 'memory',          // 'memory' | 'drag' | 'group' | 'tap'
    defaultTimeLimit = 120,   // Global time for entire game
    hasCountdown = true,
    columns = 4,              // Grid columns for memory mode
  } = options;

  const { emit } = useGameEvents(musicType);

  // ── Shared ──────────────────────────────────────────────
  const [phase, setPhase] = useState(hasCountdown ? 'countdown' : 'playing');
  const [countdownNum, setCountdownNum] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(defaultTimeLimit);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef(null);

  // ── Memory Cards State ──────────────────────────────────
  const cards = useMemo(() => {
    if (mode !== 'memory') return [];
    const flat = [];
    items.forEach((item, idx) => {
      flat.push({ id: `t-${idx}`, pairId: idx, type: 'term', text: item.term || '', image: item.image_url });
      flat.push({ id: `d-${idx}`, pairId: idx, type: 'def', text: item.definition || '', image: null });
    });
    // Shuffle
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    return flat;
  }, [items, mode]);

  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [failedPair, setFailedPair] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // ── Drag Match State ────────────────────────────────────
  const [matchedItems, setMatchedItems] = useState(new Set());
  const [selectedTerm, setSelectedTerm] = useState(null);

  const shuffledTerms = useMemo(() => {
    const terms = items.map((item, i) => ({ ...item, _origIdx: i }));
    for (let i = terms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [terms[i], terms[j]] = [terms[j], terms[i]];
    }
    return terms;
  }, [items]);

  const shuffledDefs = useMemo(() => {
    const defs = items.map((item, i) => ({ ...item, _origIdx: i }));
    for (let i = defs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [defs[i], defs[j]] = [defs[j], defs[i]];
    }
    return defs;
  }, [items]);

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

  // ── Global Timer ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GameEvent.TIMER_WARNING);
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase('result');
          emit(GameEvent.GAME_COMPLETE);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, emit]);

  // ── MEMORY MODE: Flip Card ──────────────────────────────
  const flipCard = useCallback((cardId) => {
    if (phase !== 'playing') return;
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(cardId)) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || matchedPairs.has(card.pairId)) return;

    emit(GameEvent.CARD_FLIP);
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setAttempts(prev => prev + 1);
      const card1 = cards.find(c => c.id === newFlipped[0]);
      const card2 = cards.find(c => c.id === newFlipped[1]);

      if (card1.pairId === card2.pairId && card1.type !== card2.type) {
        // Match!
        emit(GameEvent.PAIR_MATCH);
        const newMatched = new Set([...matchedPairs, card1.pairId]);
        setMatchedPairs(newMatched);
        setStreak(prev => prev + 1);
        setScore(prev => prev + 500 + (streak >= 2 ? 200 : 0));
        setFlippedCards([]);

        if (newMatched.size >= items.length) {
          clearInterval(timerRef.current);
          setTimeout(() => {
            setPhase('result');
            emit(GameEvent.GAME_COMPLETE);
          }, 600);
        }
      } else {
        // Mismatch
        emit(GameEvent.PAIR_MISMATCH);
        setStreak(0);
        setFailedPair(newFlipped);
        setTimeout(() => {
          setFlippedCards([]);
          setFailedPair(null);
        }, 800);
      }
    }
  }, [phase, flippedCards, cards, matchedPairs, streak, items, emit]);

  // ── TAP/DRAG MODE: Select & Match ──────────────────────
  const selectTerm = useCallback((termIdx) => {
    if (matchedItems.has(termIdx)) return;
    emit(GameEvent.CLICK);
    setSelectedTerm(termIdx);
  }, [matchedItems, emit]);

  const selectDef = useCallback((defIdx) => {
    if (selectedTerm === null) return;
    if (matchedItems.has(defIdx)) return;

    setAttempts(prev => prev + 1);

    if (selectedTerm === defIdx) {
      // Correct match!
      emit(GameEvent.PAIR_MATCH);
      const newMatched = new Set([...matchedItems, defIdx]);
      setMatchedItems(newMatched);
      setStreak(prev => prev + 1);
      setScore(prev => prev + 500 + (streak >= 2 ? 200 : 0));
      setSelectedTerm(null);

      if (newMatched.size >= items.length) {
        clearInterval(timerRef.current);
        setTimeout(() => {
          setPhase('result');
          emit(GameEvent.GAME_COMPLETE);
        }, 600);
      }
    } else {
      // Wrong match
      emit(GameEvent.PAIR_MISMATCH);
      setStreak(0);
      setSelectedTerm(null);
    }
  }, [selectedTerm, matchedItems, streak, items, emit]);

  // ── Derived ─────────────────────────────────────────────
  const totalPairs = items.length;
  const matchedCount = mode === 'memory' ? matchedPairs.size : matchedItems.size;
  const isCardFlipped = (cardId) => flippedCards.includes(cardId);
  const isCardMatched = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    return card ? matchedPairs.has(card.pairId) : false;
  };
  const isCardFailed = (cardId) => failedPair?.includes(cardId);
  const accuracy = attempts > 0 ? Math.round((matchedCount / attempts) * 100) : 0;

  return {
    // Phase
    phase, setPhase, countdownNum,
    // Score
    score, setScore, streak, timeLeft, attempts, accuracy,
    maxTime: defaultTimeLimit,
    // Memory
    cards, flipCard, flippedCards, matchedPairs,
    isCardFlipped, isCardMatched, isCardFailed,
    // Drag/Tap
    shuffledTerms, shuffledDefs, selectedTerm,
    selectTerm, selectDef, matchedItems,
    // Shared
    totalPairs, matchedCount,
    emit, GameEvent,
  };
}
