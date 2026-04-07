/**
 * ============================================================
 * TINA MINIGAME — useOrderingEngine (Headless)
 * ============================================================
 * Pure logic hook for Ordering/Arrangement games:
 * Unjumble, Anagram, RankOrder, SpellTheWord
 *
 * Modes:
 * - 'words': Arrange words into correct sentence order
 * - 'letters': Arrange letters into correct word
 * - 'rank': Arrange items in correct order
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameEvents } from './useGameEvents';
import { GameEvent } from '@/lib/gameEvents';

export function useOrderingEngine(items, options = {}) {
  const {
    musicType = 'calm',
    mode = 'words',            // 'words' | 'letters' | 'rank'
    defaultTimeLimit = 30,
    hasCountdown = true,
    feedbackDelay = 2000,
  } = options;

  const { emit } = useGameEvents(musicType);

  const [phase, setPhase] = useState(hasCountdown ? 'countdown' : 'playing');
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef(null);

  // ── Puzzle State ────────────────────────────────────────
  const [pieces, setPieces] = useState([]);      // Current arrangement (user moves)
  const [correctOrder, setCorrectOrder] = useState([]); // Answer key
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [placedPieces, setPlacedPieces] = useState([]); // For slot-based placement
  const [hintUsed, setHintUsed] = useState(false);

  // Ref for stale closure safety
  const stateRef = useRef({});
  stateRef.current = { currentQ, score, streak, timeLeft, items, defaultTimeLimit, feedbackDelay };

  // ── Generate Puzzle for Current Question ────────────────
  const generatePuzzle = useCallback((qIdx) => {
    const item = items[qIdx];
    if (!item) return;

    let correct = [];
    if (mode === 'words') {
      // Split sentence into words, correct order is the original
      correct = (item.term || '').split(/\s+/).filter(w => w.trim());
    } else if (mode === 'letters') {
      correct = (item.term || '').split('');
    } else {
      // rank: items already in correct order, shuffle for display
      correct = items.map((it, i) => ({ text: it.term || '', correctPos: i }));
    }

    // Shuffle pieces
    const shuffled = [...correct];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Avoid identical order
    if (JSON.stringify(shuffled) === JSON.stringify(correct) && shuffled.length > 1) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    setCorrectOrder(correct);
    setPieces(shuffled);
    setPlacedPieces([]);
    setSelectedPiece(null);
    setShowFeedback(false);
    setIsCorrect(false);
    setHintUsed(false);
    setTimeLeft(item?.extra_data?.time_limit || defaultTimeLimit);
  }, [items, mode, defaultTimeLimit]);

  // ── Countdown ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      generatePuzzle(0);
      emit(GameEvent.GAME_START);
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum === 1) emit(GameEvent.COUNTDOWN_GO);
      else emit(GameEvent.COUNTDOWN_TICK);
      setCountdownNum(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, emit, generatePuzzle]);

  // ── Timer ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || showFeedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GameEvent.TIMER_WARNING);
        if (prev <= 1) {
          clearInterval(timerRef.current);
          checkOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentQ, showFeedback, emit]);

  // ── Swap Two Pieces ─────────────────────────────────────
  const swapPieces = useCallback((fromIdx, toIdx) => {
    if (showFeedback) return;
    emit(GameEvent.ORDER_SWAP);
    setPieces(prev => {
      const copy = [...prev];
      [copy[fromIdx], copy[toIdx]] = [copy[toIdx], copy[fromIdx]];
      return copy;
    });
  }, [showFeedback, emit]);

  // ── Select Piece (Tap Mode) ─────────────────────────────
  const selectPiece = useCallback((idx) => {
    if (showFeedback) return;
    emit(GameEvent.CLICK);
    if (selectedPiece === null) {
      setSelectedPiece(idx);
    } else if (selectedPiece === idx) {
      setSelectedPiece(null);
    } else {
      swapPieces(selectedPiece, idx);
      setSelectedPiece(null);
    }
  }, [showFeedback, selectedPiece, swapPieces, emit]);

  // ── Slot-Based Placement (Unjumble) ─────────────────────
  const placePiece = useCallback((pieceIdx) => {
    if (showFeedback) return;
    emit(GameEvent.CLICK);
    const piece = pieces[pieceIdx];
    if (!piece) return;
    setPlacedPieces(prev => [...prev, piece]);
    setPieces(prev => prev.filter((_, i) => i !== pieceIdx));
  }, [showFeedback, pieces, emit]);

  const removePlaced = useCallback((placedIdx) => {
    if (showFeedback) return;
    const piece = placedPieces[placedIdx];
    setPlacedPieces(prev => prev.filter((_, i) => i !== placedIdx));
    setPieces(prev => [...prev, piece]);
  }, [showFeedback, placedPieces]);

  // ── Check Order ─────────────────────────────────────────
  const checkOrder = useCallback(() => {
    if (showFeedback) return;
    clearInterval(timerRef.current);

    const s = stateRef.current;
    const arrangement = placedPieces.length > 0 ? placedPieces : pieces;
    // Compare with correct order
    let correct;
    if (mode === 'words' || mode === 'letters') {
      correct = JSON.stringify(arrangement) === JSON.stringify(correctOrder);
    } else {
      correct = arrangement.every((item, i) => item.correctPos === i);
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      emit(GameEvent.ORDER_CORRECT);
      const base = 1000;
      const speed = Math.round((s.timeLeft / s.defaultTimeLimit) * 500);
      const hintPenalty = hintUsed ? -300 : 0;
      setScore(prev => prev + Math.max(base + speed + hintPenalty, 100));
      setStreak(prev => prev + 1);
    } else {
      emit(GameEvent.WRONG);
      setStreak(0);
    }

    setAnswers(prev => [...prev, { questionIndex: s.currentQ, correct }]);

    setTimeout(() => advanceToNext(), s.feedbackDelay);
  }, [showFeedback, pieces, placedPieces, correctOrder, mode, hintUsed, emit]);

  // ── Advance ─────────────────────────────────────────────
  const advanceToNext = useCallback(() => {
    const s = stateRef.current;
    if (s.currentQ + 1 < s.items.length) {
      const next = s.currentQ + 1;
      setCurrentQ(next);
      generatePuzzle(next);
    } else {
      setPhase('result');
      emit(GameEvent.GAME_COMPLETE);
    }
  }, [emit, generatePuzzle]);

  // ── Hint: Reveal first wrong piece ──────────────────────
  const useHint = useCallback(() => {
    if (hintUsed || showFeedback) return;
    emit(GameEvent.CLICK);
    setHintUsed(true);
    // Find first wrong position and fix it
    const arrangement = placedPieces.length > 0 ? placedPieces : pieces;
    for (let i = 0; i < arrangement.length; i++) {
      if (arrangement[i] !== correctOrder[i]) {
        const correctIdx = arrangement.findIndex((p, j) => p === correctOrder[i] && j !== i);
        if (correctIdx >= 0) {
          if (placedPieces.length > 0) {
            setPlacedPieces(prev => {
              const copy = [...prev];
              [copy[i], copy[correctIdx]] = [copy[correctIdx], copy[i]];
              return copy;
            });
          } else {
            setPieces(prev => {
              const copy = [...prev];
              [copy[i], copy[correctIdx]] = [copy[correctIdx], copy[i]];
              return copy;
            });
          }
        }
        break;
      }
    }
  }, [hintUsed, showFeedback, pieces, placedPieces, correctOrder, emit]);

  // ── Derived ─────────────────────────────────────────────
  const currentItem = items[currentQ] || null;
  const totalQ = items.length;
  const maxTime = currentItem?.extra_data?.time_limit || defaultTimeLimit;
  const counterLabel = `${currentQ + 1}/${totalQ}`;

  return {
    phase, setPhase, countdownNum,
    currentQ, totalQ, currentItem, counterLabel,
    pieces, correctOrder, selectedPiece, placedPieces,
    swapPieces, selectPiece, placePiece, removePlaced,
    checkOrder, useHint, hintUsed,
    showFeedback, isCorrect,
    score, setScore, streak, answers, timeLeft, maxTime,
    emit, GameEvent,
  };
}
