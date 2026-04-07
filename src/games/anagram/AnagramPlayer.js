'use client';

import { useOrderingEngine } from '@/lib/engines/useOrderingEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './AnagramPlayer.module.css';

export default function AnagramPlayer({ items, activity, playerName }) {
  const engine = useOrderingEngine(items, {
    musicType: 'calm',
    mode: 'letters',
    defaultTimeLimit: 30,
    feedbackDelay: 2000,
  });

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Xếp Chữ" emoji="🔡" />;
  }

  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} title="Kết Quả Xếp Chữ" />;
  }

  const item = engine.currentItem;
  if (!item) return null;

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionArea}>
        <TimerBubble timeLeft={engine.timeLeft} />
        <p className={styles.instruction}>Sắp xếp các chữ cái thành từ đúng:</p>
        {item.definition && <p className={styles.hint}>💡 {item.definition}</p>}
      </div>

      {/* Answer slots */}
      <div className={styles.slotsRow}>
        {engine.placedPieces.map((letter, i) => (
          <button key={`slot-${i}`}
            className={`${styles.letterSlot} ${styles.slotFilled} ${engine.showFeedback ? (letter === engine.correctOrder[i] ? styles.slotCorrect : styles.slotWrong) : ''}`}
            onClick={() => engine.removePlaced(i)}
            disabled={engine.showFeedback}
          >
            {letter}
          </button>
        ))}
        {/* Empty slots for remaining */}
        {Array.from({ length: engine.pieces.length }, (_, i) => (
          <div key={`empty-${i}`} className={styles.letterSlot}>
            <span className={styles.slotPlaceholder}>?</span>
          </div>
        ))}
      </div>

      {/* Available letters */}
      <div className={styles.lettersRow}>
        {engine.pieces.map((letter, i) => (
          <button key={`letter-${i}`}
            className={styles.letterBtn}
            onClick={() => engine.placePiece(i)}
            disabled={engine.showFeedback}
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {engine.showFeedback && (
        <div className={`${styles.feedback} ${engine.isCorrect ? styles.fbOk : styles.fbBad}`}>
          {engine.isCorrect ? '✅ Chính xác!' : `❌ Đáp án: ${engine.correctOrder.join('')}`}
        </div>
      )}

      {!engine.showFeedback && (
        <div className={styles.actionRow}>
          <button className={`${styles.hintBtn} ${engine.hintUsed ? styles.hintUsedBtn : ''}`} onClick={engine.useHint} disabled={engine.hintUsed}>
            💡 Gợi ý
          </button>
          <button className={styles.checkBtn} onClick={engine.checkOrder} disabled={engine.pieces.length > 0}>
            ✓ Kiểm Tra
          </button>
        </div>
      )}
    </div>
  );
}
