'use client';

import { useState } from 'react';
import { useOrderingEngine } from '@/lib/engines/useOrderingEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './UnjumblePlayer.module.css';

export default function UnjumblePlayer({ items, activity, playerName }) {
  const [draggedIdx, setDraggedIdx] = useState(null);

  const engine = useOrderingEngine(items, {
    musicType: 'calm',
    mode: 'words',
    defaultTimeLimit: 40,
    feedbackDelay: 2500, // Slightly longer feedback to let them observe
  });

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Sắp Xếp Câu" emoji="🔤" />;
  }

  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} title="Kết Quả Sắp Xếp" />;
  }

  const item = engine.currentItem;
  if (!item) return null;

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionArea}>
        <TimerBubble timeLeft={engine.timeLeft} />
        <p className={styles.instruction}>Kéo thả các thẻ để sắp xếp lại thành câu đúng:</p>
        <p className={styles.subInstruction}>(Bạn có thể bấm vào từ này rồi bấm vào từ kia để đổi vị trí)</p>
        {item.definition && <p className={styles.hintText}>💡 {item.definition}</p>}
      </div>

      <div className={styles.boardContainer}>
        <div className={styles.ruledBoard}>
          {engine.pieces.map((piece, i) => {
            let chipClass = styles.wordChip;
            if (engine.selectedPiece === i) chipClass += ` ${styles.chipSelected}`;
            if (draggedIdx === i) chipClass += ` ${styles.chipDragging}`;

            if (engine.showFeedback) {
              chipClass += engine.isCorrect 
                ? ` ${styles.chipCorrect}` 
                : (piece === engine.correctOrder[i] ? ` ${styles.chipCorrect}` : ` ${styles.chipWrong}`);
            }

            return (
              <div 
                key={`piece-${piece}-${i}`} 
                className={chipClass}
                draggable={!engine.showFeedback}
                onDragStart={(e) => {
                  setDraggedIdx(i);
                  // Ensure drag image works properly, but minimal visual changes in JS, CSS handles the rest
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault(); // Necessary to allow dropping
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIdx !== null && draggedIdx !== i) {
                    engine.swapPieces(draggedIdx, i);
                  }
                  setDraggedIdx(null);
                }}
                onDragEnd={() => setDraggedIdx(null)}
                onClick={() => engine.selectPiece(i)}
              >
                {piece}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actionRow}>
        {!engine.showFeedback ? (
          <>
            <button className={`${styles.hintBtn} ${engine.hintUsed ? styles.hintUsedBtn : ''}`} onClick={engine.useHint} disabled={engine.hintUsed}>
              💡 Gợi ý {engine.hintUsed ? '(Đã dùng)' : ''}
            </button>
            <button className={styles.checkBtn} onClick={engine.checkOrder}>
              ✓ KIỂM TRA
            </button>
          </>
        ) : (
          <div className={`${styles.feedbackMsg} ${engine.isCorrect ? styles.fbMsgCorrect : styles.fbMsgWrong}`}>
            {engine.isCorrect ? '✨ Tuyệt vời! Bạn đã ghép đúng!' : '❌ Chưa chính xác rồi! Sắp xếp như sau mới đúng nhé:'}
            {!engine.isCorrect && (
               <div className={styles.correctionText}>{engine.correctOrder.join(' ')}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
