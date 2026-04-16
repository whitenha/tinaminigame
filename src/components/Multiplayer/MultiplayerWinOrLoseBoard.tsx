import { useState, useEffect } from 'react';
import styles from '@/games/winorlose/WinOrLosePlayer.module.css';

export default function MultiplayerWinOrLoseBoard({
  item,
  shuffledOptions,
  eliminatedOptions,
  selectedAnswer,
  showFeedback,
  answerRevealed,
  answeredThisQ,
  isShareScreen,
  handleAnswer,
  timeLeft,
  mp
}: any) {
  const [betAmount, setBetAmount] = useState<number | null>(null);
  const timeLimit = item?.extra_data?.time_limit || 20;
  const isBettingPhase = timeLeft > timeLimit && !answeredThisQ;

  // Reset bet when moving to a new question
  useEffect(() => {
    setBetAmount(null);
  }, [item?.term]); 

  const placeBet = (amount: number) => {
    setBetAmount(amount);
  };

  const currentScore = mp.myPlayer?.score || 100; // Provide min 100 to allow betting
  const BET_OPTIONS = [100, 250, 500, 1000];

  if (isShareScreen) {
    return null; // The host handles its own display
  }

  if (isBettingPhase) {
    return (
      <div className={styles.betSection} style={{ padding: 20 }}>
        <div className={styles.betEmoji}>🎰</div>
        <h2 className={styles.betTitle}>Số điểm bạn cược?</h2>
        <p className={styles.betSub}>Điểm của bạn: <strong>{currentScore.toLocaleString()}</strong></p>
        <div className={styles.betGrid}>
          {BET_OPTIONS.map(amt => (
            <button 
              key={amt} 
              className={`${styles.betBtn} ${amt > currentScore && currentScore >= 100 ? styles.betDisabled : ''}`} 
              onClick={() => placeBet(amt)} 
              disabled={(amt > currentScore && currentScore >= 100)}
              style={{
                 background: betAmount === amt ? 'linear-gradient(135deg, #f0932b, #ffbe76)' : '',
                 transform: betAmount === amt ? 'scale(1.05)' : '',
                 transition: 'all 0.2s'
              }}
            >
              <span className={styles.betAmount}>{amt.toLocaleString()}</span>
              <span className={styles.betLabel}>điểm</span>
            </button>
          ))}
        </div>
        <button 
           className={styles.allInBtn} 
           onClick={() => placeBet(currentScore)} 
           style={{
             background: betAmount === currentScore ? 'linear-gradient(135deg, #eb4d4b, #ff7979)' : '',
             transform: betAmount === currentScore ? 'scale(1.02)' : '',
             transition: 'all 0.2s'
           }}
        >
           🔥 ALL IN — {currentScore.toLocaleString()} điểm
        </button>
        {betAmount && (
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 18, color: '#f1c40f', fontWeight: 'bold' }}>
            ✅ Đã đặt {betAmount.toLocaleString()} điểm. Chờ Host...
          </div>
        )}
      </div>
    );
  }

  // Answering Phase
  const actualBet = betAmount || 100;

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!answeredThisQ && !showFeedback && (
         <div style={{ background: 'linear-gradient(135deg, #e1b12c, #fbc531)', padding: '12px 20px', borderRadius: 12, fontWeight: 'bold', color: '#2f3640', textAlign: 'center', boxShadow: '0 4px 15px rgba(24bc53, 0.3)', fontSize: 18 }}>
           💰 Ban đang cược: {actualBet.toLocaleString()} điểm
         </div>
      )}

      <div className={styles.optionsGrid} style={{ gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
        {shuffledOptions.map((opt: any, i: number) => {
          if (eliminatedOptions && eliminatedOptions.includes(opt.originalIndex)) return null;

          const isSelected = selectedAnswer === opt.originalIndex;
          const isCorrect = opt.originalIndex === 0;
          let bg = 'rgba(255, 255, 255, 0.1)';
          let border = '2px solid rgba(255, 255, 255, 0.2)';

          if (showFeedback || answerRevealed) {
            if (isCorrect) bg = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            else if (isSelected) bg = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            else bg = 'rgba(255, 255, 255, 0.05)';
          } else if (isSelected) {
            bg = 'rgba(255, 255, 255, 0.3)';
            border = '2px solid white';
          }

          return (
            <button
              key={i}
              disabled={answeredThisQ || showFeedback || answerRevealed}
              onClick={() => {
                 // Time-decay multiplier (1.0x to 1.5x based on speed)
                 const timeRatio = Math.max(0, Math.min(1, timeLeft / timeLimit));
                 const timeMulti = 1 + (timeRatio * 0.5);

                 // Calculate points directly. Note that we don't multiply by streak here.
                 const winPoints = Math.round(actualBet * timeMulti);
                 const points = isCorrect ? winPoints : -actualBet;
                 handleAnswer(opt.originalIndex, points);
              }}
              style={{
                background: bg,
                border,
                padding: '24px 20px',
                borderRadius: 16,
                color: 'white',
                fontSize: 20,
                fontWeight: 700,
                cursor: (answeredThisQ || showFeedback || answerRevealed) ? 'default' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transform: isSelected && !showFeedback ? 'scale(1.02)' : 'none',
                opacity: (showFeedback && !isCorrect && !isSelected) ? 0.5 : 1,
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 22
              }}>
                {String.fromCharCode(65 + i)}
              </div>
              <span style={{flex: 1}}>{opt.text}</span>
              {showFeedback && isCorrect && <span style={{fontSize: 28}}>✅</span>}
              {showFeedback && isSelected && !isCorrect && <span style={{fontSize: 28}}>❌</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
