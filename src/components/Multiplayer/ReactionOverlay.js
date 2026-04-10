'use client';

import styles from './Multiplayer.module.css';

const REACTION_EMOJIS = ['👏', '❤️', '😂', '🔥', '💯', '😱', '🎉', '💀'];

export default function ReactionOverlay({ reactions, onSendReaction, showBar = true }) {
  return (
    <>
      {/* Floating reaction bubbles */}
      <div className={styles.reactionContainer}>
        {reactions.map(r => (
          <div key={r.id} className={styles.reactionBubble}>
            <span className={styles.reactionEmoji}>{r.emoji}</span>
            <span className={styles.reactionName}>{r.playerName}</span>
          </div>
        ))}
      </div>

      {/* Reaction buttons */}
      {showBar && (
        <div className={styles.reactionBar}>
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className={styles.reactionBtn}
              onClick={() => onSendReaction?.(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
