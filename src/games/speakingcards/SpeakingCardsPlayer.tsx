'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styles from './SpeakingCardsPlayer.module.css';

// ── Fisher-Yates Shuffle ─────────────────────────────────────
function shuffle(arr: any) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Vietnamese Detection ─────────────────────────────────────
const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const isVi = (t: any) => VI_RE.test(t);

// ── Sound Engine (no external dependencies) ──────────────────
function createAudioCtx() {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function playSound(ctx: any, type: any) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'deal') {
      // Satisfying card flick
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.12);
      // white noise snap
      const bufSize = ctx.sampleRate * 0.04;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.12, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.04);
    } else if (type === 'shuffle') {
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const t = now + i * 0.04;
        osc.frequency.setValueAtTime(300 + Math.random() * 400, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.03);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    } else if (type === 'complete') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const t = now + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    }
  } catch (e: any) { /* silent */ }
}

// ── Particle Spawner ─────────────────────────────────────────
function spawnDealParticles(container: any) {
  if (!container) return;
  const colors = ['#6C5CE7', '#a29bfe', '#00b894', '#fdcb6e', '#e17055', '#fab1a0', '#00cec9', '#e84393'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    const size = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.style.cssText = `
      position:absolute; width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:50%; left:50%; top:50%;
      pointer-events:none; z-index:50; opacity:1;
      transform:translate(-50%,-50%);
      transition: all 0.6s cubic-bezier(0.2,0.8,0.3,1);
    `;
    container.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 700);
  }
}

function spawnConfetti(container: any) {
  if (!container) return;
  const colors = ['#6C5CE7', '#00b894', '#e17055', '#fdcb6e', '#0984e3', '#e84393', '#00cec9'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const size = 4 + Math.random() * 8;
    const x = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 200;
    const dur = 1.5 + Math.random() * 1.5;
    p.style.cssText = `
      position:absolute; width:${size}px; height:${size * (Math.random() > 0.5 ? 1 : 0.4)}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      left:${x}%; top:-10px; pointer-events:none; z-index:100;
      animation: confettiFall ${dur}s ease-in forwards;
      --drift: ${drift}px;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), (dur + 0.5) * 1000);
  }
}

// ══════════════════════════════════════════════════════════════
//  FLOATING PARTICLES BACKGROUND
// ══════════════════════════════════════════════════════════════
function FloatingParticles() {
  const canvasRef = useRef<any>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // @ts-ignore
    let animId;
    let particles = [];
    
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 2.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.3 - 0.15,
        opacity: 0.15 + Math.random() * 0.35,
        hue: Math.random() > 0.5 ? 260 : 170, // purple or teal
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        p.pulse += 0.02;
        
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        
        const glowR = p.r + Math.sin(p.pulse) * 1;
        const alpha = p.opacity + Math.sin(p.pulse) * 0.1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${alpha * 0.15})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 85%, ${alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      // @ts-ignore
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.particleCanvas} />;
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function SpeakingCardsPlayer({ items: rawItems = [], activity, playerName, onFinish }: any) {
  const cards = useMemo(() => {
    return rawItems
      // @ts-ignore
      .map(item => typeof item === 'string' ? item : (item.term || item.question || item.text || item.label || item.definition || ''))
      // @ts-ignore
      .filter(t => t.trim());
  }, [rawItems]);

  const total = cards.length;

  const [deck, setDeck] = useState<any[]>([]);
  const [dealt, setDealt] = useState<any>(null);
  const [dealing, setDealing] = useState(false);
  const [dealtCount, setDealtCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voices, setVoices] = useState<any[]>([]);
  const [enVoice, setEnVoice] = useState<any>(null);
  const [viVoice, setViVoice] = useState<any>(null);

  const containerRef = useRef<any>(null);
  const deckRef = useRef<any>(null);
  const dealtRef = useRef<any>(null);
  const audioCtxRef = useRef<any>(null);

  // Init audio context on first user interaction
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioCtx();
    }
  }, []);

  useEffect(() => {
    if (cards.length > 0) {
      setDeck(shuffle(cards));
      setDealt(null);
      setDealtCount(0);
      setFinished(false);
    }
  }, [cards]);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      if (!v.length) return;
      setVoices(v);
      const en = v.filter(x => x.lang.startsWith('en'));
      const vi = v.filter(x => x.lang.startsWith('vi'));
      setEnVoice(en.find(x => x.name.includes('Google') && x.lang === 'en-US') || en.find(x => x.lang === 'en-US') || en[0]);
      // Prefer female Vietnamese voice
      const femaleVi = vi.find(x => /female|nữ|woman/i.test(x.name));
      const notMaleVi = vi.find(x => !/(male|nam)\b/i.test(x.name));
      setViVoice(femaleVi || notMaleVi || vi.find(x => x.name.includes('Google')) || vi[0]);
    };
    load();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  const speak = useCallback((text: any) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const vn = isVi(text);
    if (vn && viVoice) { u.voice = viVoice; u.lang = 'vi-VN'; }
    else if (!vn && enVoice) { u.voice = enVoice; u.lang = 'en-US'; }
    else { u.lang = vn ? 'vi-VN' : 'en-US'; }
    u.rate = 0.9;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [enVoice, viVoice]);

  const handleDeal = useCallback(() => {
    if (dealing || deck.length === 0) return;
    ensureAudio();
    setDealing(true);
    playSound(audioCtxRef.current, 'deal');

    const nextCard = deck[0];
    const remaining = deck.slice(1);

    setTimeout(() => {
      setDealt(nextCard);
      setDeck(remaining);
      setDealtCount(prev => prev + 1);
      setDealing(false);
      
      // Spawn particles at the dealt card
      if (dealtRef.current) spawnDealParticles(dealtRef.current);
      
      if (autoSpeak) speak(nextCard);
      if (remaining.length === 0) {
        setTimeout(() => {
          setFinished(true);
          playSound(audioCtxRef.current, 'complete');
          if (containerRef.current) spawnConfetti(containerRef.current);
        }, 1200);
      }
    }, 400);
  }, [dealing, deck, autoSpeak, speak, ensureAudio]);

  const handleUndo = useCallback(() => {
    if (!dealt || dealing) return;
    window.speechSynthesis?.cancel();
    setDeck(prev => [dealt, ...prev]);
    setDealt(null);
    setDealtCount(prev => Math.max(0, prev - 1));
    setFinished(false);
  }, [dealt, dealing]);

  const handleShuffle = useCallback(() => {
    ensureAudio();
    window.speechSynthesis?.cancel();
    playSound(audioCtxRef.current, 'shuffle');
    setDeck(shuffle(cards));
    setDealt(null);
    setDealtCount(0);
    setFinished(false);
  }, [cards, ensureAudio]);

  const handleSpeak = () => { if (dealt) speak(dealt); };

  if (!cards.length) {
    return (
      <div className={styles.container}>
        <div className={styles.bgTheme} />
        <FloatingParticles />
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🃏</div>
          <h2>Chưa có thẻ nào</h2>
          <p>Hãy thêm từ vựng trong chế độ Chỉnh sửa.</p>
        </div>
      </div>
    );
  }

  const stackLayers = Math.min(deck.length - 1, 8);
  const progressPct = total > 0 ? (dealtCount / total) * 100 : 0;

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.bgTheme} />
      <FloatingParticles />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerEmoji}>🃏</span>
          <span className={styles.headerTitle}>{activity?.title || 'Speaking Cards'}</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.progressPill}>
            <div className={styles.progressInner} style={{ width: `${progressPct}%` }} />
            <span className={styles.progressText}>{dealtCount}/{total}</span>
          </div>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </header>

      {/* Game */}
      <main className={styles.gameArea}>
        {finished ? (
          <div className={styles.finishScreen}>
            <div className={styles.trophy}>🏆</div>
            <h2>Xuất sắc!</h2>
            <p>Bạn đã hoàn thành <strong>{total}</strong> thẻ.</p>
            <div className={styles.finishBtns}>
              <button className={styles.btnGlow} onClick={handleShuffle}>🔀 Chơi lại</button>
              {onFinish && <button className={styles.btnGhost} onClick={onFinish}>✓ Thoát</button>}
            </div>
          </div>
        ) : (
          <div className={styles.table}>
            {/* DECK */}
            <div className={styles.deckSide} onClick={handleDeal} ref={deckRef}>
              {deck.length > 0 ? (
                <div className={styles.deckWrapper}>
                  {Array.from({ length: stackLayers }, (_, i) => (
                    <div
                      key={i}
                      className={styles.stackLayer}
                      style={{
                        bottom: `${-(i + 1) * 4}px`,
                        left: `${(i + 1) * 1.5}px`,
                        opacity: Math.max(0.15, 1 - i * 0.12),
                        zIndex: -i - 1,
                      }}
                    />
                  ))}
                  <div className={`${styles.topCard} ${dealing ? styles.dealAnim : ''}`}>
                    <div className={styles.cardPattern}>
                      <div className={styles.patternCenter}>
                        <div className={styles.patternGem}>💎</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.deckCount}>
                    <span className={styles.deckNum}>{deck.length}</span>
                    <span className={styles.deckText}>thẻ còn lại</span>
                  </div>
                </div>
              ) : (
                <div className={styles.deckEmpty}>
                  <span>📭</span>
                  <p>Hết thẻ!</p>
                </div>
              )}
            </div>

            {/* DEALT CARD */}
            <div className={styles.dealtSide} ref={dealtRef}>
              {dealt ? (
                <div className={styles.dealtCard} key={`${dealt}-${dealtCount}`}>
                  {/* Decorative corners */}
                  <div className={styles.cornerTL} />
                  <div className={styles.cornerTR} />
                  <div className={styles.cornerBL} />
                  <div className={styles.cornerBR} />
                  
                  <div className={`${styles.langBadge} ${isVi(dealt) ? styles.badgeVi : styles.badgeEn}`}>
                    {isVi(dealt) ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
                  </div>
                  <div className={styles.wordArea}>
                    <span className={styles.theWord}>{dealt}</span>
                  </div>
                  <div className={styles.cardBottom}>
                    <button
                      className={`${styles.speakCircle} ${speaking ? styles.speakGlow : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
                    >
                      <span className={styles.speakWave}>🔊</span>
                    </button>
                    <span className={styles.cardIndex}>#{dealtCount}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.placeholder}>
                  <div className={styles.placeholderIcon}>👈</div>
                  <p>Nhấn vào chồng bài<br/>hoặc nhấn <strong>Deal</strong></p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Controls */}
      {!finished && (
        <footer className={styles.controls}>
          <button className={styles.ctrlBtn} onClick={handleShuffle}>
            <span>🔀</span> Shuffle
          </button>
          <button className={styles.ctrlBtn} onClick={handleUndo} disabled={!dealt}>
            <span>↩️</span> Undo
          </button>
          <button className={`${styles.ctrlBtn} ${styles.ctrlDeal}`} onClick={handleDeal} disabled={deck.length === 0}>
            <span>🎴</span> Deal
          </button>
        </footer>
      )}

      {/* Settings */}
      {showSettings && (
        <div className={styles.overlay} onClick={() => setShowSettings(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>⚙️ Cài đặt giọng đọc</h3>
              <button onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.toggleRow}>
                <div>
                  <strong>Tự động đọc</strong>
                  <small>Phát âm khi lật thẻ</small>
                </div>
                <div className={`${styles.toggle} ${autoSpeak ? styles.on : ''}`} onClick={() => setAutoSpeak(!autoSpeak)}>
                  <div className={styles.knob} />
                </div>
              </div>
              <label className={styles.vLabel}>🇺🇸 Giọng Tiếng Anh</label>
              <select className={styles.vSelect} value={enVoice?.name || ''} onChange={e => setEnVoice(voices.find(v => v.name === (e.target as any).value))}>
                <option value="">Mặc định</option>
                {voices.filter(v => v.lang.startsWith('en')).map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
              <label className={styles.vLabel}>🇻🇳 Giọng Tiếng Việt</label>
              <select className={styles.vSelect} value={viVoice?.name || ''} onChange={e => setViVoice(voices.find(v => v.name === (e.target as any).value))}>
                <option value="">Mặc định</option>
                {voices.filter(v => v.lang.startsWith('vi')).map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
