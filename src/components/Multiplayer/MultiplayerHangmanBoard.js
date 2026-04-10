'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from '@/games/hangman/HangmanPlayer.module.css';

// ── KEYBOARD LAYOUT ──────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M']
];

// ── SOUND ENGINE (Optional visual/audio fallback) ────────────
function createAudioCtx() {
  if (typeof window === 'undefined') return null;
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function sfx(ctx, type) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    if (type === 'match') {
      [523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        const t = now + i * 0.08;
        o.frequency.setValueAtTime(f, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.18);
      });
    }
  } catch { }
}

function spawnSparkles(el, emoji = '✨') {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#6C5CE7', '#00b894', '#fdcb6e', '#e84393', '#0984e3', '#55efc4'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    const size = 4 + Math.random() * 8;
    const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
    const dist = 50 + Math.random() * 70;
    p.innerText = emoji;
    p.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
      font-size: 20px;
      left:${cx}px;top:${cy}px;
      pointer-events:none;z-index:999;
      transition:all 0.6s cubic-bezier(0.23,1,0.32,1);opacity:1;
    `;
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.left = `${cx + Math.cos(angle) * dist}px`;
      p.style.top = `${cy + Math.sin(angle) * dist}px`;
      p.style.opacity = '0';
      p.style.transform = 'scale(0) rotate(180deg)';
    });
    setTimeout(() => p.remove(), 700);
  }
}

// ── ROCKET SVG PARTS (6 stages) ─────────────────────────────
function RocketSVG({ stage, won, lost }) {
  return (
    <div className={`${styles.rocketArea} ${won ? styles.rocketLaunch : ''} ${lost ? styles.rocketExplode : ''}`}>
      <svg viewBox="0 0 200 320" className={styles.rocketSvg} aria-hidden="true" width="100%" height="100%">
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

        {/* Minion character */}
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
        </g>

        {lost && (
          <g className={styles.lostMarks}>
            <text x="100" y="200" textAnchor="middle" fontSize="60" fill="#d63031" opacity="0.7">✕</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── MULTIPLAYER BOARD COMPONENT ────────────────────────────────
export default function MultiplayerHangmanBoard({
  item,
  mp,
  timeLeft,
  isShareScreen,
  isSpectatingHost,
  showFeedback
}) {
  const MAX_WRONG = 6;
  const word = (item?.term || item?.question || '').toUpperCase().trim();
  const definition = item?.definition || '';
  const uniqueWordLetters = [...new Set(word.split('').filter(c => /[A-Z]/.test(c)))];

  // Logic Roles
  const isPlayerNoScreen = !isShareScreen && !mp.isHost;
  const isGiantBoard = isShareScreen && mp.isHost;
  
  const audioRef = useRef(null);
  const wrapperRef = useRef(null);

  // States
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState(null);
  const [revealedByHint, setRevealedByHint] = useState(new Set());
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Giant Board tracking
  const [classMatches, setClassMatches] = useState(0);

  const correctCount = uniqueWordLetters.filter(l => guessedLetters.has(l)).length;
  // If giant board, we just put rocket at max, or pulse it based on classMatches
  const rocketStage = isGiantBoard 
    ? Math.min(6, (classMatches % 6) + 1) // Cycle the rocket visually
    : Math.min(6, Math.round((correctCount / Math.max(uniqueWordLetters.length, 1)) * 6));
  
  const isWon = uniqueWordLetters.every(l => guessedLetters.has(l));
  const isLost = wrongGuesses >= MAX_WRONG && !isGiantBoard;

  const [wasTimerStarted, setWasTimerStarted] = useState(false);
  useEffect(() => {
    if (timeLeft > 0) setWasTimerStarted(true);
  }, [timeLeft]);

  const isTimeUp = wasTimerStarted && timeLeft <= 0;
  const isLocked = hasSubmitted || isSpectatingHost || isTimeUp || showFeedback || isGiantBoard;

  const ensureAudio = useCallback(() => {
    if (!audioRef.current && !isGiantBoard) audioRef.current = createAudioCtx();
  }, [isGiantBoard]);

  // Handle Giant Board Broadcasts
  useEffect(() => {
    if (!isGiantBoard) return;
    
    const handlePairMatched = (e) => {
      setClassMatches(prev => prev + 1);
      if (wrapperRef.current) {
         spawnSparkles(wrapperRef.current, '🚀');
      }
      sfx(audioRef.current, 'match');
      
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const p = document.createElement('div');
        p.textContent = `✅ ${e.detail.playerName || 'Một học sinh'} vừa phá đảo!`;
        p.style.cssText = `
          position:fixed; left:${rect.left + Math.random()*rect.width}px; top:${rect.top + rect.height/2}px;
          font-family:'Inter',sans-serif; font-size:1.2rem; font-weight:800; color:#55efc4;
          text-shadow:0 2px 10px rgba(0,0,0,0.8); z-index:1000; pointer-events:none;
          transition:all 1.5s ease-out; opacity:1;
        `;
        document.body.appendChild(p);
        requestAnimationFrame(() => {
          p.style.top = `${rect.top - 50}px`; p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), 1500);
      }
    };

    window.addEventListener('tina_pair_matched', handlePairMatched);
    return () => window.removeEventListener('tina_pair_matched', handlePairMatched);
  }, [isGiantBoard]);

  // Handle auto-submit when won/lost/timeout
  useEffect(() => {
    if (isGiantBoard || isPlayerNoScreen) return;
    if (hasSubmitted || isSpectatingHost || !mp?.submitAnswer || showFeedback) return;

    if (isWon || isLost || isTimeUp) {
      setHasSubmitted(true);
      let finalScore = 0;
      if (isWon) {
        const speedBonus = isTimeUp ? 0 : Math.round((timeLeft / Math.max(mp?.roomSettings?.timePerQuestion || 30, 30)) * 500);
        const penalty = (wrongGuesses * 100) + (hintUsed ? 300 : 0);
        finalScore = Math.max(1000 + speedBonus - penalty, 100);
        if (mp.broadcastPairMatch) mp.broadcastPairMatch('hangman_win');
      }
      mp.submitAnswer(-1, isWon, word, 1, finalScore);
    }
  }, [isWon, isLost, isTimeUp, hasSubmitted, isSpectatingHost, showFeedback, isGiantBoard, isPlayerNoScreen, mp, timeLeft, wrongGuesses, hintUsed, word]);

  const guessLetter = useCallback((letter) => {
    if (isLocked || isWon || isLost) return;
    ensureAudio();
    if (guessedLetters.has(letter)) return;

    const newGuessed = new Set([...guessedLetters, letter]);
    setGuessedLetters(newGuessed);

    if (word.includes(letter)) {
      setLastGuessResult('correct');
    } else {
      setWrongGuesses(w => w + 1);
      setLastGuessResult('wrong');
    }
    setTimeout(() => setLastGuessResult(null), 600);
  }, [isLocked, isWon, isLost, guessedLetters, word, ensureAudio]);

  const useHint = useCallback(() => {
    if (hintUsed || isLocked || isWon || isLost) return;
    ensureAudio();
    setHintUsed(true);
    const unrevealed = uniqueWordLetters.filter(l => !guessedLetters.has(l));
    if (unrevealed.length > 0) {
      const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      setGuessedLetters(prev => new Set([...prev, pick]));
      setRevealedByHint(prev => new Set([...prev, pick]));
    }
  }, [hintUsed, isLocked, isWon, isLost, uniqueWordLetters, guessedLetters, ensureAudio]);

  useEffect(() => {
    if (isLocked || isGiantBoard || isPlayerNoScreen) return;
    const handler = (e) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) guessLetter(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLocked, isGiantBoard, isPlayerNoScreen, guessLetter]);

  if (isPlayerNoScreen) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '40px' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
          👨‍🏫 Hãy nhìn lên màn hình chính để cùng thầy cô chơi!
        </div>
      </div>
    );
  }

  const wordChars = word.split('');

  return (
    <div ref={wrapperRef} style={{ width: '100%', maxWidth: '1000px', flex: 1, display: 'flex', flexDirection: 'column' }} onClick={ensureAudio}>
      
      {isGiantBoard && (
        <div style={{ color: 'var(--yellow)', fontWeight: 800, fontSize: 24, marginBottom: 16, width: '100%', textAlign: 'center', animation: 'pulse 2s infinite', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          🔥 Cả lớp đang giải cứu Minion! 🔥
        </div>
      )}

      {hasSubmitted && !isGiantBoard && !showFeedback && (
        <div style={{ color: 'var(--green-light)', fontWeight: 800, fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
          {isWon ? '✅ Tuyệt vời! Bạn đã đoán xong.' : '💥 Rất tiếc, tên lửa đã nổ hỏng!'} Đang chờ người khác...
        </div>
      )}

      <div className={`${styles.splitLayout} ${lastGuessResult === 'wrong' ? styles.shakeScreen : ''}`} style={{ flex: 1, maxHeight: '80vh' }}>
        <div className={styles.leftPanel} style={isGiantBoard ? { flex: 1 } : {}}>
          <RocketSVG stage={rocketStage} won={isWon || (isGiantBoard && classMatches > 0 && classMatches % 5 === 0)} lost={isLost} />
          {!isGiantBoard && (
            <div className={styles.wrongCounter}>
              <span className={styles.wrongLabel}>Sai:</span>
              <span className={styles.wrongNum}>{wrongGuesses}</span>
              <span className={styles.wrongMax}>/ {MAX_WRONG}</span>
            </div>
          )}
        </div>

        {!isGiantBoard && (
          <div className={styles.rightPanel}>
            {definition && (
              <div className={styles.hintBanner}>
                <span className={styles.hintIcon}>💡</span>
                <span className={styles.hintText}>{definition}</span>
              </div>
            )}

            <div className={styles.wordDisplay}>
              {wordChars.map((char, i) => {
                const isLetter = /[A-Z]/.test(char);
                const revealed = !isLetter || guessedLetters.has(char) || showFeedback || isWon;
                const isHinted = revealedByHint.has(char);
                const justRevealed = lastGuessResult === 'correct' && revealed && !isHinted;
                const showOnLose = (isLost || showFeedback) && isLetter && !guessedLetters.has(char);

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

            <div className={styles.keyboard}>
              {KEYBOARD_ROWS.map((row, ri) => (
                <div key={ri} className={styles.keyRow}>
                  {row.map(letter => {
                    const guessed = guessedLetters.has(letter) || showFeedback;
                    const inWord = word.includes(letter);
                    let keyState = '';
                    if (guessed && inWord) keyState = styles.keyCorrect;
                    else if (guessed && !inWord) keyState = styles.keyWrong;

                    return (
                      <button
                        key={letter}
                        className={`${styles.key} ${keyState}`}
                        onClick={() => guessLetter(letter)}
                        disabled={guessed || isLocked || showFeedback}
                        aria-label={letter}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {!isWon && !isLost && !showFeedback && (
              <div className={styles.actionRow} style={{ marginTop: 'auto', paddingTop: '16px' }}>
                <button
                  className={`${styles.hintBtn} ${hintUsed ? styles.hintUsedBtn : ''}`}
                  onClick={useHint}
                  disabled={hintUsed || isLocked}
                >
                  {hintUsed ? '💡 Đã dùng gợi ý' : '💡 Mở 1 chữ cái'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
