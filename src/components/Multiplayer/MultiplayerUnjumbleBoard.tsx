'use client';

import { useState, useEffect } from 'react';
import styles from '@/games/unjumble/UnjumblePlayer.module.css';

export default function MultiplayerUnjumbleBoard({ 
  item, 
  handleAnswer, 
  answeredThisQ, 
  showFeedback,
  isShareScreen
}: any) {
  const [pieces, setPieces] = useState<any[]>([]);
  const [correctOrder, setCorrectOrder] = useState<any[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<any>(null);
  const [selectedPiece, setSelectedPiece] = useState<any>(null);

  // Initialize board when item changes
  useEffect(() => {
    if (!item) return;

    // Detect format (WORDS or LETTERS). Default to WORDS.
    let correct = [];
    if (item.extra_data?.format === 'LETTERS' || (item.term && item.term.length <= 15 && !item.term.includes(' '))) {
      correct = (item.term || '').split('');
    } else {
      correct = (item.term || '').split(/\s+/).filter((w: any) => w.trim());
    }

    // Shuffle pieces
    const shuffled = [...correct];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Avoid identical order
    if (JSON.stringify(shuffled) === JSON.stringify(correct) && shuffled.length > 1) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    setCorrectOrder(correct);
    setPieces(shuffled);
    setSelectedPiece(null);
  }, [item]);

  // Lock interactions if answered or is host/share screen
  const isLocked = answeredThisQ || showFeedback || isShareScreen;

  const swapPieces = (fromIdx: any, toIdx: any) => {
    if (isLocked) return;
    setPieces(prev => {
      const copy = [...prev];
      [copy[fromIdx], copy[toIdx]] = [copy[toIdx], copy[fromIdx]];
      return copy;
    });
  };

  const handlePieceClick = (idx: any) => {
    if (isLocked) return;
    if (selectedPiece === null) {
      setSelectedPiece(idx);
    } else if (selectedPiece === idx) {
      setSelectedPiece(null);
    } else {
      swapPieces(selectedPiece, idx);
      setSelectedPiece(null);
    }
  };

  const submitOrder = () => {
    if (isLocked) return;
    
    // Check correctness
    const isCorrect = JSON.stringify(pieces) === JSON.stringify(correctOrder);
    
    // Call multiplayer handleAnswer (0 = correct, -1 = wrong)
    handleAnswer(isCorrect ? 0 : -1);
  };

  // Determine which class to apply to the board
  const boardClasses = [styles.ruledBoard];
  if (isShareScreen) boardClasses.push(styles.boardHostView); // optional hook if needed

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 16px' }}>
      
      {/* ── Instruction for Players ── */}
      {!isShareScreen && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1rem' }}>
            Kéo thả hoặc nhấn để sắp xếp {correctOrder.length > 0 && correctOrder[0].length === 1 ? 'chữ cái' : 'từ'}:
          </div>
        </div>
      )}

      {/* ── Ruled Board ── */}
      <div className={styles.boardContainer}>
        <div className={boardClasses.join(' ')}>
          {pieces.map((piece, i) => {
            let chipClass = styles.wordChip;
            if (selectedPiece === i) chipClass += ` ${styles.chipSelected}`;
            if (draggedIdx === i) chipClass += ` ${styles.chipDragging}`;

            // Feedback visually happens after they answer
            if (isLocked && showFeedback) {
              const pieceIsCorrectPos = piece === correctOrder[i];
              const overallCorrect = JSON.stringify(pieces) === JSON.stringify(correctOrder);
              
              if (overallCorrect) {
                chipClass += ` ${styles.chipCorrect}`;
              } else {
                chipClass += pieceIsCorrectPos ? ` ${styles.chipCorrect}` : ` ${styles.chipWrong}`;
              }
            }

            return (
              <div 
                key={`piece-${piece}-${i}`} 
                className={chipClass}
                draggable={!isLocked}
                onDragStart={(e) => {
                  if (isLocked) return e.preventDefault();
                  setDraggedIdx(i);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (isLocked) return;
                  e.preventDefault(); 
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  if (isLocked) return;
                  e.preventDefault();
                  if (draggedIdx !== null && draggedIdx !== i) {
                    swapPieces(draggedIdx, i);
                  }
                  setDraggedIdx(null);
                }}
                onDragEnd={() => setDraggedIdx(null)}
                onClick={() => handlePieceClick(i)}
              >
                {piece}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className={styles.actionRow} style={{ marginTop: 'auto', paddingBottom: 20 }}>
        {!isShareScreen && !answeredThisQ ? (
          <button className={styles.checkBtn} onClick={submitOrder} disabled={isLocked}>
            GỬI ĐÁP ÁN
          </button>
        ) : (
          <div style={{ height: 48 }}>
            {/* Placeholder to keep layout stable when buttons disappear */}
            {answeredThisQ && !showFeedback && (
              <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 18, marginTop: 10 }}>
                ⏳ Đang chờ người khác...
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
