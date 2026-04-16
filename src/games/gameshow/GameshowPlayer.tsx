'use client';

import { useState, useEffect } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './GameshowPlayer.module.css';

export default function GameshowPlayer({ items, activity, playerName }: any) {
  const engine = useSelectionEngine(items, {
    musicType: 'gameshow',
    scoringPolicy: 'none',      // ✅ FIX Bug #2: Gameshow handles own scoring
    defaultTimeLimit: 20,
    feedbackDelay: 2000,
    enableTTS: activity?.settings?.read_question || false,
  });

  // ✅ FIX: Reset hiddenOptions when question changes
  useEffect(() => {
    setHiddenOptions([]);
  }, [engine.currentQ]);

  // Lifelines
  const [lifelines, setLifelines] = useState({ fiftyFifty: true, skip: true, doublePoints: true });
  const [hiddenOptions, setHiddenOptions] = useState<any[]>([]);
  const [isDoubleActive, setIsDoubleActive] = useState(false);

  // Override scoring for gameshow (escalating + double)
  const originalSubmit = engine.submitAnswer;
  const handleAnswer = (idx: any) => {
    if (engine.showFeedback) return;
    const item = items[engine.currentQ];
    const tl = item?.extra_data?.time_limit || 20;
    const isCorrect = idx === 0;

    if (isCorrect) {
      const base = 1000 * (engine.currentQ + 1);
      const speed = Math.round((engine.timeLeft / tl) * 500);
      const multiplier = isDoubleActive ? 2 : 1;
      const bonus = (base + speed) * multiplier;
      // We'll use the engine's score setter directly
      engine.setScore(prev => prev + bonus);
    }
    setIsDoubleActive(false);
    originalSubmit(idx);
  };

  const useFiftyFifty = () => {
    if (!lifelines.fiftyFifty || engine.showFeedback) return;
    engine.emit(engine.GameEvent.LIFELINE_USED);
    const wrongOpts = engine.shuffledOptions.filter(o => o.originalIndex !== 0);
    setHiddenOptions(wrongOpts.slice(0, 2).map(o => o.originalIndex));
    setLifelines(prev => ({ ...prev, fiftyFifty: false }));
  };

  const useSkip = () => {
    if (!lifelines.skip || engine.showFeedback) return;
    engine.emit(engine.GameEvent.LIFELINE_USED);
    setLifelines(prev => ({ ...prev, skip: false }));
    engine.advanceToNext();
  };

  const useDouble = () => {
    if (!lifelines.doublePoints || engine.showFeedback || isDoubleActive) return;
    engine.emit(engine.GameEvent.LIFELINE_USED);
    setIsDoubleActive(true);
    setLifelines(prev => ({ ...prev, doublePoints: false }));
  };

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label={activity?.title || 'Gameshow'} emoji="🏆" />;
  }

  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} title="KẾT QUẢ GAMESHOW" />;
  }

  const item = engine.currentItem;
  if (!item) return null;

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={`Câu ${engine.counterLabel}`} playerName={playerName} score={engine.score} streak={engine.streak} />

      {/* Prize Ladder */}
      <div className={styles.prizeLadder}>
        {items.map((_: any, i: any) => (
          <div key={i} className={`${styles.prizeStep} ${i === engine.currentQ ? styles.prizeActive : ''} ${i < engine.currentQ ? styles.prizeDone : ''}`}>
            <span>{i + 1}</span>
            <span className={styles.prizeAmount}>{((i + 1) * 1000).toLocaleString()}</span>
          </div>
        )).reverse()}
      </div>

      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionZone}>
        <TimerBubble timeLeft={engine.timeLeft} />
        {isDoubleActive && <div className={styles.doubleBanner}>×2 ĐIỂM</div>}
        {item.image_url && <img src={item.image_url} alt="" className={styles.qImage} />}
        <h2 className={styles.qText}>{item.term || 'Câu hỏi'}</h2>
      </div>

      {/* Lifelines */}
      <div className={styles.lifelineBar}>
        <button className={`${styles.lifelineBtn} ${!lifelines.fiftyFifty ? styles.lifelineUsed : ''}`} onClick={useFiftyFifty} disabled={!lifelines.fiftyFifty || engine.showFeedback}>
          <span className={styles.lifelineIcon}>½</span><span>50:50</span>
        </button>
        <button className={`${styles.lifelineBtn} ${!lifelines.skip ? styles.lifelineUsed : ''}`} onClick={useSkip} disabled={!lifelines.skip || engine.showFeedback}>
          <span className={styles.lifelineIcon}>⏭</span><span>Bỏ qua</span>
        </button>
        <button className={`${styles.lifelineBtn} ${!lifelines.doublePoints ? styles.lifelineUsed : ''}`} onClick={useDouble} disabled={!lifelines.doublePoints || engine.showFeedback || isDoubleActive}>
          <span className={styles.lifelineIcon}>×2</span><span>Gấp đôi</span>
        </button>
      </div>

      {/* Options */}
      <div className={styles.optGrid}>
        {engine.shuffledOptions.map((opt, i) => {
          if (hiddenOptions.includes(opt.originalIndex)) return <div key={i} className={styles.optHidden} />;
          const isSelected = engine.selectedAnswer === opt.originalIndex;
          const isCorrect = opt.originalIndex === 0;
          let cls = styles.optBtn;
          if (engine.showFeedback) {
            if (isCorrect) cls += ` ${styles.optCorrect}`;
            else if (isSelected) cls += ` ${styles.optWrong}`;
            else cls += ` ${styles.optDim}`;
          }
          const bgColors = [styles.optA, styles.optB, styles.optC, styles.optD];
          return (
            <button key={i} className={`${cls} ${!engine.showFeedback ? bgColors[i] : ''}`} onClick={() => { engine.emit(engine.GameEvent.CLICK); handleAnswer(opt.originalIndex); }} disabled={engine.showFeedback}>
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
