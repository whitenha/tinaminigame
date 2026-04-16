'use client';

import styles from './Multiplayer.module.css';

export default function AnswerHeatmap({ answerStats }: any) {
  if (!answerStats) return null;

  return (
    <div className={styles.heatmapBox}>
      <div className={styles.heatmapTitle}>
        📊 Phân bổ đáp án — {answerStats.correct}/{answerStats.total} đúng
      </div>
      {answerStats.distribution?.map((count: any, i: any) => {
        const pct = answerStats.total > 0 ? Math.round((count / answerStats.total) * 100) : 0;
        const isCorrectOpt = i === answerStats.correctIndex;
        return (
          <div key={i} className={styles.heatmapBar}>
            <span className={styles.heatmapLabel}>{String.fromCharCode(65 + i)}</span>
            <div className={styles.heatmapTrack}>
              <div
                className={`${styles.heatmapFill} ${isCorrectOpt ? styles.correct : styles.wrong}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              >
                {count > 0 && `${count}`}
              </div>
            </div>
            <span className={styles.heatmapPct}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
