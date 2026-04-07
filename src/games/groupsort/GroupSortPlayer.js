'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CountdownScreen, GameTopBar, ResultScreen } from '@/components/GameShell';
import { getSoundManager } from '@/lib/sounds';
import styles from './GroupSortPlayer.module.css';

export default function GroupSortPlayer({ items, activity, playerName, gameMode = 'batch' }) {
  // 1. GAME STATES
  const [phase, setPhase] = useState('countdown'); // countdown, playing, checking, result
  const [countdownNum, setCountdownNum] = useState(3);
  const [score, setScore] = useState(0);
  
  // 2. DATA PARSING
  const columns = useMemo(() => {
    return items.map((it, idx) => {
      const opts = Array.isArray(it.options) ? it.options : [];
      let valids = [];
      let invalids = [];
      opts.forEach(opt => {
        if (!opt || typeof opt === 'string') return; // fallback safely
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

  const maxTime = items[0]?.time_limit || 60;
  
  const [placements, setPlacements] = useState({}); // { pieceId: colId | null }
  const [placementHistory, setPlacementHistory] = useState([{}]);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [draggedPieceId, setDraggedPieceId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  
  // Feedback states
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wrongPieceIds, setWrongPieceIds] = useState([]); // Array of piece IDs that are wrongly placed
  const [lockedPieceIds, setLockedPieceIds] = useState([]); // Array of piece IDs correctly placed and locked
  
  // Instant mode survival states
  const [failedLog, setFailedLog] = useState({}); // { pieceId: count }
  const [destroyedPieceIds, setDestroyedPieceIds] = useState([]);
  const [purgedPieceIds, setPurgedPieceIds] = useState([]); // Completely removed from DOM LG after animation

  // Audio setup
  useEffect(() => {
    if (phase === 'countdown') {
      getSoundManager().countdownBeep();
      const timer = setInterval(() => {
        setCountdownNum(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPhase('playing');
            getSoundManager().startMusic('calm');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, maxTime]);

  // Main Timer (Removed per user request for untimed, stress-free sorting)

  // Instant Check Win Hook
  useEffect(() => {
    if (gameMode !== 'instant' || phase !== 'playing') return;
    const totalResolved = lockedPieceIds.length + purgedPieceIds.length;
    if (totalResolved > 0 && totalResolved === allPieces.length) {
      getSoundManager().correct();
      setIsCorrect(true);
      setShowFeedback(true);
      setScore(Math.round((lockedPieceIds.length / allPieces.length) * 100)); // Dynamic score based on survivors
      setTimeout(() => setPhase('result'), 2500);
    }
  }, [lockedPieceIds.length, purgedPieceIds.length, phase, gameMode, allPieces.length]);

  // 3. INTERACTION HANDLERS
  const evaluateInstantMove = (pieceId, colId) => {
    const p = allPieces.find(x => x.id === pieceId);
    if (!p) return;

    setPlacements(prev => ({ ...prev, [pieceId]: colId }));
    setSelectedPieceId(null);

    const isCorrectMove = !p.isWrongItem && colId === p.correctColId;

    if (isCorrectMove) {
      getSoundManager().bonus();
      setLockedPieceIds(prev => [...prev, pieceId]);
    } else {
      const failCount = (failedLog[pieceId] || 0) + 1;
      setFailedLog(prev => ({ ...prev, [pieceId]: failCount }));
      setWrongPieceIds(prev => [...prev, pieceId]);
      getSoundManager().wrong();

      setTimeout(() => {
        setWrongPieceIds(prev => prev.filter(id => id !== pieceId));
        setPlacements(prev => {
          const next = { ...prev };
          delete next[pieceId]; // refund
          return next;
        });

        if (failCount >= 2) {
          // Destroz
          setTimeout(() => {
             getSoundManager().explode(); // Massive cue for destruction
             setDestroyedPieceIds(prev => [...prev, pieceId]); // Add class to trigger CSS explode
             setTimeout(() => {
               setPurgedPieceIds(prev => [...prev, pieceId]); // Fully remove from the DOM
             }, 800);
          }, 100);
        }
      }, 1000);
    }
  };

  const movePiece = (pieceId, colId) => {
    if (showFeedback || phase !== 'playing' || lockedPieceIds.includes(pieceId) || destroyedPieceIds.includes(pieceId)) return;
    getSoundManager().click();

    if (gameMode === 'instant' && colId) {
      evaluateInstantMove(pieceId, colId);
      return;
    }

    setPlacements(prev => {
      const next = { ...prev, [pieceId]: colId };
      if (!colId) delete next[pieceId]; // Clean up when returning to bank
      setPlacementHistory(history => [...history, next]);
      return next;
    });
    setSelectedPieceId(null);
  };

  const handleUndo = () => {
    if (showFeedback || phase !== 'playing' || placementHistory.length <= 1) return;
    getSoundManager().swipe();
    setPlacementHistory(prev => {
      const newHistory = prev.slice(0, -1);
      setPlacements(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  };

  const handleReset = () => {
    if (showFeedback || phase !== 'playing' || Object.keys(placements).length === 0) return;
    getSoundManager().swipe();
    setPlacements({});
    setPlacementHistory([{}]);
    setLockedPieceIds([]);
  };

  const checkAnswers = () => {
    if (showFeedback || phase !== 'playing') return;
    
    let allCorrect = true;
    let wrongIds = [];
    let correctIds = [];

    allPieces.forEach(p => {
      const userCol = placements[p.id];
      if (!userCol) return; // Skip unplaced

      if (p.isWrongItem) {
        allCorrect = false;
        wrongIds.push(p.id);
      } else {
        if (userCol !== p.correctColId) {
          allCorrect = false;
          wrongIds.push(p.id);
        } else {
          correctIds.push(p.id);
        }
      }
    });

    const isWin = allCorrect && allPieces.filter(p => !p.isWrongItem).every(p => placements[p.id] === p.correctColId);

    if (isWin) {
      getSoundManager().correct();
      setIsCorrect(true);
      setShowFeedback(true);
      setScore(100); 
      setTimeout(() => {
        setPhase('result');
      }, 2500);
    } else {
      if (wrongIds.length > 0) getSoundManager().wrong();
      else if (correctIds.length > 0) getSoundManager().bonus();
      setIsCorrect(false);
      setWrongPieceIds(wrongIds);
      setLockedPieceIds(prev => Array.from(new Set([...prev, ...correctIds])));
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        setWrongPieceIds([]);
        // Auto-refund wrong pieces
        setPlacements(prev => {
          const next = { ...prev };
          wrongIds.forEach(id => { delete next[id]; });
          setPlacementHistory(ph => [...ph, next]);
          return next;
        });
      }, 1500);
    }
  };

  if (phase === 'countdown') {
    return <CountdownScreen num={countdownNum} label="Phân Nhóm" emoji="🗂️" />;
  }

  if (phase === 'result') {
    return <ResultScreen playerName={playerName} score={score} answers={[]} items={items} title="Kết Quả Phân Nhóm" />;
  }

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={`${columns.length} nhóm`} playerName={playerName} score={score} streak={0} />

      <div className={styles.mainLayout}>
        {/* LEFT PANE: COLUMNS */}
        <div className={styles.leftPane}>
          <div className={styles.questionArea}>
            <p className={styles.instruction}>Kéo thả các mục vào đúng nhóm tương ứng:</p>
          </div>

          <div className={styles.boardContainer}>
        {/* COLUMNS AREA */}
        <div className={styles.columnsGrid}>
          {columns.map((col, idx) => (
            <div 
              key={col.id} 
              className={`${styles.columnDropzone} ${styles[`colColor${idx % 8}`]} ${dragOverColId === col.id ? styles.dropzoneActive : ''}`}
              onClick={() => {
                if (selectedPieceId) movePiece(selectedPieceId, col.id);
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColId !== col.id) setDragOverColId(col.id); }}
              onDragLeave={() => setDragOverColId(null)}
              onDrop={(e) => { e.preventDefault(); setDragOverColId(null); if (draggedPieceId) movePiece(draggedPieceId, col.id); }}
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
                      draggable={!showFeedback && !lockedPieceIds.includes(p.id)}
                      onDragStart={(e) => { 
                        if (lockedPieceIds.includes(p.id)) return e.preventDefault();
                        setDraggedPieceId(p.id); e.stopPropagation(); 
                      }}
                      onDragEnd={() => setDraggedPieceId(null)}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (lockedPieceIds.includes(p.id)) return;
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

        {/* RIGHT PANE: WORD BANK & ACTIONS */}
        <div className={styles.rightPane}>
          {/* WORD BANK AREA */}
          <div className={styles.wordBankContainer}>
        <div className={styles.wordBankHeader}>Kho Từ Kéo Thả (Trả từ sai về đây)</div>
        <div 
          className={styles.wordBank}
          onClick={() => {
            if (selectedPieceId) movePiece(selectedPieceId, null);
          }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => { e.preventDefault(); if (draggedPieceId) movePiece(draggedPieceId, null); }}
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
                draggable={!showFeedback}
                onDragStart={(e) => { setDraggedPieceId(p.id); e.stopPropagation(); }}
                onDragEnd={() => setDraggedPieceId(null)}
                onClick={(e) => { e.stopPropagation(); setSelectedPieceId(selectedPieceId === p.id ? null : p.id); }}
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

      {/* ACTIONS */}
      {gameMode === 'batch' && (
      <div className={styles.actionRow}>
        <div className={styles.secActions}>
          <button className={styles.undoBtn} onClick={handleUndo} disabled={showFeedback || phase !== 'playing' || placementHistory.length <= 1}>
             Hoàn Tác
          </button>
          <button className={styles.resetBtn} onClick={handleReset} disabled={showFeedback || phase !== 'playing' || Object.keys(placements).length === 0}>
             Làm Lại
          </button>
        </div>
        <button className={styles.checkBtn} onClick={checkAnswers} disabled={showFeedback}>
          ✓ KIỂM TRA ĐÁP ÁN
        </button>
      </div>
      )}
      
          {showFeedback && (
            <div className={`${styles.feedbackMsg} ${isCorrect ? styles.fbMsgCorrect : styles.fbMsgWrong}`}>
              {isCorrect ? '✨ Hoàn hảo! Bạn đã phân nhóm chính xác!' : '❌ Có vài từ chưa đúng chỗ hoặc thuộc nhóm sai! Hãy thử lại!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
