'use client';

import { useState } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './WinOrLosePlayer.module.css';

const BET_OPTIONS = [100, 250, 500, 1000];

export default function WinOrLosePlayer({ items, activity, playerName }: any) {
  const engine = useSelectionEngine(items, {
    musicType: 'gameshow',
    scoringPolicy: 'none',
    defaultTimeLimit: 20,
    feedbackDelay: 2000,
    autoAdvance: false,
    initialScore: 500,          // ✅ FIX Bug #6: No setState in render body
    enableTTS: activity?.settings?.read_question || false,
  });

  const [betAmount, setBetAmount] = useState<any>(null);
  const [subPhase, setSubPhase] = useState('betting');

  const placeBet = (amount: any) => {
    engine.emit(engine.GameEvent.BET_PLACED);
    setBetAmount(Math.min(amount, engine.score));
    setSubPhase('answering');
    engine.shuffleOptionsForQuestion(engine.currentQ);
    engine.setTimeLeft(items[engine.currentQ]?.extra_data?.time_limit || 20);
  };

  const handleAnswer = (idx: any) => {
    if (engine.showFeedback) return;
    const isCorrect = idx === 0;
    if (isCorrect) {
      engine.setScore(prev => prev + (betAmount || 100));
    } else {
      engine.setScore(prev => Math.max(0, prev - (betAmount || 100)));
    }
    engine.submitAnswer(idx);

    // Manual advance after feedback
    setTimeout(() => {
      if (engine.currentQ + 1 < items.length) {
        setBetAmount(null);
        setSubPhase('betting');
        engine.advanceToNext();
      } else {
        engine.setPhase('result');
        engine.emit(engine.GameEvent.GAME_COMPLETE);
      }
    }, 2000);
  };

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Được Ăn Cả, Ngã Về Không" emoji="🎰" />;
  }

  if (engine.phase === 'result') {
    // @ts-ignore
    const totalBet = engine.answers.reduce((sum, a) => sum + (a.bet || 0), 0);
    let emoji = engine.score >= 2000 ? '🤑' : engine.score >= 1000 ? '💰' : engine.score >= 500 ? '🪙' : '💸';
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

  const item = engine.currentItem;
  if (!item) return null;

  // Betting phase
  if (subPhase === 'betting') {
    return (
      <div className={styles.gamePage}>
        <GameTopBar counter={`Câu ${engine.counterLabel}`} playerName={playerName} score={engine.score} />
        <div className={styles.betSection}>
          <div className={styles.betEmoji}>🎰</div>
          <h2 className={styles.betTitle}>Bạn muốn đặt cược bao nhiêu?</h2>
          <p className={styles.betSub}>Số dư: <strong>{engine.score.toLocaleString()}</strong> điểm</p>
          <div className={styles.betGrid}>
            {BET_OPTIONS.map(amt => (
              <button key={amt} className={`${styles.betBtn} ${amt > engine.score ? styles.betDisabled : ''}`} onClick={() => placeBet(amt)} disabled={amt > engine.score}>
                <span className={styles.betAmount}>{amt.toLocaleString()}</span>
                <span className={styles.betLabel}>điểm</span>
              </button>
            ))}
          </div>
          <button className={styles.allInBtn} onClick={() => placeBet(engine.score)} disabled={engine.score <= 0}>🔥 ALL IN — {engine.score.toLocaleString()} điểm</button>
        </div>
      </div>
    );
  }

  // Answering phase
  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={`Câu ${engine.counterLabel}`} playerName={playerName} score={engine.score}
        extra={<span className={styles.betBadge}>Cược: {betAmount?.toLocaleString()}</span>}
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
          let cls = styles.optionBtn;
          if (engine.showFeedback) {
            if (isCorrect) cls += ` ${styles.optCorrect}`;
            else if (isSelected) cls += ` ${styles.optWrong}`;
            else cls += ` ${styles.optDimmed}`;
          }
          const colors = [styles.colorA, styles.colorB, styles.colorC, styles.colorD];
          return (
            <button key={i} className={`${cls} ${!engine.showFeedback ? colors[i] : ''}`} onClick={() => { engine.emit(engine.GameEvent.CLICK); handleAnswer(opt.originalIndex); }} disabled={engine.showFeedback}>
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
