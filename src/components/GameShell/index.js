'use client';

import { useMemo } from 'react';
import styles from './GameShell.module.css';

/**
 * CountdownScreen — 3-2-1-GO! shared across ALL games.
 * Props: num (3|2|1|0), label, emoji
 */
export function CountdownScreen({ num, label = 'Sẵn sàng!', emoji = '🎯' }) {
  return (
    <div className={styles.countdownPage}>
      <div className={styles.countdownShapes}>
        <div className={styles.countdownShape} />
        <div className={styles.countdownShape} />
        <div className={styles.countdownShape} />
        <div className={styles.countdownShape} />
      </div>
      <div className={styles.countdownCircle}>
        <span className={`${styles.countdownNum} ${num <= 0 ? styles.countdownGo : ''}`} key={num}>
          {num > 0 ? num : 'GO!'}
        </span>
      </div>
      <p className={styles.countdownLabel}>
        <span className={styles.countdownEmoji}>{emoji}</span>
        {label}
      </p>
    </div>
  );
}

/**
 * GameTopBar — Info bar at top of every game.
 * Props: counter, playerName, score, streak, extra (ReactNode)
 */
export function GameTopBar({ counter, playerName, score, streak = 0, extra }) {
  return (
    <div className={styles.topBar}>
      <div className={`${styles.topBarPill} ${styles.counterPill}`}>{counter}</div>
      {playerName && (
        <div className={`${styles.topBarPill} ${styles.namePill}`}>{playerName}</div>
      )}
      <div className={`${styles.topBarPill} ${styles.scorePill}`}>
        {(score || 0).toLocaleString()}⭐
      </div>
      {extra}
    </div>
  );
}

/**
 * TimerBar — Animated timer bar + bubble.
 * Props: timeLeft, maxTime (for percent), showBubble
 */
export function TimerBar({ timeLeft, maxTime, showBubble = true }) {
  const pct = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0;
  const isDanger = timeLeft <= 5;

  return (
    <>
      <div className={styles.timerTrack}>
        <div
          className={`${styles.timerFill} ${isDanger ? styles.timerDanger : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
}

/**
 * TimerBubble — The floating timer number
 */
export function TimerBubble({ timeLeft }) {
  const isDanger = timeLeft <= 5;
  return (
    <div className={`${styles.timerBubble} ${isDanger ? styles.timerBubbleDanger : ''}`}>
      {timeLeft}
    </div>
  );
}

/**
 * ResultScreen — End-of-game result card.
 * Props: playerName, score, answers, items, onRetry, title, extraStats
 */
export function ResultScreen({ playerName, score, answers = [], items = [], onRetry, title = 'Kết Quả', extraStats }) {
  const total = items.length;
  const correct = answers.filter(a => a.correct).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  let emoji, message;
  if (pct === 100) { emoji = '🏆'; message = 'Hoàn hảo! Tuyệt vời lắm! 🌟'; }
  else if (pct >= 80) { emoji = '🌟'; message = 'Xuất sắc! Giỏi quá!'; }
  else if (pct >= 60) { emoji = '😊'; message = 'Khá tốt! Cố lên nào!'; }
  else if (pct >= 40) { emoji = '💪'; message = 'Cần luyện tập thêm!'; }
  else { emoji = '📚'; message = 'Ôn lại rồi thử lại nhé!'; }

  return (
    <div className={styles.resultPage}>
      <ConfettiOverlay active={pct >= 80} />
      <div className={styles.resultCard}>
        <div className={styles.resultEmoji}>{emoji}</div>
        <h1 className={styles.resultTitle}>{title}</h1>
        <p className={styles.resultName}>🎓 {playerName}</p>
        <p className={styles.resultMessage}>{message}</p>

        <div className={styles.statsRow}>
          <div className={`${styles.statBox} ${pct === 100 ? styles.statPerfect : ''}`}>
            <span className={styles.statVal}>⭐ {(score || 0).toLocaleString()}</span>
            <span className={styles.statLabel}>Điểm</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statVal}>{correct}/{total}</span>
            <span className={styles.statLabel}>Đúng</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statVal}>{pct}%</span>
            <span className={styles.statLabel}>Chính xác</span>
          </div>
          {extraStats}
        </div>

        {answers.length > 0 && (
          <div className={styles.reviewList}>
            {answers.map((a, i) => (
              <div
                key={i}
                className={`${styles.reviewRow} ${a.correct ? styles.reviewOk : styles.reviewBad}`}
                style={{ '--i': i }}
              >
                <span className={styles.reviewNum}>{i + 1}</span>
                <span className={styles.reviewText}>{items[a.questionIndex]?.term || `Câu ${i + 1}`}</span>
                <span className={styles.reviewIcon}>{a.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        )}

        <button className={styles.retryBtn} onClick={onRetry || (() => window.location.reload())}>
          🔄 Chơi Lại
        </button>
      </div>
    </div>
  );
}

/**
 * ConfettiOverlay — Pure CSS confetti burst.
 * Props: active (boolean)
 */
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8A5C', '#A855F7', '#FB7185', '#38BDF8', '#FBBF24'];

export function ConfettiOverlay({ active = false }) {
  // ✅ FIX: useMemo so positions don't change on every re-render
  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      size: 6 + Math.random() * 8,
    }));
  }, [active]);

  return (
    <div className={styles.confettiContainer}>
      {pieces.map(p => (
        <div
          key={p.id}
          className={styles.confettiPiece}
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            '--delay': p.delay,
            '--fall-duration': p.duration,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
