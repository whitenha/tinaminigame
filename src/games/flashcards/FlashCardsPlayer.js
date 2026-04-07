'use client';

import { useRef } from 'react';
import { useRevealEngine } from '@/lib/engines/useRevealEngine';
import styles from './FlashCardsPlayer.module.css';

export default function FlashCardsPlayer({ items, activity, playerName }) {
  const engine = useRevealEngine(items, { musicType: 'calm', mode: 'cards' });

  // ✅ FIX Bug #5: useRef survives re-renders, let does not
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 80) engine.markKnown();
    else if (diff < -80) engine.markUnknown();
    touchStartX.current = null;
  };

  if (engine.isDone) {
    const knownPct = engine.knownPercent;
    return (
      <div className={styles.resultPage}>
        <div className={styles.resultCard}>
          <div className={styles.resultEmoji}>{knownPct >= 80 ? '🏆' : knownPct >= 50 ? '📚' : '💡'}</div>
          <h1 className={styles.resultTitle}>Hoàn Thành!</h1>
          <p className={styles.resultSub}>🎓 {playerName}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressKnown} style={{ width: `${knownPct}%` }} />
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statGreen}><span className={styles.statBig}>{engine.known.length}</span><span>Đã biết ✓</span></div>
            <div className={styles.statRed}><span className={styles.statBig}>{engine.unknown.length}</span><span>Cần ôn ✗</span></div>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.retryBtn} onClick={engine.restartCards}>🔄 Làm lại tất cả</button>
          </div>
        </div>
      </div>
    );
  }

  const item = engine.currentCard;
  const total = items.length;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.counter}>{engine.currentIndex + 1} / {total}</span>
        <span className={styles.nameTag}>👤 {playerName}</span>
        <span className={styles.statsLabel}>
          <span className={styles.knownCount}>✓ {engine.known.length}</span>
          <span className={styles.unknownCount}>✗ {engine.unknown.length}</span>
        </span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressKnown} style={{ width: `${(engine.known.length / total) * 100}%` }} />
        <div className={styles.progressUnknown} style={{ width: `${(engine.unknown.length / total) * 100}%` }} />
      </div>

      <div className={styles.cardArea} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className={`${styles.card} ${engine.flipped ? styles.cardFlipped : ''}`} onClick={engine.flipCard}>
          <div className={styles.cardFront}>
            {item?.image_url && <img src={item.image_url} alt="" className={styles.cardImage} />}
            <h2 className={styles.cardText}>{item?.term || 'Mặt trước'}</h2>
            <button className={styles.speakBtn} onClick={(e) => { e.stopPropagation(); engine.speakText(item?.term || ''); }}>🔊</button>
            <p className={styles.flipHint}>Nhấn để lật</p>
          </div>
          <div className={styles.cardBack}>
            <h2 className={styles.cardText}>{item?.definition || 'Mặt sau'}</h2>
            <button className={styles.speakBtn} onClick={(e) => { e.stopPropagation(); engine.speakText(item?.definition || ''); }}>🔊</button>
            <p className={styles.flipHint}>Nhấn để lật lại</p>
          </div>
        </div>
      </div>

      <div className={styles.actionRow}>
        <button className={styles.unknownBtn} onClick={engine.markUnknown}>
          <span>✗</span><span>Chưa biết</span>
        </button>
        <button className={styles.knownBtn} onClick={engine.markKnown}>
          <span>✓</span><span>Đã biết</span>
        </button>
      </div>
    </div>
  );
}
