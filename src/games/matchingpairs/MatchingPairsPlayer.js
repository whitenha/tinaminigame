'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { usePairingEngine } from '@/lib/engines/usePairingEngine';
import styles from './MatchingPairsPlayer.module.css';

// ── Sound Engine ─────────────────────────────────────────────
function createAudioCtx() {
  if (typeof window === 'undefined') return null;
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function sfx(ctx, type) {
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
    } else if (type === 'complete') {
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        const t = now + i * 0.12;
        o.frequency.setValueAtTime(f, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.4);
      });
    }
  } catch {}
}

// ── Sparkle burst on match ───────────────────────────────────
function spawnSparkles(el) {
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
function spawnFloatingText(el, text, isPositive = true) {
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

// ── Confetti on complete ─────────────────────────────────────
function spawnConfetti(container) {
  if (!container) return;
  const colors = ['#6C5CE7', '#00b894', '#e17055', '#fdcb6e', '#0984e3', '#e84393', '#55efc4', '#a29bfe'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    const s = 4 + Math.random() * 10;
    const x = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 250;
    const dur = 1.5 + Math.random() * 2;
    const rotation = Math.random() * 1080;
    p.style.cssText = `
      position:absolute;width:${s}px;height:${s * (Math.random() > .5 ? 1 : .4)}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      left:${x}%;top:-10px;pointer-events:none;z-index:100;
      animation:mpConfettiFall ${dur}s ease-in forwards;
      --drift:${drift}px;--rotation:${rotation}deg;
      animation-delay:${Math.random() * 0.6}s;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), (dur + 0.6) * 1000);
  }
}

// ── Floating particles system ────────────────────────────────
function initParticles(container) {
  if (!container) return;
  const existing = container.querySelector('[data-particles]');
  if (existing) return;
  
  const wrap = document.createElement('div');
  wrap.setAttribute('data-particles', '');
  wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;';
  
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    const size = 2 + Math.random() * 4;
    const x = Math.random() * 100;
    const dur = 8 + Math.random() * 12;
    const delay = Math.random() * dur;
    const opacity = 0.15 + Math.random() * 0.3;
    p.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;
      background:rgba(162,155,254,${opacity});
      border-radius:50%;left:${x}%;bottom:-5%;
      animation:mpParticleFloat ${dur}s linear ${delay}s infinite;
      box-shadow:0 0 ${size * 2}px rgba(108,92,231,${opacity * 0.5});
    `;
    wrap.appendChild(p);
  }
  container.appendChild(wrap);
}

// ══════════════════════════════════════════════════════════════
export default function MatchingPairsPlayer({ items, activity, playerName, onFinish }) {
  const engine = usePairingEngine(items, {
    musicType: 'calm',
    mode: 'memory',
    defaultTimeLimit: 180,
    columns: items.length <= 4 ? 2 : items.length <= 8 ? 4 : 4,
  });

  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const cardRefs = useRef({});
  const prevMatchedRef = useRef(0);
  const prevPhaseRef = useRef('countdown');
  const prevFailRef = useRef('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);  // {text, type} for floating center msg

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = createAudioCtx();
  }, []);

  // Init floating particles
  useEffect(() => {
    if (engine.phase === 'playing') {
      initParticles(containerRef.current);
    }
  }, [engine.phase]);

  // Detect match events → sparkle + floating score
  useEffect(() => {
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
  }, [engine.matchedCount]);

  // Detect fail events → floating "Không khớp!"
  useEffect(() => {
    const failKey = engine.cards.map(c => engine.isCardFailed(c.id) ? '1' : '0').join('');
    if (failKey !== prevFailRef.current && failKey.includes('1')) {
      sfx(audioRef.current, 'fail');
      // Show floating fail text on both failed cards
      engine.cards.forEach(card => {
        if (engine.isCardFailed(card.id) && cardRefs.current[card.id]) {
          spawnFloatingText(cardRefs.current[card.id], 'Không khớp!', false);
        }
      });
    }
    prevFailRef.current = failKey;
  }, [engine.cards.map(c => engine.isCardFailed(c.id)).join(',')]);

  // Complete event
  useEffect(() => {
    if (engine.phase === 'result' && prevPhaseRef.current !== 'result') {
      sfx(audioRef.current, 'complete');
      setTimeout(() => {
        if (containerRef.current) spawnConfetti(containerRef.current);
      }, 300);
    }
    prevPhaseRef.current = engine.phase;
  }, [engine.phase]);

  const handleFlip = (cardId) => {
    ensureAudio();
    sfx(audioRef.current, 'flip');
    engine.flipCard(cardId);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Calculate grid columns
  const totalCards = engine.cards.length;
  const cols = totalCards <= 4 ? 2 : totalCards <= 6 ? 3 : totalCards <= 12 ? 4 : totalCards <= 20 ? 5 : 6;

  // Timer progress
  const maxTime = 180;
  const timerPct = (engine.timeLeft / maxTime) * 100;
  const timerColor = timerPct > 40 ? '#00b894' : timerPct > 15 ? '#fdcb6e' : '#ff7675';

  // ── Countdown ──────────────────────────────────────────────
  if (engine.phase === 'countdown') {
    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.bgTheme} />
        <div className={styles.countdownScreen}>
          <div className={styles.countdownRing} key={engine.countdownNum}>
            <div className={styles.countdownNumber}>
              {engine.countdownNum || 'GO!'}
            </div>
          </div>
          <p className={styles.countdownLabel}>Matching Pairs</p>
          <p className={styles.countdownSub}>Lật thẻ để tìm cặp phù hợp</p>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────
  if (engine.phase === 'result') {
    const elapsed = maxTime - engine.timeLeft;
    const stars = engine.accuracy >= 90 ? 3 : engine.accuracy >= 60 ? 2 : 1;
    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.bgTheme} />
        <div className={styles.resultScreen}>
          <div className={styles.resultStars}>
            {[1,2,3].map(s => (
              <span key={s} className={`${styles.resultStar} ${s <= stars ? styles.starActive : ''}`}
                    style={{ '--star-delay': `${s * 0.2}s` }}>★</span>
            ))}
          </div>
          <h2>Hoàn thành!</h2>
          <div className={styles.resultStats}>
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{formatTime(elapsed)}</span>
              <span className={styles.statLabel}>Thời gian</span>
            </div>
            <div className={styles.resultDivider} />
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{engine.matchedCount}/{engine.totalPairs}</span>
              <span className={styles.statLabel}>Đã ghép</span>
            </div>
            <div className={styles.resultDivider} />
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{engine.accuracy}%</span>
              <span className={styles.statLabel}>Chính xác</span>
            </div>
            <div className={styles.resultDivider} />
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{engine.score}</span>
              <span className={styles.statLabel}>Điểm</span>
            </div>
          </div>
          <div className={styles.resultBtns}>
            <button className={styles.btnPrimary} onClick={() => window.location.reload()}>Chơi lại</button>
            {onFinish && <button className={styles.btnSecondary} onClick={onFinish}>Thoát</button>}
          </div>
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────
  return (
    <div className={styles.container} ref={containerRef} onClick={ensureAudio}>
      <div className={styles.bgTheme} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.timerBlock}>
          <span className={styles.timerDot} />
          <span className={styles.timerValue}>{formatTime(engine.timeLeft)}</span>
        </div>
        <h1 className={styles.gameTitle}>{activity?.title || 'Matching Pairs'}</h1>
        <div className={styles.headerRight}>
          <span className={styles.matchCount}>
            {engine.matchedCount}/{engine.totalPairs}
          </span>
          {engine.streak >= 2 && (
            <span className={styles.streakBadge}>
              {engine.streak}x
            </span>
          )}
        </div>
      </header>

      {/* Timer Progress Bar */}
      <div className={styles.timerBar}>
        <div
          className={styles.timerProgress}
          style={{
            width: `${timerPct}%`,
            background: `linear-gradient(90deg, ${timerColor}, ${timerColor}dd)`,
          }}
        />
      </div>

      {/* Card Grid */}
      <main className={styles.boardArea}>
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {engine.cards.map((card, idx) => {
            const isFlipped = engine.isCardFlipped(card.id);
            const isMatched = engine.isCardMatched(card.id);
            const isFailed = engine.isCardFailed(card.id);

            let cardClass = styles.card;
            if (isFlipped || isMatched) cardClass += ` ${styles.cardFlipped}`;
            if (isMatched) cardClass += ` ${styles.cardMatched}`;
            if (isFailed) cardClass += ` ${styles.cardFailed}`;

            return (
              <button
                key={card.id}
                ref={el => cardRefs.current[card.id] = el}
                className={cardClass}
                onClick={() => handleFlip(card.id)}
                disabled={isMatched || isFlipped}
                style={{ '--card-delay': `${idx * 0.04}s` }}
              >
                <div className={styles.cardInner}>
                  {/* FRONT (face-down) */}
                  <div className={styles.cardFront}>
                    <div className={styles.cardPattern} />
                    <span className={styles.questionMark}>?</span>
                    <div className={styles.cardShine} />
                  </div>
                  {/* BACK (face-up) */}
                  <div className={styles.cardBack}>
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
                      <span className={styles.cardText}>{card.text}</span>
                    </div>
                    {isFailed && (
                      <div className={styles.failOverlay}>
                        <span className={styles.failX}>✕</span>
                      </div>
                    )}
                    {isMatched && (
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
      </main>

      {/* Footer stats */}
      <footer className={styles.footer}>
        <div className={styles.footerStat}>
          <span className={styles.footerLabel}>Lượt</span>
          <span className={styles.footerValue}>{engine.attempts}</span>
        </div>
        <div className={styles.footerStat}>
          <span className={styles.footerLabel}>Điểm</span>
          <span className={styles.footerValue} key={engine.score}>{engine.score}</span>
        </div>
        <div className={styles.footerStat}>
          <span className={styles.footerLabel}>Chính xác</span>
          <span className={styles.footerValue}>{engine.accuracy}%</span>
        </div>
      </footer>
    </div>
  );
}
