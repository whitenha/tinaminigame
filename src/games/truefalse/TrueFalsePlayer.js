'use client';

import { useState, useEffect } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './TrueFalsePlayer.module.css';

export default function TrueFalsePlayer({ items, activity, playerName }) {
  const engine = useSelectionEngine(items, {
    musicType: 'quiz',
    scoringPolicy: 'time-speed',
    defaultTimeLimit: 15,
    feedbackDelay: 1500,
    enableTTS: activity?.settings?.read_question || false,
  });

  // TrueFalse-specific: display options as Đúng/Sai buttons
  const [displayOptions, setDisplayOptions] = useState(['Đúng', 'Sai']);

  useEffect(() => {
    if (engine.phase === 'playing' && items[engine.currentQ]) {
      const item = items[engine.currentQ];
      const validOpts = (item.options || []).filter(o => o && o.trim() !== '');
      if (validOpts.length >= 2) {
        const hasTrue = validOpts.some(o => ['đúng', 'true'].includes(o.toLowerCase()));
        const hasFalse = validOpts.some(o => ['sai', 'false'].includes(o.toLowerCase()));
        if (hasTrue && hasFalse) {
          setDisplayOptions(validOpts[0].toLowerCase().includes('đúng') || validOpts[0].toLowerCase() === 'true' ? ['Đúng', 'Sai'] : ['True', 'False']);
        } else {
          setDisplayOptions(validOpts.slice(0, 2));
        }
      } else {
        setDisplayOptions(['Đúng', 'Sai']);
      }
    }
  }, [engine.currentQ, engine.phase, items]);

  const handleChoice = (choice) => {
    engine.emit(engine.GameEvent.CLICK);
    const correctAnswer = items[engine.currentQ]?.options?.[0] || 'Đúng';
    const isCorrectChoice = choice === correctAnswer || 
      (choice.toLowerCase() === correctAnswer.toLowerCase());
    // Map to originalIndex: 0 = correct
    engine.submitAnswer(isCorrectChoice ? 0 : 1);
  };

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Đúng hay Sai" emoji="✓✗" />;
  }

  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} />;
  }

  const item = engine.currentItem;
  if (!item) return null;
  const correctAnswer = item.options?.[0] || 'Đúng';

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionSection}>
        <TimerBubble timeLeft={engine.timeLeft} />
        {item.image_url && <img src={item.image_url} alt="" className={styles.qImg} />}
        <h2 className={styles.statement}>{item.term || 'Phát biểu'}</h2>
      </div>

      <div className={styles.choicesRow}>
        {displayOptions.map((opt, i) => {
          const isTrue = ['đúng', 'true'].includes(opt.toLowerCase());
          const isFalse = ['sai', 'false'].includes(opt.toLowerCase());
          const isThisCorrect = opt === correctAnswer || opt.toLowerCase() === correctAnswer.toLowerCase();
          const wasSelected = engine.selectedAnswer === (isThisCorrect ? 0 : 1);

          let btnClass = styles.choiceBtn;
          if (isTrue) btnClass += ` ${styles.optionTrue}`;
          else if (isFalse) btnClass += ` ${styles.optionFalse}`;
          else btnClass += ` ${styles[`color${i}`]}`;

          if (engine.showFeedback) {
            if (isThisCorrect) btnClass += ` ${styles.choiceCorrect}`;
            else if (wasSelected) btnClass += ` ${styles.choiceWrong}`;
          }

          return (
            <button key={i} className={btnClass} onClick={() => handleChoice(opt)} disabled={engine.showFeedback}>
              <span className={styles.choiceIcon}>{isTrue ? '✓' : isFalse ? '✗' : ''}</span>
              <span className={styles.choiceLabel}>{opt.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
