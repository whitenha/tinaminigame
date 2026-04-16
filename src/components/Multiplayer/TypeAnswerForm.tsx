import React, { useState } from 'react';
import { getEditDistance } from '@/lib/stringUtils';
import styles from './MultiplayerRoom.module.css';

const TypeAnswerForm = ({
  showFeedback,
  item,
  handleAnswer,
  answeredThisQ,
  isHostShareScreen,
  onBroadcastWrongGuess
}: any) => {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [nearMissHint, setNearMissHint] = useState(false);
  const [hasError, setHasError] = useState(false);

  const onSubmit = async (e: any) => {
    e.preventDefault();
    if (!typedAnswer.trim()) return;
    
    const normalize = (str: any) => String(str).toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:'"]+/g, '');
    const correctAnswerText = item.options?.[0] || item.definition || item.answer || '';
    const normalizedTyped = normalize(typedAnswer);
    const normalizedCorrect = normalize(correctAnswerText);
    
    const isCorrect = normalizedTyped === normalizedCorrect ||
      (normalizedTyped.length > 3 && normalizedCorrect.includes(normalizedTyped)) ||
      (normalizedTyped.length > 3 && normalizedTyped.includes(normalizedCorrect));
      
    if (isCorrect) {
      setNearMissHint(false);
      handleAnswer(0);
    } else {
      const distance = getEditDistance(normalizedTyped, normalizedCorrect);
      const { getSoundManager } = await import('@/lib/sounds');
      getSoundManager().click();

      if (distance <= 2 && normalizedTyped.length >= 3) {
        setNearMissHint(true);
        setTypedAnswer('');
      } else {
        setNearMissHint(false);
        if (onBroadcastWrongGuess) {
          onBroadcastWrongGuess(typedAnswer);
        }
        setTypedAnswer('');
      }

      setHasError(true); 
    }
  };

  if (showFeedback) {
    return (
      <div className={styles.answerRevealCard}>
        <div className={styles.answerRevealLabel}>Correct Answer</div>
        <div className={styles.answerRevealText}>
          {item.options?.[0] || item.definition || item.answer || '—'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.typeAnswerContainer}>
      <form 
        onSubmit={onSubmit} 
        className={`${styles.typeAnswerForm} ${hasError ? styles.shakeError : ''}`}
        onAnimationEnd={() => setHasError(false)}
      >
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={typedAnswer}
            onChange={(e) => {
              setTypedAnswer((e.target as any).value);
              if (nearMissHint) setNearMissHint(false);
            }}
            placeholder="Type your answer..."
            disabled={answeredThisQ}
            autoFocus
            className={`${styles.typeAnswerInput} ${hasError ? styles.inputError : ''}`}
          />
          {nearMissHint && (
            <div className={styles.nearMissBadge}>Gần đúng rồi!</div>
          )}
        </div>
        <button
          type="submit"
          disabled={!typedAnswer.trim() || isHostShareScreen}
          className={`${styles.submitBtn} ${typedAnswer.trim() ? styles.submitActive : ''}`}
        >
          Submit Answer
        </button>
      </form>
    </div>
  );
};

export default React.memo(TypeAnswerForm);
