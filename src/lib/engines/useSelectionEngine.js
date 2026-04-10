/**
 * ============================================================
 * TINA MINIGAME — useSelectionEngine (Fixed)
 * ============================================================
 * Headless hook for all Selection/Recognition games.
 *
 * FIXES:
 * - Bug #1: Stale closures → useRef for mutable values
 * - Bug #4: TTS without read_question check → enableTTS option
 * - Cải tiến #3: Fixed all dependency arrays
 * - Added initialScore option for WinOrLose
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameEvents } from './useGameEvents';
import { GameEvent } from '@/lib/gameEvents';
import { speak as ttsSpeak, cancelSpeech, preloadVoices } from '@/lib/tts';

export function useSelectionEngine(items, options = {}) {
  const {
    musicType = 'quiz',
    scoringPolicy = 'time-speed',
    defaultTimeLimit = 20,
    hasCountdown = true,
    feedbackDelay = 1800,
    autoAdvance = true,
    enableTTS = false,        // ✅ FIX Bug #4: Opt-in TTS
    initialScore = 0,         // ✅ FIX Bug #6: No setState in render
  } = options;

  const { emit } = useGameEvents(musicType);

  // ── Core State ──────────────────────────────────────────
  const [phase, setPhase] = useState(hasCountdown ? 'countdown' : 'playing');
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(initialScore);
  const [streak, setStreak] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const timerRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // ✅ FIX Bug #1: useRef for mutable values to avoid stale closures
  const stateRef = useRef({});
  stateRef.current = {
    timeLeft, streak, currentQ, showFeedback, selectedAnswer,
    score, phase, items, defaultTimeLimit, scoringPolicy,
    feedbackDelay, autoAdvance,
  };

  // ── Countdown Logic ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      shuffleOptionsForQuestion(0);
      const tl = items[0]?.extra_data?.time_limit || defaultTimeLimit;
      setTimeLeft(tl);
      isSubmittingRef.current = false;
      emit(GameEvent.GAME_START);
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum === 1) emit(GameEvent.COUNTDOWN_GO);
      else emit(GameEvent.COUNTDOWN_TICK);
      setCountdownNum(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, defaultTimeLimit, emit, items]);

  // ── Fisher-Yates Shuffle ────────────────────────────────
  const shuffleOptionsForQuestion = useCallback((qIdx) => {
    if (!items[qIdx]) return;
    const opts = items[qIdx].options
      .map((opt, i) => ({ text: opt, originalIndex: i }))
      .filter(o => o.text && o.text.trim() !== '');
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setShuffledOptions(opts);
  }, [items]);

  // ── TTS (Text-to-Speech) — Opt-in only ─────────────────
  useEffect(() => { if (enableTTS) preloadVoices(); }, [enableTTS]);

  useEffect(() => {
    if (!enableTTS) return;
    if (phase !== 'playing' || !items[currentQ]) return;
    const text = items[currentQ].question || items[currentQ].term || '';
    if (text) {
      cancelSpeech();
      setTimeout(() => ttsSpeak(text, { clean: true, rate: 0.95 }), 500);
    }
  }, [enableTTS, phase, currentQ, items]);

  // ── Timer ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || showFeedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GameEvent.TIMER_WARNING);
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // ✅ Use ref-based submit to avoid stale closure
          handleSubmitAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentQ, showFeedback, emit]);

  // ── Submit Answer ───────────────────────────────────────
  // ✅ FIX Bug #1: Read mutable state from ref, not closure
  const handleSubmitAnswer = useCallback((selectedOriginalIndex) => {
    const s = stateRef.current;
    if (s.showFeedback || s.selectedAnswer !== null || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    clearInterval(timerRef.current);

    const item = s.items[s.currentQ];
    const tl = item?.extra_data?.time_limit || s.defaultTimeLimit;
    const isCorrect = selectedOriginalIndex === 0;

    setSelectedAnswer(selectedOriginalIndex);
    setShowFeedback(true);

    if (isCorrect) {
      emit(GameEvent.CORRECT);
      let points = 0;
      if (s.scoringPolicy === 'none') {
        points = 0;
      } else if (tl > 0) {
        const timePercent = s.timeLeft / tl;
        if (timePercent >= 0.95) {
          points = 1000;
        } else if (s.timeLeft > 0) {
          points = Math.round(200 + (timePercent / 0.95) * 800);
        } else {
          points = 0;
        }
      } else {
        points = 1000;
      }
      setScore(prev => prev + points);
      const newStreak = s.streak + 1;
      setStreak(newStreak);
      if (newStreak >= 3 && newStreak % 3 === 0) emit(GameEvent.STREAK_BONUS);
    } else {
      emit(GameEvent.WRONG);
      setStreak(0);
    }

    setAnswers(prev => [...prev, { questionIndex: s.currentQ, correct: isCorrect, selectedIndex: selectedOriginalIndex }]);

    if (s.autoAdvance) {
      setTimeout(() => handleAdvanceToNext(), s.feedbackDelay);
    }
  }, [emit]); // ✅ Only depends on emit — all mutable state read from ref

  // ── Advance to Next Question ────────────────────────────
  const handleAdvanceToNext = useCallback(() => {
    const s = stateRef.current;
    if (s.currentQ + 1 < s.items.length) {
      const next = s.currentQ + 1;
      setCurrentQ(next);
      setSelectedAnswer(null);
      setShowFeedback(false);
      isSubmittingRef.current = false;
      // Inline shuffle to avoid stale function ref
      const opts = s.items[next]?.options
        ?.map((opt, i) => ({ text: opt, originalIndex: i }))
        .filter(o => o.text && o.text.trim() !== '') || [];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      setShuffledOptions(opts);
      setTimeLeft(s.items[next]?.extra_data?.time_limit || s.defaultTimeLimit);
    } else {
      setPhase('result');
      emit(GameEvent.GAME_COMPLETE);
    }
  }, [emit]);

  // ── Derived State ───────────────────────────────────────
  const currentItem = items[currentQ] || null;
  const totalQ = items.length;
  const tl = currentItem?.extra_data?.time_limit || defaultTimeLimit;
  const timerPercent = tl > 0 ? (timeLeft / tl) * 100 : 0;
  const isTimerDanger = timeLeft <= 5;
  const counterLabel = `${currentQ + 1}/${totalQ}`;

  return {
    phase, setPhase, countdownNum,
    currentQ, totalQ, currentItem, counterLabel,
    shuffledOptions, shuffleOptionsForQuestion,
    submitAnswer: handleSubmitAnswer,
    advanceToNext: handleAdvanceToNext,
    selectedAnswer, showFeedback,
    score, setScore, streak, setStreak, answers,
    timeLeft, setTimeLeft, timerPercent, isTimerDanger, maxTime: tl,
    emit, GameEvent,
  };
}
