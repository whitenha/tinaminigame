'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePairingEngine } from '@/lib/engines/usePairingEngine';
import styles from '@/games/matchingpairs/MatchingPairsPlayer.module.css';

// ── Sound Engine ─────────────────────────────────────────────
function createAudioCtx() {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function sfx(ctx: any, type: any) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    if (type === 'flip') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.08);
    } else if (type === 'match') {
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
    } else if (type === 'fail') {
      [350, 250].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'square';
        const t = now + i * 0.1;
        o.frequency.setValueAtTime(f, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.12);
      });
    }
  } catch { }
}

// ── Sparkle burst on match ───────────────────────────────────
function spawnSparkles(el: any) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#6C5CE7', '#00b894', '#fdcb6e', '#e84393', '#0984e3', '#55efc4'];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    const size = 4 + Math.random() * 8;
    const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
    const dist = 50 + Math.random() * 70;
    p.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:50%;left:${cx}px;top:${cy}px;
      pointer-events:none;z-index:999;
      transition:all 0.6s cubic-bezier(0.23,1,0.32,1);opacity:1;
      box-shadow:0 0 6px ${colors[Math.floor(Math.random() * colors.length)]};
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

// ── Floating score text ──────────────────────────────────────
function spawnFloatingText(el: any, text: any, isPositive = true) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top;
  const p = document.createElement('div');
  p.textContent = text;
  p.style.cssText = `
    position:fixed;left:${cx}px;top:${cy}px;
    font-family:'Inter',system-ui,sans-serif;
    font-size:1.3rem;font-weight:900;z-index:1000;
    pointer-events:none;
    color:${isPositive ? '#55efc4' : '#ff7675'};
    text-shadow:0 2px 10px ${isPositive ? 'rgba(85,239,196,0.5)' : 'rgba(255,118,117,0.5)'};
    transform:translateX(-50%);
    transition:all 0.8s cubic-bezier(0.23,1,0.32,1);opacity:1;
  `;
  document.body.appendChild(p);
  requestAnimationFrame(() => {
    p.style.top = `${cy - 60}px`;
    p.style.opacity = '0';
  });
  setTimeout(() => p.remove(), 900);
}

// ══════════════════════════════════════════════════════════════
export default function MultiplayerMatchingPairsBoard({
  items,
  mp,
  timeLeft,
  isShareScreen,
  isSpectatingHost,
}: any) {
  // Determine role and mode
  // 1: isShareScreen=false + player -> See board? No, just look at screen
  // 2: isShareScreen=false + host -> Play board
  // 3: isShareScreen=true + player -> Play board (with broadcast)
  // 4: isShareScreen=true + host -> Display giant board + listen to events

  const isPlayerNoScreen = !isShareScreen && !mp.isHost;
  const isHostPlay = !isShareScreen && mp.isHost;
  const isPlayerPlay = isShareScreen && !mp.isHost;
  const isGiantBoard = isShareScreen && mp.isHost;

  // Extract from normalized PAIRS_GROUP
  const roundItem = items[mp.currentQuestion] || { pairs: [] };
  const pairList = roundItem.pairs || [];

  const engine = usePairingEngine(pairList, {
    musicType: 'none',
    mode: 'memory',
    hasCountdown: false,    // Fix engine.phase lock
    defaultTimeLimit: 9999, // Disable engine time limit since we use host's
    columns: pairList.length <= 4 ? 2 : pairList.length <= 8 ? 4 : 4,
    // Add onPairMatch callback to broadcast if this is a student playing
    onPairMatch: (pairId: any) => {
      if (isPlayerPlay && mp.broadcastPairMatch) {
         mp.broadcastPairMatch(pairId);
      }
    }
  });

  const audioRef = useRef<any>(null);
  const cardRefs = useRef<any>({});
  const prevMatchedRef = useRef(0);
  const prevFailRef = useRef('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const wasTimerStarted = mp?.questionStartTime !== null;

  const ensureAudio = useCallback(() => {
    if (!audioRef.current && !isGiantBoard) audioRef.current = createAudioCtx();
  }, [isGiantBoard]);

  // ── Giant Board (Host Share Screen) Event Listener ───────────
  useEffect(() => {
    if (!isGiantBoard) return;
    
    const handlePairMatched = (e: any) => {
      const { pairId, playerName } = e.detail;
      // Find cards with this pairId
      sfx(audioRef.current, 'match');
      
      const targetCards = engine.cards.filter(c => c.pairId === pairId);
      targetCards.forEach(card => {
        if (cardRefs.current[card.id]) {
          spawnSparkles(cardRefs.current[card.id]);
          spawnFloatingText(cardRefs.current[card.id], `✨ ${playerName || 'Một học sinh'} vừa ghép đúng!`, true);
        }
      });
    };

    window.addEventListener('tina_pair_matched', handlePairMatched);
    return () => window.removeEventListener('tina_pair_matched', handlePairMatched);
  }, [isGiantBoard, engine.cards]);

  // ── Detect Match / Fail events (for active players) ───────────
  useEffect(() => {
    if (isGiantBoard) return; // Giant board doesn't process local engine matches the same way visually
    if (engine.matchedCount > prevMatchedRef.current) {
      sfx(audioRef.current, 'match');
      const scoreGain = 500 + (engine.streak >= 2 ? 200 : 0);
      engine.cards.forEach(card => {
        if (engine.isCardMatched(card.id) && cardRefs.current[card.id]) {
          spawnSparkles(cardRefs.current[card.id]);
          spawnFloatingText(cardRefs.current[card.id], `+${scoreGain}`, true);
        }
      });
    }
    prevMatchedRef.current = engine.matchedCount;
  }, [engine.matchedCount, engine.cards, engine.streak, audioRef, isGiantBoard]);

  useEffect(() => {
    if (isGiantBoard) return;
    const failKey = engine.cards.map(c => engine.isCardFailed(c.id) ? '1' : '0').join('');
    if (failKey !== prevFailRef.current && failKey.includes('1')) {
      sfx(audioRef.current, 'fail');
      engine.cards.forEach(card => {
        if (engine.isCardFailed(card.id) && cardRefs.current[card.id]) {
          spawnFloatingText(cardRefs.current[card.id], 'Không khớp!', false);
        }
      });
    }
    prevFailRef.current = failKey;
  }, [engine.cards, engine.isCardFailed, audioRef, isGiantBoard]);

  // ── Watch for game end: All matched OR timer ends ────────────
  // Only for active players or if Host is playing. 
  useEffect(() => {
    // If student is looking up at the board, no need to auto-submit their empty results!
    if (isPlayerNoScreen) return;
    
    // If it's a Giant Board, the Host ends the game manually or when timer runs out, do not use `submitAnswer`
    if (isGiantBoard) return;

    if (hasSubmitted || isSpectatingHost || !mp?.submitAnswer || engine.cards.length === 0) return;

    const allMatched = engine.matchedCount === engine.totalPairs;
    const timeIsUp = wasTimerStarted && timeLeft === 0;

    if (allMatched || timeIsUp) {
      setHasSubmitted(true);
      const finalScore = engine.score || 0;
      mp.submitAnswer(0, finalScore > 0, items[0], items.length, finalScore);
    }
  }, [engine.matchedCount, engine.totalPairs, engine.score, timeLeft, hasSubmitted, isSpectatingHost, mp, items, wasTimerStarted, engine.cards.length, isPlayerNoScreen, isGiantBoard]);

  // ── UI RENDERS ───────────────────────────────────────────────

  // Case 1: Student & No Screen Projected (Host plays)
  if (isPlayerNoScreen) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '40px' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 24, fontWeight: 'bold' }}>
          👨‍🏫 Hãy nhìn lên màn hình chính để cùng thầy cô chơi!
        </div>
      </div>
    );
  }

  // Common Locks for Playable Boards
  const isLocked = hasSubmitted || isSpectatingHost || (wasTimerStarted && timeLeft <= 0) || engine.phase !== 'playing' || isGiantBoard;

  const handleFlip = (cardId: any) => {
    if (isLocked) return;
    ensureAudio();
    sfx(audioRef.current, 'flip');
    engine.flipCard(cardId);
  };

  const totalCards = engine.cards.length;
  // Increase column limits for desktop / layout constraints
  const cols = totalCards <= 4 ? 2 : totalCards <= 6 ? 3 : totalCards <= 12 ? 4 : totalCards <= 20 ? 5 : 6;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }} onClick={ensureAudio}>
      {hasSubmitted && !isSpectatingHost && !isGiantBoard && (
        <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 18, marginBottom: 10, width: '100%', textAlign: 'center' }}>
          ⏳ {engine.matchedCount === engine.totalPairs ? 'Thành công! ' : ''}Đang chờ người khác...
        </div>
      )}
      
      {isGiantBoard && (
        <div style={{ color: 'var(--yellow)', fontWeight: 800, fontSize: 24, marginBottom: 16, width: '100%', textAlign: 'center', animation: 'pulse 2s infinite', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          🔥 Học sinh đang tranh tài ghép thẻ! 🔥
        </div>
      )}

      <div className={styles.boardArea} style={{ padding: '0 16px', height: '100%', alignItems: 'center', width: '100%' }}>
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px', maxWidth: '1000px', width: '100%' }}>
          {engine.cards.map((card, idx) => {
            const isFlipped = engine.isCardFlipped(card.id);
            const isMatched = engine.isCardMatched(card.id);
            const isFailed = engine.isCardFailed(card.id);

            let cardClass = styles.card;
            // On Giant Board, we want all cards to look essentially "Flipped" by default so people can see them! Wait, do we?
            // If the Host shows a giant board, do they see all cards face up or face down?
            // "Bảng Thẻ Khổng Lồ, mỗi khi có một học sinh ghép trúng một cặp nào, cặp thẻ đó sẽ sáng lên"
            // If it's a puzzle, leaving it face down makes sense. But NO ONE can click it on the Host screen.
            // If it's face down and no one can click it, how do students know the spatial positions? Students have their own instances! The positions are randomized per device!
            // Wait, the positions are randomized per device! So the Host's grid layout isn't exactly the same as the students'.
            // Because of this, Host SHOULD see ALL CARDS FACE UP! And when a student matches a pair, that pair flashes!
            const showFaceUp = isGiantBoard || isFlipped || isMatched;

            if (showFaceUp) cardClass += ` ${styles.cardFlipped}`;
            if (isMatched && !isGiantBoard) cardClass += ` ${styles.cardMatched}`; // On Giant board, no permanent matched state, just sparks
            if (isFailed) cardClass += ` ${styles.cardFailed}`;

            return (
              <button
                key={card.id}
                // @ts-ignore
                ref={el => cardRefs.current[card.id] = el}
                className={cardClass}
                onClick={() => handleFlip(card.id)}
                disabled={isMatched || isFlipped || isLocked}
                // @ts-ignore
                style={{ '--card-delay': `${idx * 0.04}s`, minHeight: '120px' }}
              >
                <div className={styles.cardInner}>
                  {/* FRONT (face-down) */}
                  <div className={styles.cardFront}>
                    <div className={styles.cardPattern} />
                    <span className={styles.questionMark}>?</span>
                    <div className={styles.cardShine} />
                  </div>
                  {/* BACK (face-up) */}
                  <div className={styles.cardBack} style={isGiantBoard ? { border: '2px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(0,0,0,0.4))' } : {}}>
                    <div className={styles.cardBackGlow} />
                    <div className={styles.cardAccent} />
                    <div className={styles.cardInnerFrame}>
                      <div className={styles.cornerTL} />
                      <div className={styles.cornerTR} />
                      <div className={styles.cornerBL} />
                      <div className={styles.cornerBR} />
                    </div>
                    {card.image && <img src={card.image} alt="" className={styles.cardImg} />}
                    <div className={styles.cardTextWrap}>
                      <span className={styles.cardText} style={{ fontSize: card.text?.length > 10 ? '0.85rem' : '1.1rem' }}>{card.text}</span>
                    </div>
                    
                    {/* Overlays for active playing modes */}
                    {isFailed && !isGiantBoard && (
                      <div className={styles.failOverlay}>
                        <span className={styles.failX}>✕</span>
                      </div>
                    )}
                    {isMatched && !isGiantBoard && (
                      <div className={styles.matchOverlay}>
                        <span className={styles.matchCheck}>✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
