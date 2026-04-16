'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfettiOverlay } from '@/components/GameShell';
import AvatarDisplay from './AvatarDisplay';
import styles from './PodiumScreen.module.css';

/**
 * PodiumScreen v2 — Premium Victory Ceremony
 * 
 * Phased reveal:
 *   Phase 0 (0.0s): Title + spotlights appear
 *   Phase 1 (1.5s): 3rd place reveals
 *   Phase 2 (3.0s): 2nd place reveals
 *   Phase 3 (4.5s): 1st place reveals (with crown + confetti)
 *   Phase 4 (6.5s): Runners-up (4th, 5th) slide in
 *   Phase 5 (7.5s): Action buttons appear
 */
export default function PodiumScreen({ leaderboard, myPlayerId, totalQ = 0, onRematch, onExit }: any) {
  const [phase, setPhase] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const runnersUp = useMemo(() => leaderboard.slice(3, 5), [leaderboard]);
  
  // Calculate personal rank for the current player
  const myPlayerIndex = useMemo(() => leaderboard.findIndex((p: any) => String(p.id) === String(myPlayerId)), [leaderboard, myPlayerId]);
  const myRank = myPlayerIndex + 1;
  const isOutsideTop5 = myRank > 5;
  const myPlayerInfo = isOutsideTop5 ? leaderboard[myPlayerIndex] : null;

  const [sparkles, setSparkles] = useState<any[]>([]);

  const timersRef = useRef<any[]>([]);

  // Audio helper
  const playSound = (src: any) => {
    try {
      if (typeof window !== 'undefined') {
        const audio = new Audio(src);
        audio.volume = 0.5;
        audio.play().catch(() => {}); // catch Autoplay policies silently
      }
    } catch (err: any) {}
  };

  // Sound triggers based on phase
  useEffect(() => {
    if (phase === 1) playSound('/sounds/swoosh.mp3'); // Fallback or placeholder
    if (phase === 2) playSound('/sounds/swoosh.mp3');
    if (phase === 3) playSound('/sounds/victory_fanfare.mp3');
  }, [phase]);

  // Phased reveal timeline & Sparkles Generation
  useEffect(() => {
    // Generate sparkles on client side only to prevent hydration mismatch
    setSparkles(Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${4 + Math.random() * 6}s`,
      size: `${3 + Math.random() * 6}px`,
    })));
    timersRef.current = [
      setTimeout(() => setPhase(1), 1500),  // 3rd place
      setTimeout(() => setPhase(2), 3000),  // 2nd place
      setTimeout(() => {
        setPhase(3);                         // 1st place
        setShowConfetti(true);
      }, 4500),
      setTimeout(() => setPhase(4), 6500),  // Runners-up
      setTimeout(() => setPhase(5), 7500),  // Actions
    ];

    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const handleSkip = () => {
    if (phase < 5) {
      timersRef.current.forEach(clearTimeout);
      setPhase(5);
      setShowConfetti(true);
    }
  };

  const renderPlace = (player: any, rank: any, isVisible: any) => {
    if (!player) {
      return (
        <div className={styles.place} style={{ opacity: 0, pointerEvents: 'none' }}>
           <div className={styles.block} style={{ height: 100 }} />
        </div>
      );
    }

    const tierClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
    const isChampion = rank === 1;

    return (
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
        transition={{ type: 'spring', bounce: 0.4, duration: 1 }}
        className={styles.place}
      >
        {/* Crown for 1st */}
        {isChampion && <div className={styles.crown}>👑</div>}

        {/* Avatar with ring */}
        <div className={styles.avatarContainer}>
          <div className={`${styles.avatarRing} ${styles[tierClass]}`}>
            <div className={styles.avatarInner}>
              <AvatarDisplay
                avatar={player.avatar_emoji}
                className={`${styles.avatarEmoji} ${!isChampion ? styles.small : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Name */}
        <div className={`${styles.playerName} ${isChampion ? styles.champion : ''}`}>
          {player.player_name}
        </div>

        {/* Score */}
        <div className={`${styles.playerScore} ${styles[tierClass]} ${isChampion ? styles.champion : ''}`}>
          ⭐ {(player.score || 0).toLocaleString('vi-VN')}
        </div>

        {/* Rising block */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={isVisible ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8, delay: 0.2 }}
          style={{ transformOrigin: 'bottom' }}
          className={`${styles.block} ${styles[rank === 1 ? 'first' : rank === 2 ? 'second' : 'third']}`}
        >
          <div className={`${styles.rankBadge} ${styles[tierClass]}`}>
            <span className={styles.rankNumber}>{rank}</span>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className={styles.page} onClick={handleSkip}>
      {/* Spotlight rays */}
      <div className={styles.spotlights}>
        <div className={`${styles.spotlightRay} ${styles.ray1}`} />
        <div className={`${styles.spotlightRay} ${styles.ray2}`} />
        <div className={`${styles.spotlightRay} ${styles.ray3}`} />
      </div>

      {/* Floating sparkles */}
      <div className={styles.sparkles}>
        {sparkles.map((sparkle, i) => (
          <div
            key={i}
            className={styles.sparkle}
            style={{
              left: sparkle.left,
              animationDelay: sparkle.animationDelay,
              animationDuration: sparkle.animationDuration,
              // @ts-ignore
              '--size': sparkle.size,
            }}
          />
        ))}
      </div>

      {/* Confetti (fires when 1st place reveals) */}
      <ConfettiOverlay active={showConfetti} />

      {/* Title */}
      <div className={styles.titleSection}>
        <span className={styles.titleIcon}>🏆</span>
        <h1 className={styles.title}>Kết Quả Chung Cuộc</h1>
      </div>

      {/* Podium Stage: 2nd | 1st | 3rd */}
      <div className={styles.stage}>
        {/* 2nd Place (left) */}
        {renderPlace(top3[1], 2, phase >= 2)}

        {/* 1st Place (center, tallest) */}
        {renderPlace(top3[0], 1, phase >= 3)}

        {/* 3rd Place (right) */}
        {renderPlace(top3[2], 3, phase >= 1)}
      </div>

      {/* Runners-Up: 4th & 5th */}
      <AnimatePresence>
        {runnersUp.length > 0 && phase >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ staggerChildren: 0.15 }}
            className={styles.runnersUp}
          >
            {runnersUp.map((player: any, i: any) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.runnerRow}
              >
                <div className={styles.runnerRank}>{i + 4}</div>
                <div className={styles.runnerAvatar}>
                  <AvatarDisplay avatar={player.avatar_emoji} className={styles.runnerAvatarEmoji} />
                </div>
                <span className={styles.runnerName}>{player.player_name}</span>
                <span className={styles.runnerScore}>{(player.score || 0).toLocaleString('vi-VN')}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal Rank (if outside top 5) */}
      {isOutsideTop5 && myPlayerInfo && (
        <div className={`${styles.runnersUp} ${phase >= 4 ? styles.visible : ''}`} style={{ marginTop: 12 }}>
          <div
            className={`${styles.runnerRow} ${styles.myRankRow} ${phase >= 4 ? styles.visible : ''}`}
            style={{ animationDelay: '0.4s' }}
          >
            <div className={styles.runnerRank} style={{ background: 'linear-gradient(135deg, #f1c40f, #e67e22)', color: 'white', border: 'none' }}>
              {myRank}
            </div>
            <div className={styles.runnerAvatar}>
              <AvatarDisplay avatar={myPlayerInfo.avatar_emoji} className={styles.runnerAvatarEmoji} />
            </div>
            <span className={styles.runnerName} style={{ color: '#f1c40f', fontWeight: 900 }}>{myPlayerInfo.player_name} (Bạn)</span>
            <span className={styles.runnerScore} style={{ color: '#f1c40f' }}>{(myPlayerInfo.score || 0).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={`${styles.actions} ${phase >= 5 ? styles.visible : ''}`}>
        {onRematch && (
          <button className={styles.rematchButton} onClick={onRematch}>
            🔄 Chơi Lại
          </button>
        )}
        <button
          className={styles.statsButton}
          onClick={() => setShowStats(true)}
        >
          📊 Thống Kê
        </button>
        <button
          className={styles.exitButton}
          onClick={() => onExit ? onExit() : window.location.href = '/'}
        >
          🚪 Thoát
        </button>
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div className={styles.modalOverlay} onClick={() => setShowStats(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>Thống Kê Người Chơi</h2>
              <button 
                 className={styles.modalClose} 
                 onClick={() => setShowStats(false)}
              >
                 ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {leaderboard.slice(0, 10).map((p: any, idx: any) => {
                 const correctCount = (p.answers || []).filter((a: any) => a.correct).length;
                 const rankColor = idx === 0 ? '#f1c40f' : idx === 1 ? '#bdc3c7' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.2)';
                 return (
                   <div key={p.id} className={styles.statRow}>
                      <div className={styles.statRank} style={{ background: rankColor, color: idx < 3 ? '#000' : '#fff' }}>#{idx + 1}</div>
                      <div className={styles.statAvatar}>
                        <AvatarDisplay avatar={p.avatar_emoji} />
                      </div>
                      <div className={styles.statName}>{p.player_name}</div>
                      <div className={styles.statScore}>{(p.score || 0).toLocaleString('vi-VN')} <span style={{fontSize: 10, opacity: 0.6}}>pts</span></div>
                      <div className={styles.statCorrect} style={{ color: correctCount === totalQ && totalQ > 0 ? '#2ecc71' : 'rgba(255,255,255,0.9)' }}>
                         ✅ {correctCount}/{totalQ || '?'}
                      </div>
                   </div>
                 );
              })}
              {leaderboard.length > 10 && (
                <div style={{ textAlign: 'center', padding: '12px', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic' }}>
                   * Chỉ hiển thị Top 10 người đứng đầu vì lý do hiệu suất
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
