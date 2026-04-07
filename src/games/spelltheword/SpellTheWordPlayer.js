'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrderingEngine } from '@/lib/engines/useOrderingEngine';
import { CountdownScreen, GameTopBar, TimerBar, TimerBubble, ResultScreen } from '@/components/GameShell';
import styles from './SpellTheWordPlayer.module.css';

// ── Confetti Colors ──────────────────────────────────────────
const CONFETTI_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#fbbf24'];

function ConfettiBurst() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 30 - 10}%`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: `${Math.random() * 0.5}s`,
    rotation: `${Math.random() * 360}deg`,
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className={styles.confettiBurst}>
      {pieces.map(p => (
        <div
          key={p.id}
          className={styles.confettiPiece}
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export default function SpellTheWordPlayer({ items, activity, playerName }) {
  // ── Phase: 'preview' → 'spell' (engine handles countdown/result) ──
  const [localPhase, setLocalPhase] = useState('preview');
  const [revealedLetters, setRevealedLetters] = useState([]);
  const [previewProgress, setPreviewProgress] = useState(100);
  const [showConfetti, setShowConfetti] = useState(false);
  const previewTimerRef = useRef(null);
  const previewStartRef = useRef(null);

  const engine = useOrderingEngine(items, {
    musicType: 'calm',
    mode: 'letters',
    defaultTimeLimit: 120, // 2 minutes default
    feedbackDelay: 2800,
  });

  // ── Text-To-Speech Helpers ─────────────────────────────────
  const speakText = useCallback((text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // Bắt buộc giọng Anh - Mỹ
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ── Preview Phase Logic ────────────────────────────────────
  const startPreview = useCallback(() => {
    const item = items[engine.currentQ];
    if (!item) return;

    const word = (item.term || '').split('');
    const LETTER_DELAY = 1200; // Tăng lên 1200ms để âm thanh TTS theo kịp tốc độ hiện chữ
    const FINAL_WORD_WAIT = 1000; // Đợi 1000ms sau chữ cái cuối trước khi đọc cả từ
    const MEMORIZE_WAIT = 2000; // Thêm 2 giây ghi nhớ sau khi đọc xong
    const duration = 400 + (word.length * LETTER_DELAY) + FINAL_WORD_WAIT + MEMORIZE_WAIT;

    setLocalPhase('preview');
    setRevealedLetters([]);
    setPreviewProgress(100);
    previewStartRef.current = Date.now();
    cancelSpeech();

    const timeouts = [];

    // Reveal letters one by one and pronounce
    word.forEach((letter, idx) => {
      const tId = setTimeout(() => {
        setRevealedLetters(prev => [...prev, idx]);
        speakText(letter); // Phát âm kí tự
      }, 400 + idx * LETTER_DELAY);
      timeouts.push(tId);
    });

    // Pronounce the whole word before hiding
    const tWord = setTimeout(() => {
      speakText(item.term);
    }, 400 + word.length * LETTER_DELAY + FINAL_WORD_WAIT);
    timeouts.push(tWord);

    // Progress bar countdown
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - previewStartRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setPreviewProgress(remaining);
      if (remaining <= 0) clearInterval(progressInterval);
    }, 50);

    // Transition to spell phase
    previewTimerRef.current = setTimeout(() => {
      clearInterval(progressInterval);
      setLocalPhase('spell');
    }, duration);

    return () => {
      clearTimeout(previewTimerRef.current);
      clearInterval(progressInterval);
      timeouts.forEach(t => clearTimeout(t));
      cancelSpeech();
    };
  }, [items, engine.currentQ, speakText, cancelSpeech]);

  // Start preview on each new question
  useEffect(() => {
    if (engine.phase === 'playing') {
      const cleanup = startPreview();
      return cleanup;
    }
  }, [engine.phase, engine.currentQ, startPreview]);

  // Show confetti and speak correct word
  useEffect(() => {
    if (engine.showFeedback && engine.isCorrect) {
      setShowConfetti(true);
      
      const item = items[engine.currentQ];
      if (item && item.term) {
        speakText(item.term); // Đọc lại từ khi đánh vần đúng
      }

      const t = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(t);
    }
  }, [engine.showFeedback, engine.isCorrect, engine.currentQ, items, speakText]);

  // Reset to preview on next question
  useEffect(() => {
    if (!engine.showFeedback && engine.phase === 'playing') {
      setLocalPhase('preview');
    }
  }, [engine.currentQ]);

  // ── Clear all placed pieces ────────────────────────────────
  const clearAll = useCallback(() => {
    // Remove placed pieces in reverse to return them to tiles
    const count = engine.placedPieces.length;
    for (let i = count - 1; i >= 0; i--) {
      engine.removePlaced(i);
    }
  }, [engine]);

  // ── Countdown Screen ───────────────────────────────────────
  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Đánh Vần" emoji="✨" />;
  }

  // ── Result Screen ──────────────────────────────────────────
  if (engine.phase === 'result') {
    return <ResultScreen playerName={playerName} score={engine.score} answers={engine.answers} items={items} title="Kết Quả Đánh Vần" />;
  }

  const item = engine.currentItem;
  if (!item) return null;

  const word = (item.term || '').split('');
  const totalSlots = word.length;

  // ── PREVIEW PHASE ──────────────────────────────────────────
  if (localPhase === 'preview') {
    return (
      <div className={styles.gamePage}>
        <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
        <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

        <div className={styles.previewContainer}>
          <div className={styles.previewLabel}>
            👀 Quan sát & Ghi nhớ
          </div>

          {item.definition && (
            <div className={styles.previewDefinition}>
              💡 {item.definition}
            </div>
          )}

          <div className={styles.previewWordRow}>
            {word.map((letter, idx) => (
              <div
                key={`preview-${idx}`}
                className={`${styles.previewLetter} ${revealedLetters.includes(idx) ? styles.letterVisible : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {letter.toUpperCase()}
              </div>
            ))}
          </div>

          <div className={styles.previewProgress}>
            <div className={styles.previewProgressBar} style={{ width: `${previewProgress}%` }} />
          </div>

          <div className={styles.previewMemorize}>
            Hãy ghi nhớ từ này...
          </div>
        </div>
      </div>
    );
  }

  // ── SPELL PHASE ────────────────────────────────────────────
  const filledCount = engine.placedPieces.length;
  const allPlaced = engine.pieces.length === 0;

  return (
    <div className={styles.gamePage}>
      <GameTopBar counter={engine.counterLabel} playerName={playerName} score={engine.score} streak={engine.streak} />
      <TimerBar timeLeft={engine.timeLeft} maxTime={engine.maxTime} />

      {showConfetti && <ConfettiBurst />}

      <div className={styles.spellContent}>
        {/* Definition hint */}
        {item.definition && (
          <div className={styles.definitionHint}>
            <div className={styles.definitionLabel}>Gợi ý nghĩa</div>
            <div className={styles.definitionText}>{item.definition}</div>
          </div>
        )}

        <div className={styles.wordLengthBadge}>
          📏 {totalSlots} chữ cái
        </div>

        {/* Answer Slots */}
        <div className={styles.slotsContainer}>
          <div className={styles.slotsRow}>
            {/* Filled slots */}
            {engine.placedPieces.map((letter, i) => {
              let slotClass = `${styles.slot} ${styles.slotFilled}`;
              if (engine.showFeedback) {
                slotClass += letter === engine.correctOrder[i]
                  ? ` ${styles.slotCorrect}`
                  : ` ${styles.slotWrong}`;
              }
              return (
                <button
                  key={`slot-${i}`}
                  className={slotClass}
                  onClick={() => !engine.showFeedback && engine.removePlaced(i)}
                  disabled={engine.showFeedback}
                  style={engine.showFeedback ? { animationDelay: `${i * 0.08}s` } : {}}
                >
                  <span className={styles.slotIndex}>{i + 1}</span>
                  {letter.toUpperCase()}
                </button>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: totalSlots - filledCount }, (_, i) => (
              <div
                key={`empty-${i}`}
                className={`${styles.slot} ${styles.slotEmpty} ${i === 0 && !engine.showFeedback ? styles.slotNext : ''}`}
              >
                <span className={styles.slotIndex}>{filledCount + i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrambled Letter Tiles */}
        {!engine.showFeedback && (
          <div className={styles.tilesArea}>
            <div className={styles.tilesLabel}>Chữ cái có sẵn</div>
            <div className={styles.tilesRow}>
              {engine.pieces.map((letter, i) => (
                <button
                  key={`tile-${letter}-${i}`}
                  className={styles.tile}
                  onClick={() => engine.placePiece(i)}
                  disabled={engine.showFeedback}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {letter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {engine.showFeedback && (
          <div className={`${styles.feedbackMsg} ${engine.isCorrect ? styles.fbCorrect : styles.fbWrong}`}>
            {engine.isCorrect
              ? '🎉 Tuyệt vời! Bạn đã đánh vần chính xác!'
              : (
                <>
                  ❌ Chưa chính xác! Đáp án đúng:
                  <div className={styles.correctionWord}>
                    {engine.correctOrder.map((letter, i) => (
                      <span
                        key={`corr-${i}`}
                        className={styles.correctionLetter}
                        style={{ animationDelay: `${i * 0.08}s` }}
                      >
                        {letter.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* Action Buttons */}
        {!engine.showFeedback && (
          <div className={styles.actionRow}>
            <button
              className={`${styles.hintBtn} ${engine.hintUsed ? styles.hintUsed : ''}`}
              onClick={engine.useHint}
              disabled={engine.hintUsed}
            >
              💡 Gợi ý {engine.hintUsed ? '(Đã dùng)' : ''}
            </button>

            {filledCount > 0 && (
              <button className={styles.clearBtn} onClick={clearAll}>
                🔄 Xóa hết
              </button>
            )}

            <button
              className={styles.checkBtn}
              onClick={engine.checkOrder}
              disabled={!allPlaced}
            >
              ✓ KIỂM TRA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
