'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styles from './MatchUpPlayer.module.css';

// ── Shuffle ──────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Sound Engine ─────────────────────────────────────────────
function createAudioCtx() {
  if (typeof window === 'undefined') return null;
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function sfx(ctx, type) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);

    if (type === 'drop') {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.setValueAtTime(440, now);
      o.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      o.connect(g); o.start(now); o.stop(now + 0.1);
    } else if (type === 'correct') {
      [523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        const t = now + i * 0.08;
        o.frequency.setValueAtTime(f, t);
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0.12, t);
        gg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(gg); gg.connect(ctx.destination);
        o.start(t); o.stop(t + 0.15);
      });
    } else if (type === 'wrong') {
      [300, 200].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'square';
        const t = now + i * 0.12;
        o.frequency.setValueAtTime(f, t);
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0.06, t);
        gg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(gg); gg.connect(ctx.destination);
        o.start(t); o.stop(t + 0.15);
      });
    } else if (type === 'complete') {
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        const t = now + i * 0.12;
        o.frequency.setValueAtTime(f, t);
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0.15, t);
        gg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(gg); gg.connect(ctx.destination);
        o.start(t); o.stop(t + 0.35);
      });
    }
  } catch {}
}

// ── Confetti ─────────────────────────────────────────────────
function spawnConfetti(el) {
  if (!el) return;
  const colors = ['#6C5CE7', '#00b894', '#e17055', '#fdcb6e', '#0984e3', '#e84393'];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    const s = 4 + Math.random() * 7;
    const x = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 200;
    const dur = 1.5 + Math.random() * 1.5;
    p.style.cssText = `
      position:absolute;width:${s}px;height:${s * (Math.random()>.5?1:.4)}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      left:${x}%;top:-10px;pointer-events:none;z-index:100;
      animation:confettiFall ${dur}s ease-in forwards;
      --drift:${drift}px;animation-delay:${Math.random()*0.5}s;
    `;
    el.appendChild(p);
    setTimeout(() => p.remove(), (dur + 0.5) * 1000);
  }
}

// Card colors palette (no emoji — just beautiful gradients)
const CARD_COLORS = [
  ['#6C5CE7', '#a29bfe'],
  ['#00b894', '#55efc4'],
  ['#e17055', '#fab1a0'],
  ['#0984e3', '#74b9ff'],
  ['#e84393', '#fd79a8'],
  ['#fdcb6e', '#ffeaa7'],
  ['#00cec9', '#81ecec'],
  ['#d63031', '#ff7675'],
  ['#6c5ce7', '#dfe6e9'],
  ['#2d3436', '#636e72'],
];

// ══════════════════════════════════════════════════════════════
export default function MatchUpPlayer({ items: rawItems = [], activity, playerName, onFinish }) {
  const [currentRound, setCurrentRound] = useState(0);

  // Normalize legacy PAIRS items into a single round if missing .pairs
  const items = useMemo(() => {
    if (rawItems.length > 0 && !rawItems[0].pairs) {
      return [{ pairs: rawItems, time_limit: rawItems[0].time_limit || 60 }];
    }
    return rawItems;
  }, [rawItems]);

  // Parse pairs for the current round
  const pairs = useMemo(() => {
    const roundItem = items[currentRound] || { pairs: [] };
    return (roundItem.pairs || [])
      .filter(it => (it.term || it.question) && (it.definition || ''))
      .map((it, idx) => ({
        id: idx,
        term: it.term || it.question || '',
        definition: it.definition || '',
        color: CARD_COLORS[idx % CARD_COLORS.length],
      }));
  }, [items, currentRound]);

  const total = pairs.length;
  const isLastRound = currentRound >= items.length - 1;

  // Shuffled terms (the draggable side)
  const shuffledTerms = useMemo(() => shuffle(pairs.map(p => ({ id: p.id, term: p.term, color: p.color }))), [pairs]);
  // Shuffled definitions (the drop target side)
  const shuffledDefs = useMemo(() => shuffle(pairs.map(p => ({ id: p.id, definition: p.definition }))), [pairs]);

  // State
  const [placements, setPlacements] = useState({});     // { defId: termId }
  const [availableTerms, setAvailableTerms] = useState([]); // term ids still in tray
  const [dragItem, setDragItem] = useState(null);        // currently dragging term id
  const [hoveredSlot, setHoveredSlot] = useState(null);  // slot being hovered
  const [phase, setPhase] = useState('playing');         // 'playing' | 'checking' | 'result'
  const [results, setResults] = useState({});            // { defId: 'correct'|'wrong' }
  const [timer, setTimer] = useState(0);
  const [score, setScore] = useState(0);

  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  // Track which slot a drag started from (for placed-term drags)
  const dragSourceSlotRef = useRef(null);

  // Touch DnD state
  const touchRef = useRef({ active: false, termId: null, clone: null, startX: 0, startY: 0 });

  // Init
  useEffect(() => {
    setAvailableTerms(shuffledTerms.map(t => t.id));
    setPlacements({});
    setResults({});
    setPhase('playing');
    setTimer(0);
    setScore(0);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [shuffledTerms]);

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = createAudioCtx();
  };

  // Format timer
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Drag & Drop (Desktop) ─────────────────────────────────
  const onDragStart = (e, termId) => {
    ensureAudio();
    dragSourceSlotRef.current = null; // dragging from tray
    setDragItem(termId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(termId));
  };

  // Drag start from a PLACED term inside a slot
  const onPlacedDragStart = (e, termId, fromDefId) => {
    ensureAudio();
    dragSourceSlotRef.current = fromDefId; // remember source slot
    setDragItem(termId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(termId));
    // NOTE: do not remove from placements immediately here!
    // If the element is unmounted during onDragStart, HTML5 drag ends abruptly
    // and onDragEnd will never fire, leaving it stuck in dragging state.
  };

  const onDragEnd = () => {
    dragSourceSlotRef.current = null;
    setDragItem(null);
    setHoveredSlot(null);
  };

  const onDragOver = (e, defId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredSlot(defId);
  };

  const onDragLeave = (defId) => {
    if (hoveredSlot === defId) setHoveredSlot(null);
  };

  const onDrop = (e, defId) => {
    e.preventDefault();
    const termId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    placeTerm(termId, defId);
  };

  // ── Touch Drag & Drop ─────────────────────────────────────
  const onTouchStart = (e, termId) => {
    ensureAudio();
    const touch = e.touches[0];
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    
    // Create a floating clone
    const clone = el.cloneNode(true);
    clone.style.cssText = `
      position:fixed; z-index:999; pointer-events:none;
      width:${rect.width}px; left:${touch.clientX - rect.width/2}px;
      top:${touch.clientY - 30}px; opacity:0.9;
      transform:scale(1.05) rotate(-2deg);
      transition:none;
    `;
    clone.className = el.className;
    document.body.appendChild(clone);
    
    touchRef.current = { active: true, termId, clone, startX: touch.clientX, startY: touch.clientY };
    setDragItem(termId);
  };

  const onTouchMove = useCallback((e) => {
    if (!touchRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const clone = touchRef.current.clone;
    if (clone) {
      clone.style.left = `${touch.clientX - clone.offsetWidth/2}px`;
      clone.style.top = `${touch.clientY - 30}px`;
    }
    // Detect which slot we're over
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = el?.closest('[data-slot-id]');
    setHoveredSlot(slot ? parseInt(slot.dataset.slotId, 10) : null);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchRef.current.active) return;
    const { termId, clone } = touchRef.current;
    if (clone) clone.remove();
    
    if (hoveredSlot !== null) {
      placeTerm(termId, hoveredSlot);
    }
    
    touchRef.current = { active: false, termId: null, clone: null };
    setDragItem(null);
    setHoveredSlot(null);
  }, [hoveredSlot]);

  useEffect(() => {
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchMove, onTouchEnd]);

  // ── Place a term in a slot ─────────────────────────────────
  const placeTerm = (termId, defId) => {
    sfx(audioRef.current, 'drop');
    
    setPlacements(prev => {
      const next = { ...prev };
      // If this slot already has a term, return it to tray
      const prevTermInSlot = next[defId];
      if (prevTermInSlot !== undefined) {
        setAvailableTerms(at => [...at, prevTermInSlot]);
      }
      // Remove this term from any previous slot
      for (const [k, v] of Object.entries(next)) {
        if (v === termId) {
          delete next[k];
        }
      }
      next[defId] = termId;
      return next;
    });
    
    setAvailableTerms(at => at.filter(id => id !== termId));
    setDragItem(null);
    setHoveredSlot(null);
  };

  // ── Remove from slot ──────────────────────────────────────
  const removeFromSlot = (defId) => {
    if (phase !== 'playing') return;
    const termId = placements[defId];
    if (termId === undefined) return;
    setPlacements(prev => { const n = { ...prev }; delete n[defId]; return n; });
    setAvailableTerms(at => [...at, termId]);
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = () => {
    clearInterval(timerRef.current);
    ensureAudio();
    
    const res = {};
    let correct = 0;
    
    shuffledDefs.forEach(def => {
      const placed = placements[def.id];
      if (placed === def.id) {
        res[def.id] = 'correct';
        correct++;
      } else {
        res[def.id] = 'wrong';
      }
    });
    
    setResults(res);
    setPhase('checking');
    
    if (correct === total) {
      sfx(audioRef.current, 'complete');
      setTimeout(() => {
        setPhase('result');
        setScore(prev => prev + Math.max(0, Math.round(1000 - timer * 5 + correct * 100)));
        if (containerRef.current) spawnConfetti(containerRef.current);
      }, 1500);
    } else {
      sfx(audioRef.current, 'wrong');
      // Show results briefly, then allow retry
      setTimeout(() => {
        // Return wrong answers to tray
        const newPlacements = {};
        shuffledDefs.forEach(def => {
          if (res[def.id] === 'correct') {
            newPlacements[def.id] = placements[def.id];
          } else {
            const termId = placements[def.id];
            if (termId !== undefined) {
              setAvailableTerms(at => [...at, termId]);
            }
          }
        });
        setPlacements(newPlacements);
        setResults({});
        setPhase('playing');
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      }, 1800);
    }
  };

  // ── Reset ──────────────────────────────────────────────────
  const handleReset = () => {
    clearInterval(timerRef.current);
    setCurrentRound(0);
    setAvailableTerms(shuffledTerms.map(t => t.id));
    setPlacements({});
    setResults({});
    setPhase('playing');
    setTimer(0);
    setScore(0);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  // ── Next Round ──────────────────────────────────────────────
  const handleNextRound = () => {
    clearInterval(timerRef.current);
    setCurrentRound(r => r + 1);
    // Note: UseEffects will trigger re-calculation of shuffledTerms based on the new round
  };

  // ── Helpers ────────────────────────────────────────────────
  const getTermById = (id) => shuffledTerms.find(t => t.id === id) || pairs.find(p => p.id === id);
  const allPlaced = Object.keys(placements).length === total;

  // ── Empty guard ────────────────────────────────────────────
  if (!pairs.length) {
    return (
      <div className={styles.container}>
        <div className={styles.bgTheme} />
        <div className={styles.empty}>
          <h2>Chưa có nội dung</h2>
          <p>Thêm cặp từ vựng — định nghĩa để bắt đầu.</p>
        </div>
      </div>
    );
  }

  // ── Result screen ──────────────────────────────────────────
  if (phase === 'result') {
    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.bgTheme} />
        <div className={styles.resultScreen}>
          <div className={styles.resultStar}>★</div>
          <h2>Hoàn thành!</h2>
          <div className={styles.resultStats}>
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{formatTime(timer)}</span>
              <span className={styles.statLabel}>Thời gian</span>
            </div>
            <div className={styles.resultDivider} />
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{total}/{total}</span>
              <span className={styles.statLabel}>Đúng</span>
            </div>
            <div className={styles.resultDivider} />
            <div className={styles.resultStat}>
              <span className={styles.statNumber}>{score}</span>
              <span className={styles.statLabel}>Điểm</span>
            </div>
          </div>
          <div className={styles.resultBtns}>
            {!isLastRound ? (
              <button className={styles.btnPrimary} onClick={handleNextRound}>Vòng kế tiếp</button>
            ) : (
              <button className={styles.btnPrimary} onClick={handleReset}>Chơi lại</button>
            )}
            {onFinish && isLastRound && <button className={styles.btnSecondary} onClick={() => onFinish(score)}>Lưu KQ & Thoát</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.bgTheme} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.timerBlock}>
          <span className={styles.timerDot} />
          <span className={styles.timerValue}>{formatTime(timer)}</span>
        </div>
        <h1 className={styles.gameTitle}>{activity?.title || 'Match Up'} {items.length > 1 ? `(Vòng ${currentRound + 1}/${items.length})` : ''}</h1>
        <div className={styles.headerRight}>
          <span className={styles.matchCount}>
            {Object.values(results).filter(r => r === 'correct').length}/{total}
          </span>
          <button className={styles.resetBtn} onClick={handleReset}>Làm lại</button>
        </div>
      </header>

      {/* Game Board */}
      <main className={styles.board}>
        {/* LEFT: Term Tray — also a drop target to return cards */}
        <div
          className={styles.termTray}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={e => {
            e.preventDefault();
            const termId = parseInt(e.dataTransfer.getData('text/plain'), 10);
            // Return to tray (remove from any slot)
            setPlacements(prev => {
              const n = { ...prev };
              for (const [k, v] of Object.entries(n)) { if (v === termId) delete n[k]; }
              return n;
            });
            if (!availableTerms.includes(termId)) setAvailableTerms(at => [...at, termId]);
            setDragItem(null);
            setHoveredSlot(null);
          }}
        >
          {shuffledTerms.map(t => {
            const placed = !availableTerms.includes(t.id);
            if (placed) return <div key={t.id} className={styles.termGhost} />;
            return (
              <div
                key={t.id}
                className={`${styles.termCard} ${dragItem === t.id ? styles.termDragging : ''}`}
                style={{ '--card-from': t.color[0], '--card-to': t.color[1] }}
                draggable
                onDragStart={e => onDragStart(e, t.id)}
                onDragEnd={onDragEnd}
                onTouchStart={e => onTouchStart(e, t.id)}
              >
                <span className={styles.termText}>{t.term}</span>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Definition rows with drop slots */}
        <div className={styles.defColumn}>
          {shuffledDefs.map(def => {
            const placedTermId = placements[def.id];
            const termData = placedTermId !== undefined ? getTermById(placedTermId) : null;
            const status = results[def.id]; // 'correct' | 'wrong' | undefined

            return (
              <div key={def.id} className={styles.defRow}>
                {/* Drop zone */}
                <div
                  className={`${styles.dropSlot} 
                    ${hoveredSlot === def.id ? styles.slotHover : ''} 
                    ${status === 'correct' ? styles.slotCorrect : ''} 
                    ${status === 'wrong' ? styles.slotWrong : ''}
                    ${termData ? styles.slotFilled : ''}
                  `}
                  data-slot-id={def.id}
                  onDragOver={e => onDragOver(e, def.id)}
                  onDragLeave={() => onDragLeave(def.id)}
                  onDrop={e => onDrop(e, def.id)}
                  onClick={() => removeFromSlot(def.id)}
                >
                  {termData ? (
                    <div
                      className={`${styles.placedTerm} ${dragItem === termData.id ? styles.termDragging : ''}`}
                      style={{ '--card-from': termData.color[0], '--card-to': termData.color[1] }}
                      draggable={phase === 'playing'}
                      onDragStart={e => onPlacedDragStart(e, termData.id, def.id)}
                      onDragEnd={onDragEnd}
                      onTouchStart={e => { if (phase === 'playing') { removeFromSlot(def.id); onTouchStart(e, termData.id); } }}
                    >
                      <span>{termData.term}</span>
                    </div>
                  ) : (
                    <span className={styles.slotPlaceholder}></span>
                  )}
                </div>
                
                {/* Definition text */}
                <div className={`${styles.defText} ${status === 'correct' ? styles.defCorrect : ''} ${status === 'wrong' ? styles.defWrong : ''}`}>
                  {def.definition}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <button
          className={`${styles.submitBtn} ${allPlaced ? styles.submitReady : ''}`}
          onClick={handleSubmit}
          disabled={!allPlaced || phase === 'checking'}
        >
          {phase === 'checking' ? 'Đang kiểm tra...' : 'Nộp bài'}
        </button>
      </footer>
    </div>
  );
}
