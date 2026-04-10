'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styles from '@/games/matchup/MatchUpPlayer.module.css';

// ── Shuffle ──────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Dummy Sound Manager (To avoid SSR issues) ────────────────
const dummySoundManager = { click:()=>{}, correct:()=>{}, wrong:()=>{}, swipe:()=>{}, bonus:()=>{}, explode:()=>{} };

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
export default function MultiplayerMatchupBoard({ items, mp, timeLeft, isSpectatingHost, isShareScreen }) {
  // Use actual sound manager dynamically to avoid SSR issues
  const [sm, setSm] = useState(dummySoundManager);
  useEffect(() => {
    import('@/lib/sounds').then(module => setSm(module.getSoundManager()));
  }, []);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const scoreRef = useRef(0);
  const containerRef = useRef(null);

  // Parse pairs from content items
  const pairs = useMemo(() => {
    // Rely on ActiveMultiplayerRoom's normalization guaranteeing items[x].pairs exists
    const roundItem = items[mp.currentQuestion] || { pairs: [] };
    const pairList = roundItem.pairs || [];

    return pairList
      .filter(it => (it.term || it.question) && (it.definition || ''))
      .map((it, idx) => ({
        id: idx,
        term: it.term || it.question || '',
        definition: it.definition || '',
        color: CARD_COLORS[idx % CARD_COLORS.length],
      }));
  }, [items, mp.currentQuestion]);

  const total = pairs.length;

  // Shuffled terms (the draggable side)
  const shuffledTerms = useMemo(() => shuffle(pairs.map(p => ({ id: p.id, term: p.term, color: p.color }))), [pairs]);
  // Shuffled definitions (the drop target side)
  const shuffledDefs = useMemo(() => shuffle(pairs.map(p => ({ id: p.id, definition: p.definition }))), [pairs]);

  // State
  const [placements, setPlacements] = useState({});     // { defId: termId }
  const [availableTerms, setAvailableTerms] = useState([]); // term ids still in tray
  const [dragItem, setDragItem] = useState(null);        // currently dragging term id
  const [hoveredSlot, setHoveredSlot] = useState(null);  // slot being hovered

  // Track which slot a drag started from (for placed-term drags)
  const dragSourceSlotRef = useRef(null);

  // Touch DnD state
  const touchRef = useRef({ active: false, termId: null, clone: null, startX: 0, startY: 0 });

  // Init
  useEffect(() => {
    setAvailableTerms(shuffledTerms.map(t => t.id));
    setPlacements({});
  }, [shuffledTerms]);

  // Auto-submit final score when time ACTUALLY expires (not on initial -1)
  const timerStarted = timeLeft > 0;
  const [wasTimerStarted, setWasTimerStarted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) setWasTimerStarted(true);
  }, [timeLeft]);

  const calculateFinalScore = useCallback(() => {
    let correct = 0;
    shuffledDefs.forEach(def => {
      const placed = placements[def.id];
      if (placed === def.id) {
        correct++;
      }
    });

    // Score based on single player logic: 100 points per correct answer + time bonus
    // Max single player was ~1000. Time bonus is disabled/standardized for multiplayer auto flow
    // So we just give 1000 for perfect, scaled down for mistakes. 
    // Wait, let's keep consistent with GroupSort where each action earns points immediately OR just calculate here
    if (total === 0) return 0;
    return Math.max(0, Math.round((1000 * correct) / total));
  }, [placements, shuffledDefs, total]);

  const forceSubmitAnswer = useCallback(() => {
    if (hasSubmitted || isSpectatingHost) return;
    setHasSubmitted(true);
    const finalScore = calculateFinalScore();
    if (mp?.submitAnswer) {
      mp.submitAnswer(0, finalScore > 0, items[0], items.length, finalScore);
    }
  }, [calculateFinalScore, hasSubmitted, isSpectatingHost, mp, items]);

  useEffect(() => {
    if (wasTimerStarted && timeLeft <= 0 && !hasSubmitted) {
      if (!isSpectatingHost && !isShareScreen) {
        forceSubmitAnswer();
      } else {
        // Host screen: Auto-reveal correct answers
        setHasSubmitted(true);
        const correctPlacements = {};
        shuffledDefs.forEach(def => {
          correctPlacements[def.id] = def.id;
        });
        setPlacements(correctPlacements);
        setAvailableTerms([]);
      }
    }
  }, [timeLeft, hasSubmitted, isSpectatingHost, isShareScreen, wasTimerStarted, forceSubmitAnswer, shuffledDefs]);

  const isLocked = hasSubmitted || isSpectatingHost || (wasTimerStarted && timeLeft <= 0) || isShareScreen;
  const allPlaced = Object.keys(placements).length === total;

  // ── Drag & Drop (Desktop) ─────────────────────────────────
  const onDragStart = (e, termId) => {
    if (isLocked) { e.preventDefault(); return; }
    dragSourceSlotRef.current = null; // dragging from tray
    setDragItem(termId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(termId));
  };

  // Drag start from a PLACED term inside a slot
  const onPlacedDragStart = (e, termId, fromDefId) => {
    if (isLocked) { e.preventDefault(); return; }
    dragSourceSlotRef.current = fromDefId; // remember source slot
    setDragItem(termId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(termId));
  };

  const onDragEnd = () => {
    dragSourceSlotRef.current = null;
    setDragItem(null);
    setHoveredSlot(null);
  };

  const onDragOver = (e, defId) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredSlot(defId);
  };

  const onDragLeave = (defId) => {
    if (isLocked) return;
    if (hoveredSlot === defId) setHoveredSlot(null);
  };

  const onDrop = (e, defId) => {
    if (isLocked) return;
    e.preventDefault();
    const termId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    placeTerm(termId, defId);
  };

  // ── Touch Drag & Drop ─────────────────────────────────────
  const onTouchStart = (e, termId) => {
    if (isLocked) return;
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
    sm.click();
    
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
    if (isLocked) return;
    const termId = placements[defId];
    if (termId === undefined) return;
    setPlacements(prev => { const n = { ...prev }; delete n[defId]; return n; });
    setAvailableTerms(at => [...at, termId]);
  };

  // ── Helpers ────────────────────────────────────────────────
  const getTermById = (id) => shuffledTerms.find(t => t.id === id) || pairs.find(p => p.id === id);


  // ── Empty guard ────────────────────────────────────────────
  if (!pairs.length) {
    return (
      <div className={styles.container} style={{minHeight: 400}}>
        <div className={styles.empty}>
          <h2>Chưa có nội dung</h2>
          <p>Thêm cặp từ vựng — định nghĩa để bắt đầu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ height: '100%', minHeight: 400, flex: 1, padding: '0 16px', maxWidth: 1200, margin: '0 auto', width: '100%' }} ref={containerRef}>
      
      {!isShareScreen && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
            Kéo các từ vào đúng khung hình chữ nhật chứa định nghĩa bên dưới.
          </p>
        </div>
      )}

      {/* Game Board */}
      <main className={styles.board}>
        {/* LEFT: Term Tray — also a drop target to return cards */}
        <div
          className={styles.termTray}
          onDragOver={e => { if(isLocked) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={e => {
            if (isLocked) return;
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
                style={{ '--card-from': t.color[0], '--card-to': t.color[1], cursor: isLocked ? 'not-allowed' : 'grab' }}
                draggable={!isLocked}
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
            // Reveal correct/wrong status visually if the round is over
            const status = hasSubmitted ? (placedTermId === def.id ? 'correct' : 'wrong') : undefined;

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
                      style={{ '--card-from': termData.color[0], '--card-to': termData.color[1], cursor: isLocked ? 'not-allowed' : 'grab' }}
                      draggable={!isLocked}
                      onDragStart={e => onPlacedDragStart(e, termData.id, def.id)}
                      onDragEnd={onDragEnd}
                      onTouchStart={e => { if (!isLocked) { removeFromSlot(def.id); onTouchStart(e, termData.id); } }}
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
      {!isShareScreen && (
        <footer className={styles.footer} style={{ background: 'transparent', borderTop: 'none', pb: 20 }}>
          <button
            className={`${styles.submitBtn} ${allPlaced && !hasSubmitted ? styles.submitReady : ''}`}
            onClick={forceSubmitAnswer}
            disabled={(!allPlaced && !isLocked) || hasSubmitted || isSpectatingHost}
            style={{ margin: '0 auto' }}
          >
            {hasSubmitted ? 'Đã Nộp Bài' : 'Nộp bài'}
          </button>
        </footer>
      )}
    </div>
  );
}
