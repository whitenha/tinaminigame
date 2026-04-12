'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import AvatarDisplay from './AvatarDisplay';
import styles from './LiveLeaderboard.module.css';

/**
 * LiveLeaderboard v3 — Premium animated leaderboard with rank change effects
 */
export default function LiveLeaderboard({
  leaderboard,
  previousLeaderboard = [],
  roundPoints = {},
  myPlayerId,
  isHost,
  onNext,
  onEnd,
  currentQ,
  totalQ,
}) {
  const isLastQuestion = currentQ + 1 >= totalQ;
  const [animatedScores, setAnimatedScores] = useState({});
  const [showRows, setShowRows] = useState(false);
  const maxScore = leaderboard[0]?.score || 1;

  // Calculate rank changes
  const rankChanges = useMemo(() => {
    const changes = {};
    if (previousLeaderboard.length === 0) return changes;

    const prevRankMap = {};
    previousLeaderboard.forEach((p, i) => {
      prevRankMap[p.id] = i + 1;
    });

    leaderboard.forEach((p, i) => {
      const currentRank = i + 1;
      const prevRank = prevRankMap[p.id] || currentRank;
      const change = prevRank - currentRank;
      changes[p.id] = {
        change,
        prevRank,
        currentRank,
        prevScore: previousLeaderboard.find(pp => pp.id === p.id)?.score || 0,
      };
    });

    return changes;
  }, [leaderboard, previousLeaderboard]);

  // Animate score counters
  useEffect(() => {
    const targets = {};
    leaderboard.forEach(p => {
      const prevScore = rankChanges[p.id]?.prevScore || 0;
      const currentScore = p.score || 0;
      targets[p.id] = { from: prevScore, to: currentScore };
    });

    const duration = 1500;
    const startTime = Date.now();
    const initial = {};
    leaderboard.forEach(p => {
      initial[p.id] = targets[p.id]?.from || 0;
    });
    setAnimatedScores(initial);

    const frame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      const newScores = {};
      leaderboard.forEach(p => {
        const t = targets[p.id];
        if (t) {
          newScores[p.id] = Math.round(t.from + (t.to - t.from) * eased);
        }
      });
      setAnimatedScores(newScores);

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }, [leaderboard, rankChanges]);

  // Stagger reveal rows
  useEffect(() => {
    const t = setTimeout(() => setShowRows(true), 200);
    return () => clearTimeout(t);
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: '👑', cls: styles.gold };
    if (rank === 2) return { emoji: '🥈', cls: styles.silver };
    if (rank === 3) return { emoji: '🥉', cls: styles.bronze };
    return { emoji: String(rank), cls: styles.normal };
  };

  // Check if myPlayer is outside top 10
  const top10Ids = leaderboard.slice(0, 10).map(p => p.id);
  const myRealIndex = leaderboard.findIndex(p => p.id === myPlayerId);
  const myIsOutsideTop10 = myPlayerId && myRealIndex >= 10;
  const myPlayerData = myIsOutsideTop10 ? leaderboard[myRealIndex] : null;
  const myRealRank = myRealIndex + 1;

  const renderRow = (player, rank, i, forceMe = false) => {
    const rc = rankChanges[player.id];
    const change = rc?.change || 0;
    const rp = roundPoints[player.id] || 0;
    const badge = getRankBadge(rank);
    const scoreBarWidth = maxScore > 0
      ? Math.max(5, ((player.score || 0) / maxScore) * 100)
      : 5;
    const isMe = player.id === myPlayerId || forceMe;

    let animClass = '';
    if (change > 0) animClass = styles.rankUp;
    else if (change < 0) animClass = styles.rankDown;

    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.6 }}
        key={player.id}
        className={`${styles.row} ${isMe ? styles.isMe : ''} ${animClass} ${showRows ? styles.visible : ''}`}
        style={{ '--delay': `${i * 0.07}s`, '--rank-color': rank <= 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][rank - 1] : 'rgba(255,255,255,0.15)' }}
      >
        {/* Rank Badge */}
        <div className={`${styles.rankBadge} ${badge.cls}`}>
          <span className={styles.rankContent}>{badge.emoji}</span>
          {change !== 0 && (
            <div className={`${styles.changeIndicator} ${change > 0 ? styles.changeUp : styles.changeDown}`}>
              {change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className={`${styles.avatar} ${rank <= 3 ? styles.topAvatar : ''}`}>
          <AvatarDisplay avatar={player.avatar_emoji} className={styles.avatarInner} />
        </div>

        {/* Player Info */}
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{player.player_name}</span>
            {player.streak >= 3 && (
              <span className={styles.streak}>🔥{player.streak}</span>
            )}
          </div>
          <div className={styles.scoreBarTrack}>
            <div
              className={styles.scoreBarFill}
              style={{ width: `${scoreBarWidth}%`, '--bar-color': rank <= 3 ? ['#ffd700', '#94a3b8', '#cd7f32'][rank - 1] : '#6c5ce7' }}
            />
          </div>
        </div>

        {/* Score */}
        <div className={styles.scoreArea}>
          <span className={`${styles.score} ${rank <= 3 ? styles.topScore : ''}`}>
            {(animatedScores[player.id] ?? player.score ?? 0).toLocaleString()}
          </span>
          <span className={`${styles.roundPts} ${rp === 0 ? styles.zeroPts : ''}`}>
            +{rp}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={styles.page}>
      {/* Animated background particles */}
      <div className={styles.particles}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
            '--size': `${4 + Math.random() * 8}px`,
          }} />
        ))}
      </div>

      {/* Host Controls — top right */}
      {isHost && (
        <div className={styles.controls}>
          {isLastQuestion ? (
            <button className={styles.nextBtn} onClick={onEnd}>
              <span className={styles.btnIcon}>🏁</span>
              <span>Xem Kết Quả</span>
            </button>
          ) : (
            <button className={styles.nextBtn} onClick={onNext}>
              <span className={styles.btnIcon}>➡️</span>
              <span>Câu Tiếp Theo</span>
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>🏆</div>
        <h1 className={styles.title}>Bảng Xếp Hạng</h1>
        <div className={styles.questionBadge}>
          Câu {currentQ + 1} / {totalQ}
        </div>
      </div>

      {/* Leaderboard — Top 10 */}
      <div className={styles.board}>
        {leaderboard.slice(0, 10).map((player, i) => renderRow(player, i + 1, i))}

        {/* My rank if outside top 10 */}
        {myIsOutsideTop10 && myPlayerData && (
          <>
            <div className={styles.separator}>
              <span className={styles.separatorDots}>•••</span>
            </div>
            {renderRow(myPlayerData, myRealRank, 10, true)}
          </>
        )}
      </div>
    </div>
  );
}
