'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styles from '@/games/groupsort/GroupSortPlayer.module.css';

// Using local version of sound manager if available, else a dummy so we don't crash
const dummySoundManager = { click:()=>{}, correct:()=>{}, wrong:()=>{}, swipe:()=>{}, bonus:()=>{}, explode:()=>{} };

export default function MultiplayerGroupSortBoard({ 
  items, 
  mp,
  timeLeft,
  isSpectatingHost, 
  isShareScreen
}) {
  // Use actual sound manager dynamically to avoiding SSR issues
  const [sm, setSm] = useState(dummySoundManager);
  useEffect(() => {
    import('@/lib/sounds').then(module => setSm(module.getSoundManager()));
  }, []);

  const [score, setScore] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const scoreRef = useRef(0);

  // Parse all columns and words once
  const columns = useMemo(() => {
    return items.map((it, idx) => {
      const opts = Array.isArray(it.options) ? it.options : [];
      let valids = [];
      let invalids = [];
      opts.forEach(opt => {
        if (!opt || typeof opt === 'string') return;
        if (opt.text && opt.text.trim()) {
          if (opt.isCorrect) valids.push(opt.text.trim());
          else invalids.push(opt.text.trim());
        }
      });
      return { id: `col_${idx}`, title: it.term, valids, invalids };
    });
  }, [items]);

  const allPieces = useMemo(() => {
    let rawPieces = [];
    columns.forEach(col => {
      col.valids.forEach(txt => {
        rawPieces.push({ id: `p_${Math.random().toString(36).substring(2, 9)}`, text: txt, correctColId: col.id, isWrongItem: false });
      });
      col.invalids.forEach(txt => {
        rawPieces.push({ id: `p_${Math.random().toString(36).substring(2, 9)}`, text: txt, correctColId: null, isWrongItem: true });
      });
    });
    // Shuffle
    return rawPieces.sort(() => Math.random() - 0.5);
  }, [columns]);

  const [placements, setPlacements] = useState({});
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [draggedPieceId, setDraggedPieceId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);

  // Group Sort Multiplayer Rules
  const [failedLog, setFailedLog] = useState({});
  const [destroyedPieceIds, setDestroyedPieceIds] = useState([]);
  const [purgedPieceIds, setPurgedPieceIds] = useState([]);
  const [lockedPieceIds, setLockedPieceIds] = useState([]);
  const [wrongPieceIds, setWrongPieceIds] = useState([]);

  // Auto-submit final score when time ACTUALLY expires (not on initial -1)
  const timerStarted = timeLeft > 0;
  const timerExpired = timerStarted && timeLeft <= 0;
  const [wasTimerStarted, setWasTimerStarted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) setWasTimerStarted(true);
  }, [timeLeft]);

  useEffect(() => {
    if (wasTimerStarted && timeLeft <= 0 && !hasSubmitted && !isSpectatingHost) {
      setHasSubmitted(true);
      const finalScore = scoreRef.current;
      // Submit final accumulated score
      if (mp?.submitAnswer) {
        mp.submitAnswer(0, finalScore > 0, items[0], items.length, finalScore);
      }
    }
  }, [timeLeft, hasSubmitted, isSpectatingHost, mp, items, wasTimerStarted]);

  const isLocked = hasSubmitted || isSpectatingHost || (wasTimerStarted && timeLeft <= 0);

  const movePiece = (pieceId, colId) => {
    if (isLocked || lockedPieceIds.includes(pieceId) || destroyedPieceIds.includes(pieceId)) return;
    sm.click();

    const p = allPieces.find(x => x.id === pieceId);
    if (!p) return;

    if (!colId) {
      // Return to bank (if not locked)
      setPlacements(prev => {
        const next = { ...prev };
        delete next[pieceId];
        return next;
      });
      setSelectedPieceId(null);
      return;
    }

    // Evaluate immediate placement
    setPlacements(prev => ({ ...prev, [pieceId]: colId }));
    setSelectedPieceId(null);

    const isCorrectMove = !p.isWrongItem && colId === p.correctColId;

    if (isCorrectMove) {
      sm.bonus();
      setLockedPieceIds(prev => [...prev, pieceId]);
      const newScore = scoreRef.current + 100;
      scoreRef.current = newScore;
      setScore(newScore);
    } else {
      const failCount = (failedLog[pieceId] || 0) + 1;
      setFailedLog(prev => ({ ...prev, [pieceId]: failCount }));
      setWrongPieceIds(prev => [...prev, pieceId]);
      sm.wrong();

      setTimeout(() => {
        setWrongPieceIds(prev => prev.filter(id => id !== pieceId));
        setPlacements(prev => {
          const next = { ...prev };
          delete next[pieceId]; 
          return next;
        });

        if (failCount >= 2) {
          setTimeout(() => {
             sm.explode();
             setDestroyedPieceIds(prev => [...prev, pieceId]);
             setTimeout(() => {
               setPurgedPieceIds(prev => [...prev, pieceId]);
             }, 800);
          }, 100);
        }
      }, 800);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 400, flex: 1 }}>
      
      {/* LOCAL SCORE COUNTER */}
      {!isShareScreen && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.5)', padding: '8px 24px', borderRadius: 20, color: 'white', fontWeight: 800, fontSize: 24, border: '2px solid rgba(255,255,255,0.2)' }}>
            Điểm Nhóm: <span style={{ color: '#f1c40f' }}>{score}</span>
          </div>
        </div>
      )}

      {!isShareScreen && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
            Kéo các từ vào đúng nhóm (+100 điểm/từ đúng). Kéo sai 2 lần sẽ bị huỷ từ!
          </p>
        </div>
      )}

      <div className={styles.mainLayout} style={{ flex: 1, padding: '0 16px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* LEFT PANE: COLUMNS */}
        <div className={styles.leftPane}>
          <div className={styles.boardContainer}>
            <div className={styles.columnsGrid}>
              {columns.map((col, idx) => (
                <div 
                  key={col.id} 
                  className={`${styles.columnDropzone} ${styles[`colColor${idx % 8}`]} ${dragOverColId === col.id ? styles.dropzoneActive : ''}`}
                  onClick={() => {
                    if (selectedPieceId) movePiece(selectedPieceId, col.id);
                  }}
                  onDragOver={(e) => { 
                    if (isLocked) return;
                    e.preventDefault(); 
                    e.dataTransfer.dropEffect = 'move'; 
                    if (dragOverColId !== col.id) setDragOverColId(col.id); 
                  }}
                  onDragLeave={() => setDragOverColId(null)}
                  onDrop={(e) => { 
                    if (isLocked) return;
                    e.preventDefault(); 
                    setDragOverColId(null); 
                    if (draggedPieceId) movePiece(draggedPieceId, col.id); 
                  }}
                >
                  <div className={styles.columnHeader}>{col.title}</div>
                  <div className={styles.columnBody}>
                    {allPieces.filter(p => placements[p.id] === col.id).length === 0 && (
                      <div className={styles.emptyColumnText}>Kéo vào đây 👇</div>
                    )}
                    {allPieces.filter(p => placements[p.id] === col.id && !purgedPieceIds.includes(p.id)).map(p => {
                      let pClass = styles.wordChip;
                      if (selectedPieceId === p.id) pClass += ` ${styles.chipSelected}`;
                      if (draggedPieceId === p.id) pClass += ` ${styles.chipDragging}`;
                      if (wrongPieceIds.includes(p.id)) pClass += ` ${styles.chipWrong}`;
                      else if (lockedPieceIds.includes(p.id)) pClass += ` ${styles.chipCorrect}`;
                      if (destroyedPieceIds.includes(p.id)) pClass += ` ${styles.chipDestroying}`;
                      else if (failedLog[p.id] === 1 && !lockedPieceIds.includes(p.id)) pClass += ` ${styles.chipCracked}`;

                      return (
                        <div 
                          key={p.id} 
                          className={pClass}
                          style={{ cursor: isLocked ? 'not-allowed' : 'grab' }}
                          draggable={!isLocked && !lockedPieceIds.includes(p.id)}
                          onDragStart={(e) => { 
                            if (isLocked || lockedPieceIds.includes(p.id)) return e.preventDefault();
                            setDraggedPieceId(p.id); e.stopPropagation(); 
                          }}
                          onDragEnd={() => setDraggedPieceId(null)}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isLocked || lockedPieceIds.includes(p.id)) return;
                            setSelectedPieceId(selectedPieceId === p.id ? null : p.id); 
                          }}
                        >
                          {p.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: WORD BANK */}
        <div className={styles.rightPane}>
          <div className={styles.wordBankContainer}>
            <div className={styles.wordBankHeader}>Kho Từ Kéo Thả {isShareScreen ? '(Xem màn hình học sinh)' : ''}</div>
            <div 
              className={styles.wordBank}
              onClick={() => {
                if (selectedPieceId) movePiece(selectedPieceId, null);
              }}
              onDragOver={(e) => { if (!isLocked) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
              onDrop={(e) => { if (!isLocked) { e.preventDefault(); if (draggedPieceId) movePiece(draggedPieceId, null); } }}
            >
              {allPieces.filter(p => !placements[p.id] && !purgedPieceIds.includes(p.id))
                .sort((a,b) => a.text.localeCompare(b.text))
                .map(p => {
                 let pClass = styles.wordChip;
                if (selectedPieceId === p.id) pClass += ` ${styles.chipSelected}`;
                if (draggedPieceId === p.id) pClass += ` ${styles.chipDragging}`;
                if (destroyedPieceIds.includes(p.id)) pClass += ` ${styles.chipDestroying}`;
                else if (failedLog[p.id] === 1) pClass += ` ${styles.chipCracked}`;

                return (
                  <div 
                    key={p.id} 
                    className={pClass}
                    style={{ opacity: isShareScreen ? 0.3 : 1, cursor: isLocked ? 'not-allowed' : 'grab' }}
                    draggable={!isLocked}
                    onDragStart={(e) => { 
                      if (isLocked) return e.preventDefault();
                      setDraggedPieceId(p.id); e.stopPropagation(); 
                    }}
                    onDragEnd={() => setDraggedPieceId(null)}
                    onClick={(e) => { 
                      if (isLocked) return;
                      e.stopPropagation(); 
                      setSelectedPieceId(selectedPieceId === p.id ? null : p.id); 
                    }}
                  >
                     {p.text}
                  </div>
                );
              })}
              {allPieces.filter(p => !placements[p.id]).length === 0 && (
                <p className={styles.emptyBankText}>Tất cả từ đã được phân loại!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
