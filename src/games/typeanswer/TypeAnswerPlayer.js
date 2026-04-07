'use client';

import { useState, useRef, useEffect } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './TypeAnswerPlayer.module.css';

export default function TypeAnswerPlayer({ items, activity, playerName }) {
  const engine = useSelectionEngine(items, {
    musicType: 'quiz',
    scoringPolicy: 'time-speed',
    defaultTimeLimit: 30,
    feedbackDelay: 2500,
    autoAdvance: true,
  });

  const [typedAnswer, setTypedAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (engine.phase === 'playing' && !engine.showFeedback) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [engine.phase, engine.currentQ, engine.showFeedback]);

  // Reset typed answer on question change
  useEffect(() => {
    setTypedAnswer('');
    setIsCorrect(false);
    setHintLevel(0);
  }, [engine.currentQ]);

  const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:'"]+/g, '');

  const submitTypedAnswer = () => {
    if (engine.showFeedback) return;
    const item = items[engine.currentQ];
    const correctAnswer = item.options?.[0] || item.definition || '';
    const normalizedTyped = normalize(typedAnswer);
    const normalizedCorrect = normalize(correctAnswer);
    const correct = normalizedTyped === normalizedCorrect ||
      (normalizedTyped.length > 3 && normalizedCorrect.includes(normalizedTyped)) ||
      (normalizedTyped.length > 3 && normalizedTyped.includes(normalizedCorrect));

    setIsCorrect(correct);
    // Adjust score based on hints used
    if (correct && hintLevel > 0) {
      const penalty = hintLevel * 100;
      engine.setScore(prev => Math.max(prev - penalty, 0));
    }
    engine.submitAnswer(correct ? 0 : 1);
  };

  const getHint = () => {
    if (hintLevel >= 3) return;
    engine.emit(engine.GameEvent.CLICK);
    setHintLevel(prev => prev + 1);
  };

  const renderHint = () => {
    const item = items[engine.currentQ];
    const answer = item?.options?.[0] || item?.definition || '';
    if (hintLevel === 0) return null;
    if (hintLevel === 1) return <div className={styles.hintBox}>💡 Số ký tự: <strong>{answer.length}</strong></div>;
    if (hintLevel === 2) return <div className={styles.hintBox}>💡 Chữ cái đầu: <strong>{answer[0]?.toUpperCase()}</strong> ({answer.length} ký tự)</div>;
    const revealed = answer.split('').map((c, i) => i % 2 === 0 ? c : '_').join('');
    return <div className={styles.hintBox}>💡 Gợi ý: <strong>{revealed}</strong></div>;
  };

  if (engine.phase === 'countdown') return <CountdownScreen num={engine.countdownNum} label="Gõ Đáp Án" emoji="⌨️" />;

  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} />;
  }

  const item = engine.currentItem;
  if (!item) return null;
  const correctAnswer = item.options?.[0] || item.definition || '';

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      <div className={styles.questionSection}>
        <TimerBubble timeLeft={engine.timeLeft} />
        {item.image_url && <img src={item.image_url} alt="" className={styles.qImg} />}
        <h2 className={styles.questionText}>{item.term || 'Câu hỏi'}</h2>
        {renderHint()}
      </div>

      <div className={styles.answerSection}>
        {!engine.showFeedback ? (
          <>
            <div className={styles.inputRow}>
              <input ref={inputRef} type="text" className={styles.answerInput} placeholder="Gõ đáp án của bạn..."
                value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && typedAnswer.trim()) submitTypedAnswer(); }}
                autoFocus autoComplete="off" spellCheck="false"
              />
              <button className={styles.submitBtn} onClick={submitTypedAnswer} disabled={!typedAnswer.trim()}>Gửi ➜</button>
            </div>
            <button className={`${styles.hintBtn} ${hintLevel >= 3 ? styles.hintUsed : ''}`} onClick={getHint} disabled={hintLevel >= 3}>
              💡 Gợi ý ({3 - hintLevel} lần còn lại)
            </button>
          </>
        ) : (
          <div className={`${styles.feedbackBox} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
            <div className={styles.feedbackIcon}>{isCorrect ? '✅' : '❌'}</div>
            <div className={styles.feedbackText}>{isCorrect ? 'Chính xác!' : `Sai rồi! Đáp án: ${correctAnswer}`}</div>
            {!isCorrect && typedAnswer && <div className={styles.feedbackYours}>Bạn đã gõ: &quot;{typedAnswer}&quot;</div>}
          </div>
        )}
      </div>
    </div>
  );
}
