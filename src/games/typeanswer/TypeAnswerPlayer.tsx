'use client';

import { useState, useRef, useEffect } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import { getEditDistance } from '@/lib/stringUtils';
import styles from './TypeAnswerPlayer.module.css';

export default function TypeAnswerPlayer({ items, activity, playerName }: any) {
  const engine = useSelectionEngine(items, {
    musicType: 'quiz',
    scoringPolicy: 'time-speed',
    defaultTimeLimit: 30,
    feedbackDelay: 2500,
    autoAdvance: true,
  });

  const [typedAnswer, setTypedAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [nearMissHint, setNearMissHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (engine.phase === 'playing' && !engine.showFeedback) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [engine.phase, engine.currentQ, engine.showFeedback]);

  // Reset typed answer on question change
  useEffect(() => {
    setTypedAnswer('');
    setIsCorrect(false);
    setNearMissHint(false);
    setHintLevel(0);
  }, [engine.currentQ]);

  const normalize = (str: any) => str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:'"]+/g, '');

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
    
    if (!correct) {
      const distance = getEditDistance(normalizedTyped, normalizedCorrect);
      if (distance <= 2 && normalizedTyped.length >= 3) {
        setNearMissHint(true);
        import('@/lib/sounds').then(({ getSoundManager }) => getSoundManager().click());
        setTypedAnswer('');
      } else {
        setNearMissHint(false);
        import('@/lib/sounds').then(({ getSoundManager }) => getSoundManager().click());
        setTypedAnswer('');
      }

      const el = inputRef.current;
      if (el) {
         el.style.borderColor = '#ef4444';
         setTimeout(() => { if (el) el.style.borderColor = 'rgba(255,255,255,0.2)'; }, 300);
      }
      return; // Do not submit wrong answers, let player try again
    }

    setNearMissHint(false);

    // Adjust score based on hints used
    if (hintLevel > 0) {
      const penalty = hintLevel * 100;
      engine.setScore(prev => Math.max(prev - penalty, 0));
    }
    engine.submitAnswer(0);
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
    const revealed = answer.split('').map((c: any, i: any) => i % 2 === 0 ? c : '_').join('');
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
            <div className={styles.inputRow} style={{ position: 'relative' }}>
              <input ref={inputRef} type="text" className={styles.answerInput} placeholder="Gõ đáp án của bạn..."
                value={typedAnswer} onChange={(e) => {
                  setTypedAnswer((e.target as any).value);
                  if (nearMissHint) setNearMissHint(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && typedAnswer.trim()) submitTypedAnswer(); }}
                autoFocus autoComplete="off" spellCheck="false"
              />
              <button className={styles.submitBtn} onClick={submitTypedAnswer} disabled={!typedAnswer.trim()}>Gửi ➜</button>
              {nearMissHint && (
                <div style={{
                  position: 'absolute', top: -35, left: '50%', transform: 'translateX(-50%)',
                  background: '#f1c40f', color: '#8e44ad', padding: '6px 14px', borderRadius: 16,
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)', animation: 'bounce 0.5s', pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}>
                  Gần đúng rồi!
                </div>
              )}
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
