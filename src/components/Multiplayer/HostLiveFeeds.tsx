import React from 'react';
import styles from './MultiplayerRoom.module.css';
import AvatarDisplay from './AvatarDisplay';

const HostLiveFeeds = ({ isHost, wrongGuesses, correctPlayers, answerRevealed }: any) => {
  if (!isHost) return null;

  return (
    <>
      {wrongGuesses && wrongGuesses.length > 0 && (
        <div className={styles.wrongGuessesContainer}>
          {wrongGuesses.slice(-8).map((guess: any) => (
            <div key={guess.id} className={styles.wrongGuessBadge}>
              {guess.word}
            </div>
          ))}
        </div>
      )}

      {correctPlayers && correctPlayers.length > 0 && (
        <div className={styles.correctFeedContainer}>
          {correctPlayers.slice(-8).map((p: any, idx: any) => {
            let badgeStyle = {};
            if (answerRevealed) {
              badgeStyle = p.correct
                ? { background: 'rgba(46, 204, 113, 0.95)', boxShadow: '0 8px 24px rgba(46, 204, 113, 0.4)' }
                : { background: 'rgba(231, 76, 60, 0.95)', boxShadow: '0 8px 24px rgba(231, 76, 60, 0.4)' };
            }

            return (
              <div key={`${p.playerId}-${idx}`} className={styles.correctFeedBadge} style={badgeStyle}>
                <div className={styles.correctFeedAvatar}>
                  <AvatarDisplay avatar={p.avatar || '😎'} />
                </div>
                <span>{p.playerName}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default React.memo(HostLiveFeeds);
