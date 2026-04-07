'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './ImageQuizPlayer.module.css';

export default function ImageQuizPlayer({ items, activity, playerName }) {
  const engine = useSelectionEngine(items, {
    musicType: 'quiz',
    scoringPolicy: 'time-speed',
    defaultTimeLimit: 20,
    feedbackDelay: 2000,
  });

  const [revealLevel, setRevealLevel] = useState(0);
  const revealRef = useRef(null);

  // Progressive image reveal
  useEffect(() => {
    if (engine.phase !== 'playing' || engine.showFeedback) return;
    const item = items[engine.currentQ];
    if (!item?.image_url) { setRevealLevel(100); return; }
    setRevealLevel(10);
    const tl = item?.extra_data?.time_limit || 20;
    revealRef.current = setInterval(() => {
      setRevealLevel(prev => {
        if (prev >= 100) { clearInterval(revealRef.current); return 100; }
        return prev + (90 / (tl * 2));
      });
    }, 500);
    return () => clearInterval(revealRef.current);
  }, [engine.phase, engine.currentQ, engine.showFeedback]);

  // Force full reveal on answer
  const handleAnswer = (idx) => {
    clearInterval(revealRef.current);
    setRevealLevel(100);
    engine.emit(engine.GameEvent.CLICK);
    engine.submitAnswer(idx);
  };

  if (engine.phase === 'countdown') return <CountdownScreen num={engine.countdownNum} label="Đố Hình" emoji="🖼️" />;

  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} title="Kết Quả Đố Hình" />;
  }

  const item = engine.currentItem;
  if (!item) return null;

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionSection}>
        <TimerBubble timeLeft={engine.timeLeft} />
        {item.image_url ? (
          <div className={styles.imageRevealBox}>
            <img src={item.image_url} alt="" className={styles.revealImg} style={{ filter: `blur(${Math.max(0, 20 - revealLevel / 5)}px)`, opacity: Math.max(0.3, revealLevel / 100) }} />
            <div className={styles.revealBadge}>{Math.round(revealLevel)}% hiện</div>
          </div>
        ) : (
          <h2 className={styles.questionText}>{item.term || 'Đây là gì?'}</h2>
        )}
        <h2 className={styles.questionText}>{item.term || 'Đây là gì?'}</h2>
      </div>

      <div className={styles.optionsGrid}>
        {engine.shuffledOptions.map((opt, i) => {
          const isSelected = engine.selectedAnswer === opt.originalIndex;
          const isCorrect = opt.originalIndex === 0;
          let cls = styles.optionBtn;
          if (engine.showFeedback) {
            if (isCorrect) cls += ` ${styles.optCorrect}`;
            else if (isSelected) cls += ` ${styles.optWrong}`;
            else cls += ` ${styles.optDimmed}`;
          }
          const colors = [styles.colorA, styles.colorB, styles.colorC, styles.colorD];
          return (
            <button key={i} className={`${cls} ${!engine.showFeedback ? colors[i] : ''}`} onClick={() => handleAnswer(opt.originalIndex)} disabled={engine.showFeedback}>
              <span className={styles.optLetter}>{String.fromCharCode(65 + i)}</span>
              <span>{opt.text}</span>
              {engine.showFeedback && isCorrect && <span className={styles.optCheck}>✓</span>}
              {engine.showFeedback && isSelected && !isCorrect && <span className={styles.optCheck}>✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
