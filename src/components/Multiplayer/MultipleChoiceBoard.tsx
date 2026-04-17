import React from 'react';
import styles from './MultiplayerRoom.module.css';

const MultipleChoiceBoard = ({
  shuffledOptions,
  eliminatedOptions,
  selectedAnswer,
  showFeedback,
  answerRevealed,
  answeredThisQ,
  isShareScreen,
  handleAnswer,
  frozenButtons = [],
  earthquakeActive = false,
}: any) => {
  return (
    <div className={styles.optionsGrid} style={isShareScreen ? { maxWidth: '100%', padding: '16px' } : {}}>
      {shuffledOptions.map((opt: any, i: any) => {
        if (eliminatedOptions.includes(opt.originalIndex)) return null;
        
        const isSelected = selectedAnswer === opt.originalIndex;
        const isCorrect = opt.originalIndex === 0;
        const isFrozen = frozenButtons.includes(i);
        let optClass = styles.optionBtn;
        
        if (showFeedback) {
          if ((answerRevealed && isCorrect) || (isSelected && isCorrect)) {
            optClass += ` ${styles.optCorrect}`;
          } else if (isSelected && !isCorrect) {
            optClass += ` ${styles.optWrong}`;
          } else {
            optClass += ` ${styles.optDimmed}`;
          }
        } else if (selectedAnswer !== null && !isSelected) {
          optClass += ` ${styles.optDimmed}`;
        }
        
        const colors = [styles.optRed, styles.optBlue, styles.optGreen, styles.optYellow];
        
        // Frozen button style
        const frozenStyle: React.CSSProperties = isFrozen ? {
          opacity: 0.25,
          pointerEvents: 'none' as const,
          filter: 'saturate(0.2) brightness(0.5)',
          position: 'relative' as const,
        } : {};

        return (
          <button
            key={i}
            className={`${optClass} ${(!showFeedback || (!answerRevealed && !isSelected)) ? (colors[i] || '') : ''}`}
            onClick={() => handleAnswer(opt.originalIndex)}
            disabled={showFeedback || answeredThisQ || isFrozen || earthquakeActive}
            style={{
              ...(isShareScreen ? { minHeight: 100, fontSize: 32, justifyContent: 'center' } : {}),
              ...frozenStyle,
            }}
          >
            <span 
              className={styles.optionLetter}
              style={isShareScreen ? { width: 48, height: 48, fontSize: 24 } : {}}
            >
              {isFrozen ? '🧊' : String.fromCharCode(65 + i)}
            </span>
            {!isShareScreen && <span className={styles.optionText}>{opt.text}</span>}
            {showFeedback && answerRevealed && isCorrect && <span className={styles.optionCheck}>✓</span>}
            {showFeedback && isSelected && isCorrect && <span className={styles.optionCheck}>✓</span>}
            {showFeedback && isSelected && !isCorrect && <span className={styles.optionCheck}>✗</span>}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(MultipleChoiceBoard);
