'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CountdownScreen, GameTopBar, TimerBar, ResultScreen } from '@/components/GameShell';
import { useGameEvents } from '@/lib/engines/useGameEvents';
import styles from './HangmanPlayer.module.css';

// ── KEYBOARD LAYOUT ──────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M']
];

// ── ROCKET SVG PARTS (6 stages) ─────────────────────────────
function RocketSVG({ stage, won, lost }) {
  // stage: 0-6 (how many CORRECT unique letters found → parts built)
  // We show rocket parts based on how many correct letters revealed
  return (
    <div className={`${styles.rocketArea} ${won ? styles.rocketLaunch : ''} ${lost ? styles.rocketExplode : ''}`}>
      <svg viewBox="0 0 200 320" className={styles.rocketSvg} aria-hidden="true">
        {/* Stars background */}
        <circle cx="20" cy="30" r="1.5" fill="#fff" opacity="0.6"/>
        <circle cx="180" cy="50" r="1" fill="#fff" opacity="0.4"/>
        <circle cx="50" cy="280" r="1.5" fill="#fff" opacity="0.5"/>
        <circle cx="160" cy="300" r="1" fill="#fff" opacity="0.3"/>
        <circle cx="30" cy="200" r="2" fill="#FFD93D" opacity="0.4"/>
        <circle cx="170" cy="180" r="1.5" fill="#a29bfe" opacity="0.5"/>

        {/* Planet surface */}
        <ellipse cx="100" cy="290" rx="90" ry="25" fill="#6C5CE7" opacity="0.3"/>
        <ellipse cx="100" cy="290" rx="70" ry="18" fill="#a29bfe" opacity="0.2"/>

        {/* Rocket base platform */}
        <rect x="70" y="260" width="60" height="8" rx="3" fill="#636e72" opacity={stage >= 1 ? 1 : 0.15}/>

        {/* Part 1: Engine nozzle */}
        <g opacity={stage >= 1 ? 1 : 0.12} className={stage === 1 ? styles.partNew : ''}>
          <path d="M 85 260 L 80 275 L 120 275 L 115 260 Z" fill="#b2bec3" stroke="#636e72" strokeWidth="1.5"/>
          <rect x="90" y="268" width="20" height="6" rx="2" fill="#d63031"/>
        </g>

        {/* Part 2: Body bottom */}
        <g opacity={stage >= 2 ? 1 : 0.12} className={stage === 2 ? styles.partNew : ''}>
          <rect x="82" y="220" width="36" height="42" rx="4" fill="#dfe6e9" stroke="#b2bec3" strokeWidth="1.5"/>
          <circle cx="100" cy="242" r="8" fill="#0984e3" opacity="0.6"/>
        </g>

        {/* Part 3: Body top */}
        <g opacity={stage >= 3 ? 1 : 0.12} className={stage === 3 ? styles.partNew : ''}>
          <rect x="82" y="178" width="36" height="44" rx="4" fill="#dfe6e9" stroke="#b2bec3" strokeWidth="1.5"/>
          {/* Window */}
          <circle cx="100" cy="200" r="12" fill="#74b9ff" stroke="#0984e3" strokeWidth="2"/>
          <circle cx="96" cy="196" r="4" fill="rgba(255,255,255,0.5)"/>
        </g>

        {/* Part 4: Left fin */}
        <g opacity={stage >= 4 ? 1 : 0.12} className={stage === 4 ? styles.partNew : ''}>
          <path d="M 82 250 L 62 270 L 62 255 L 82 230 Z" fill="#e17055" stroke="#d63031" strokeWidth="1"/>
        </g>

        {/* Part 5: Right fin */}
        <g opacity={stage >= 5 ? 1 : 0.12} className={stage === 5 ? styles.partNew : ''}>
          <path d="M 118 250 L 138 270 L 138 255 L 118 230 Z" fill="#e17055" stroke="#d63031" strokeWidth="1"/>
        </g>

        {/* Part 6: Nose cone */}
        <g opacity={stage >= 6 ? 1 : 0.12} className={stage === 6 ? styles.partNew : ''}>
          <path d="M 82 180 L 100 145 L 118 180 Z" fill="#fdcb6e" stroke="#f39c12" strokeWidth="1.5"/>
          <circle cx="100" cy="168" r="4" fill="#e17055"/>
        </g>

        {/* Flame (only when won) */}
        {won && (
          <g className={styles.flame}>
            <ellipse cx="100" cy="285" rx="12" ry="25" fill="#fdcb6e" opacity="0.9"/>
            <ellipse cx="100" cy="290" rx="8" ry="18" fill="#e17055" opacity="0.8"/>
            <ellipse cx="100" cy="295" rx="5" ry="12" fill="#d63031"/>
          </g>
        )}

        {/* Minion character (always visible, sitting on planet) */}
        <g transform="translate(145, 240)" className={won ? styles.minionWave : ''}>
          {/* Body */}
          <ellipse cx="0" cy="0" rx="14" ry="18" fill="#FDCB6E"/>
          {/* Overalls */}
          <rect x="-12" y="2" width="24" height="14" rx="3" fill="#0984e3"/>
          <rect x="-4" y="-4" width="3" height="8" fill="#0984e3"/>
          <rect x="1" y="-4" width="3" height="8" fill="#0984e3"/>
          {/* Goggle */}
          <circle cx="0" cy="-6" r="8" fill="#b2bec3" stroke="#636e72" strokeWidth="2"/>
          <circle cx="0" cy="-6" r="5" fill="white"/>
          <circle cx="1" cy="-5" r="2.5" fill="#2d3436"/>
          <circle cx="2" cy="-6" r="1" fill="white"/>
          {/* Mouth */}
          <path d="M -4 4 Q 0 8 4 4" fill="none" stroke="#2d3436" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Arms */}
          <line x1="-14" y1="2" x2="-20" y2="-5" stroke="#FDCB6E" strokeWidth="3" strokeLinecap="round"/>
          <line x1="14" y1="2" x2="20" y2="-5" stroke="#FDCB6E" strokeWidth="3" strokeLinecap="round" className={won ? styles.armWave : ''}/>
          {/* Legs */}
          <line x1="-5" y1="16" x2="-6" y2="24" stroke="#2d3436" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="5" y1="16" x2="6" y2="24" stroke="#2d3436" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Shoes */}
          <ellipse cx="-8" cy="25" rx="5" ry="3" fill="#2d3436"/>
          <ellipse cx="8" cy="25" rx="5" ry="3" fill="#2d3436"/>
        </g>

        {/* Lost X marks */}
        {lost && (
          <g className={styles.lostMarks}>
            <text x="100" y="200" textAnchor="middle" fontSize="60" fill="#d63031" opacity="0.7">✕</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── HANGMAN ENGINE HOOK ──────────────────────────────────────
function useHangmanEngine({ item, timePerSlide, onSlideComplete, isFirstSlide, onGameStart }) {
  const { emit, GameEvent } = useGameEvents('calm');
  const MAX_WRONG = 6;

  // Derive word from item
  const word = (item?.term || item?.question || '').toUpperCase().trim();
  const definition = item?.definition || '';

  const [phase, setPhase] = useState('countdown');
  const [countdownNum, setCountdownNum] = useState(isFirstSlide ? 5 : 3);
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timePerSlide);
  const [hintUsed, setHintUsed] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState(null); // 'correct' | 'wrong' | null
  const [revealedByHint, setRevealedByHint] = useState(new Set());

  const timerRef = useRef(null);
  const stateRef = useRef({});
  stateRef.current = { phase, timeLeft, score, wrongGuesses, guessedLetters, combo, word };

  // Unique letters in word (only alphabetic)
  const uniqueWordLetters = [...new Set(word.split('').filter(c => /[A-Z]/.test(c)))];
  const correctCount = uniqueWordLetters.filter(l => guessedLetters.has(l)).length;
  const rocketStage = Math.min(6, Math.round((correctCount / Math.max(uniqueWordLetters.length, 1)) * 6));

  const isWon = uniqueWordLetters.every(l => guessedLetters.has(l)) && phase === 'playing';
  const isLost = wrongGuesses >= MAX_WRONG && phase === 'playing';

  // 1. Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      emit(GameEvent.GAME_START);
      if (onGameStart) onGameStart();
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum === 1) emit(GameEvent.COUNTDOWN_GO);
      else emit(GameEvent.COUNTDOWN_TICK);
      setCountdownNum(c => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, emit, GameEvent, onGameStart]);

  // 2. Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GameEvent.TIMER_WARNING);
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleComplete(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // 3. Win/Lose check
  useEffect(() => {
    if (phase !== 'playing') return;
    if (isWon) {
      clearInterval(timerRef.current);
      emit(GameEvent.CORRECT);
      // Calculate score
      const s = stateRef.current;
      const base = 1000;
      const speedBonus = Math.round((s.timeLeft / timePerSlide) * 500);
      const wrongPenalty = s.wrongGuesses * 100;
      const hintPenalty = hintUsed ? 300 : 0;
      const finalScore = Math.max(base + speedBonus - wrongPenalty - hintPenalty, 100);
      setScore(finalScore);
      setTimeout(() => handleComplete(true), 2500);
    } else if (isLost) {
      clearInterval(timerRef.current);
      emit(GameEvent.WRONG);
      setScore(0);
      setTimeout(() => handleComplete(false), 2000);
    }
  }, [isWon, isLost, phase]);

  const handleComplete = useCallback((won) => {
    setPhase('done');
    emit(GameEvent.GAME_COMPLETE);
    onSlideComplete({
      score: won ? stateRef.current.score || 100 : 0,
      correct: won,
      word: stateRef.current.word
    });
  }, [onSlideComplete, emit, GameEvent]);

  // 4. Guess a letter
  const guessLetter = useCallback((letter) => {
    if (phase !== 'playing') return;
    if (guessedLetters.has(letter)) return;

    const newGuessed = new Set([...guessedLetters, letter]);
    setGuessedLetters(newGuessed);

    if (word.includes(letter)) {
      emit(GameEvent.CORRECT);
      setCombo(c => c + 1);
      setLastGuessResult('correct');
    } else {
      emit(GameEvent.WRONG);
      setWrongGuesses(w => w + 1);
      setCombo(0);
      setLastGuessResult('wrong');
    }

    setTimeout(() => setLastGuessResult(null), 600);
  }, [phase, guessedLetters, word, emit, GameEvent]);

  // 5. Hint: reveal a random unrevealed letter
  const useHint = useCallback(() => {
    if (hintUsed || phase !== 'playing') return;
    setHintUsed(true);
    const unrevealed = uniqueWordLetters.filter(l => !guessedLetters.has(l));
    if (unrevealed.length > 0) {
      const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      setGuessedLetters(prev => new Set([...prev, pick]));
      setRevealedByHint(prev => new Set([...prev, pick]));
      emit(GameEvent.CORRECT);
    }
  }, [hintUsed, phase, uniqueWordLetters, guessedLetters, emit, GameEvent]);

  // 6. Physical keyboard support
  useEffect(() => {
    if (phase !== 'playing') return;
    const handler = (e) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        guessLetter(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, guessLetter]);

  return {
    phase, countdownNum,
    word, definition, guessedLetters, wrongGuesses, MAX_WRONG,
    correctCount, rocketStage, isWon, isLost,
    score, combo, timeLeft, hintUsed, lastGuessResult, revealedByHint,
    guessLetter, useHint
  };
}

// ── SINGLE SLIDE RENDERER ─────────────────────────────────────
function HangmanSlide({ item, slideIndex, totalSlides, timePerSlide, onSlideComplete, globalScore, isFirstSlide, onGameStart }) {
  const engine = useHangmanEngine({ item, timePerSlide, onSlideComplete, isFirstSlide, onGameStart });

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label={`Từ ${slideIndex + 1}/${totalSlides}`} emoji="🚀" />;
  }
  if (engine.phase === 'done') return null;

  const wordChars = engine.word.split('');

  return (
    <>
      <GameTopBar
        counter={`⏱ ${engine.timeLeft}s`}
        playerName=""
        score={globalScore + engine.score}
        streak={0}
        extra={
          <div className={styles.topStatsRow}>
            <div className={styles.slideCounter}>Từ {slideIndex + 1}/{totalSlides}</div>
            <div className={styles.livesContainer}>
              {Array.from({ length: engine.MAX_WRONG }, (_, i) => (
                <span key={i} className={`${styles.lifeIcon} ${i < engine.wrongGuesses ? styles.lifeLost : ''}`}>
                  {i < engine.wrongGuesses ? '💔' : '💛'}
                </span>
              ))}
            </div>
            {engine.combo >= 3 && <span className={styles.comboBadge}>🔥×{engine.combo}</span>}
          </div>
        }
      />

      <TimerBar timeLeft={engine.timeLeft} maxTime={timePerSlide} />

      <div className={`${styles.splitLayout} ${engine.lastGuessResult === 'wrong' ? styles.shakeScreen : ''}`}>
        {/* ── LEFT PANEL: Rocket Visual ── */}
        <div className={styles.leftPanel}>
          {/* Rocket Visual */}
          <RocketSVG stage={engine.rocketStage} won={engine.isWon} lost={engine.isLost} />

          {/* Wrong count indicator */}
          <div className={styles.wrongCounter}>
            <span className={styles.wrongLabel}>Sai:</span>
            <span className={styles.wrongNum}>{engine.wrongGuesses}</span>
            <span className={styles.wrongMax}>/ {engine.MAX_WRONG}</span>
          </div>

          {/* Lives visual below rocket */}
          <div className={styles.livesVisual}>
            {Array.from({ length: engine.MAX_WRONG }, (_, i) => (
              <span key={i} className={`${styles.lifeBig} ${i < engine.wrongGuesses ? styles.lifeBigLost : ''}`}>
                {i < engine.wrongGuesses ? '💔' : '💛'}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL: Word + Keyboard ── */}
        <div className={styles.rightPanel}>
          {/* Hint / Definition */}
          {engine.definition && (
            <div className={styles.hintBanner}>
              <span className={styles.hintIcon}>💡</span>
              <span className={styles.hintText}>{engine.definition}</span>
            </div>
          )}

          {/* Word Display */}
          <div className={styles.wordDisplay}>
            {wordChars.map((char, i) => {
              const isLetter = /[A-Z]/.test(char);
              const revealed = !isLetter || engine.guessedLetters.has(char);
              const isHinted = engine.revealedByHint.has(char);
              const justRevealed = engine.lastGuessResult === 'correct' && revealed && !isHinted;
              const showOnLose = engine.isLost && isLetter && !engine.guessedLetters.has(char);

              return (
                <div key={i} className={`${styles.letterSlot} ${!isLetter ? styles.spaceSlot : ''} ${revealed ? styles.slotRevealed : ''} ${justRevealed ? styles.slotBounce : ''} ${isHinted ? styles.slotHinted : ''} ${showOnLose ? styles.slotMissed : ''}`}>
                  {isLetter ? (
                    <span className={styles.letterChar}>
                      {revealed ? char : (showOnLose ? char : '')}
                    </span>
                  ) : (
                    <span className={styles.spaceChar}>&nbsp;</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Keyboard */}
          <div className={styles.keyboard}>
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className={styles.keyRow}>
                {row.map(letter => {
                  const guessed = engine.guessedLetters.has(letter);
                  const inWord = engine.word.includes(letter);
                  let keyState = '';
                  if (guessed && inWord) keyState = styles.keyCorrect;
                  else if (guessed && !inWord) keyState = styles.keyWrong;

                  return (
                    <button
                      key={letter}
                      className={`${styles.key} ${keyState}`}
                      onClick={() => engine.guessLetter(letter)}
                      disabled={guessed || engine.isWon || engine.isLost}
                      aria-label={letter}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Hint Button */}
          {!engine.isWon && !engine.isLost && (
            <div className={styles.actionRow}>
              <button
                className={`${styles.hintBtn} ${engine.hintUsed ? styles.hintUsedBtn : ''}`}
                onClick={engine.useHint}
                disabled={engine.hintUsed}
              >
                {engine.hintUsed ? '💡 Đã dùng gợi ý' : '💡 Mở 1 chữ cái'}
              </button>
            </div>
          )}
        </div>

        {/* Win/Lose message */}
        {engine.isWon && (
          <div className={styles.resultOverlay}>
            <div className={styles.resultWon}>
              <span className={styles.resultEmoji}>🚀</span>
              <span className={styles.resultText}>Minion đã thoát!</span>
              <span className={styles.resultScore}>+{engine.score} điểm</span>
            </div>
          </div>
        )}
        {engine.isLost && (
          <div className={styles.resultOverlay}>
            <div className={styles.resultLost}>
              <span className={styles.resultEmoji}>💥</span>
              <span className={styles.resultText}>Hết mạng! Đáp án: {engine.word}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── MAIN PLAYER WRAPPER ──────────────────────────────────────
export default function HangmanPlayer({ items, activity, playerName }) {
  const rawTime = parseInt(activity?.settings?.timePerSlide, 10);
  const timePerSlide = (!isNaN(rawTime) && rawTime >= 30 && rawTime <= 300) ? rawTime : 90;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [globalScore, setGlobalScore] = useState(0);
  const [results, setResults] = useState([]);
  const [gameResult, setGameResult] = useState(null);

  const bgmRef = useRef(null);

  useEffect(() => {
    bgmRef.current = new window.Audio('/sounds/Whack-a-Mole-playgame-music.mp3');
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.3;
    return () => bgmRef.current?.pause();
  }, []);

  const handleGameStart = useCallback(() => {
    if (currentSlideIndex === 0 && bgmRef.current) {
      bgmRef.current.play().catch(() => {});
    }
  }, [currentSlideIndex]);

  const handleSlideComplete = (slideStats) => {
    const nextScore = globalScore + slideStats.score;
    setGlobalScore(nextScore);
    setResults(prev => [...prev, slideStats]);

    if (currentSlideIndex + 1 < items.length) {
      setCurrentSlideIndex(idx => idx + 1);
    } else {
      bgmRef.current?.pause();
      const correctCount = [...results, slideStats].filter(r => r.correct).length;
      setGameResult({
        score: nextScore,
        correct: correctCount,
        total: items.length
      });
    }
  };

  if (gameResult) {
    const accuracy = gameResult.total > 0
      ? Math.round((gameResult.correct / gameResult.total) * 100)
      : 0;

    const dummyAnswers = Array.from({ length: gameResult.correct }, (_, i) => ({ questionIndex: i, correct: true }));

    return (
      <ResultScreen
        playerName={playerName || 'Bạn'}
        score={gameResult.score}
        answers={dummyAnswers}
        items={items.slice(0, Math.min(items.length, gameResult.correct))}
        title="🚀 Hangman Hoàn Tất!"
        extraStats={
          <>
            <div className={styles.extraStat}>
              <span className={styles.statVal}>🎯 {accuracy}%</span>
              <span className={styles.statLabel}>Độ chính xác</span>
            </div>
            <div className={styles.extraStat}>
              <span className={styles.statVal}>✓ {gameResult.correct}/{gameResult.total}</span>
              <span className={styles.statLabel}>Từ đoán đúng</span>
            </div>
          </>
        }
      />
    );
  }

  return (
    <div className={styles.gamePage}>
      <HangmanSlide
        key={`slide-${currentSlideIndex}`}
        item={items[currentSlideIndex]}
        slideIndex={currentSlideIndex}
        totalSlides={items.length}
        timePerSlide={timePerSlide}
        onSlideComplete={handleSlideComplete}
        globalScore={globalScore}
        isFirstSlide={currentSlideIndex === 0}
        onGameStart={handleGameStart}
      />
    </div>
  );
}
