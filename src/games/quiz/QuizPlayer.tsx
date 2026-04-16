'use client';

import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './QuizPlayer.module.css';

export default function QuizPlayer({ items, activity, playerName }: any) {
  const engine = useSelectionEngine(items, {
    musicType: 'quiz',
    scoringPolicy: 'time-speed',
    defaultTimeLimit: 20,
    feedbackDelay: 1800,
    enableTTS: activity?.settings?.read_question || false,
  });

  // ── COUNTDOWN ──────────────────────────────────────────
  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Trắc Nghiệm" emoji="❓" />;
  }

  // ── RESULT ─────────────────────────────────────────────
  if (engine.phase === 'result') {
    return (
      <ResultScreen
        playerName={playerName}
        score={engine.score}
        answers={engine.answers}
        items={items}
        title="Kết Quả"
      />
    );
  }

  // ── PLAYING ────────────────────────────────────────────
  const item = engine.currentItem;
  if (!item) return null;

  return (
    <div className={styles.gamePage}>
      <GameTopBar
        counter={engine.counterLabel}
        playerName={playerName}
        score={engine.score}
        streak={engine.streak}
      />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionSection}>
        <TimerBubble timeLeft={engine.timeLeft} />
        {item.image_url && <img src={item.image_url} alt="" className={styles.qImg} />}
        <h2 className={styles.questionText}>{item.term || 'Câu hỏi'}</h2>
      </div>

      <div className={styles.optionsGrid}>
        {engine.shuffledOptions.map((opt, i) => {
          const isSelected = engine.selectedAnswer === opt.originalIndex;
          const isCorrect = opt.originalIndex === 0;
          let optClass = styles.optionBtn;
          if (engine.showFeedback) {
            if (isCorrect) optClass += ` ${styles.optCorrect}`;
            else if (isSelected && !isCorrect) optClass += ` ${styles.optWrong}`;
            else optClass += ` ${styles.optDimmed}`;
          }
          const colors = [styles.colorA, styles.colorB, styles.colorC, styles.colorD];
          return (
            <button
              key={i}
              className={`${optClass} ${!engine.showFeedback ? colors[i] : ''}`}
              onClick={() => { engine.emit(engine.GameEvent.CLICK); engine.submitAnswer(opt.originalIndex); }}
              disabled={engine.showFeedback}
            >
              <span className={styles.optLetter}>{String.fromCharCode(65 + i)}</span>
              <span className={styles.optText}>{opt.text}</span>
              {engine.showFeedback && isCorrect && <span className={styles.optCheck}>✓</span>}
              {engine.showFeedback && isSelected && !isCorrect && <span className={styles.optCheck}>✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
