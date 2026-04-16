'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from '@/games/spelltheword/SpellTheWordPlayer.module.css';
import { speak as ttsSpeak, cancelSpeech as ttsCancelSpeech, preloadVoices } from '@/lib/tts';

export default function MultiplayerSpellBoard({
  item,
  handleAnswer,
  answeredThisQ,
  isShareScreen,
  showFeedback
}: any) {
  const [localPhase, setLocalPhase] = useState('preview');
  const [revealedLetters, setRevealedLetters] = useState<any[]>([]);
  const [previewProgress, setPreviewProgress] = useState(100);

  const [pieces, setPieces] = useState<any[]>([]);
  const [placedPieces, setPlacedPieces] = useState<any[]>([]);
  const [correctOrder, setCorrectOrder] = useState<any[]>([]);

  const previewTimerRef = useRef<any>(null);
  const previewStartRef = useRef<any>(null);

  // ── Text-To-Speech Helpers ─────────────────────────────────
  useEffect(() => { preloadVoices(); }, []);

  const speakText = useCallback((text: any) => {
    ttsSpeak(text);
  }, []);

  const cancelSpeech = useCallback(() => {
    ttsCancelSpeech();
  }, []);

  // Initialize board when item changes
  useEffect(() => {
    if (!item || !item.term) return;

    const wordLetters = item.term.split('');
    const shuffled = [...wordLetters];

    // Simple shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setCorrectOrder(wordLetters);
    setPieces(shuffled);
    setPlacedPieces([]);

    // Start Preview Phase
    let cleanup = null;
    if (!isShareScreen) {
      cleanup = startPreview(wordLetters);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [item, isShareScreen]);

  const startPreview = (word: any) => {
    const LETTER_DELAY = 1200;
    const FINAL_WORD_WAIT = 1000;
    const MEMORIZE_WAIT = 2000;
    const duration = 400 + (word.length * LETTER_DELAY) + FINAL_WORD_WAIT + MEMORIZE_WAIT;

    setLocalPhase('preview');
    setRevealedLetters([]);
    setPreviewProgress(100);
    previewStartRef.current = Date.now();
    cancelSpeech();

    // @ts-ignore
    const timeouts = [];

    // Reveal letters one by one and pronounce
    word.forEach((letter: any, idx: any) => {
      const tId = setTimeout(() => {
        setRevealedLetters(prev => [...prev, idx]);
        speakText(letter);
      }, 400 + idx * LETTER_DELAY);
      timeouts.push(tId);
    });

    // Pronounce the whole word before hiding
    const tWord = setTimeout(() => {
      speakText(word.join(''));
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
      // @ts-ignore
      timeouts.forEach(t => clearTimeout(t));
      cancelSpeech();
    };
  };

  const isLocked = answeredThisQ || showFeedback || isShareScreen || localPhase === 'preview';

  const placePiece = (idx: any) => {
    if (isLocked) return;
    const letter = pieces[idx];
    setPlacedPieces(prev => [...prev, letter]);
    setPieces(prev => prev.filter((_, i) => i !== idx));
  };

  const removePlaced = (idx: any) => {
    if (isLocked) return;
    const letter = placedPieces[idx];
    setPieces(prev => [...prev, letter]);
    setPlacedPieces(prev => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    if (isLocked) return;
    setPieces(prev => [...prev, ...placedPieces]);
    setPlacedPieces([]);
  };

  const submitAnswer = () => {
    if (isLocked) return;

    // Check if the placed pieces match the correct word
    const isCorrect = placedPieces.join('').toLowerCase() === correctOrder.join('').toLowerCase();

    // 0 = correct, -1 = wrong
    handleAnswer(isCorrect ? 0 : -1);
  };

  const totalSlots = correctOrder.length;
  const filledCount = placedPieces.length;
  const allPlaced = pieces.length === 0;

  if (isShareScreen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 16px', marginTop: 40 }}>
        {/* Host sees nothing here since the word is displayed on their main screen */}
      </div>
    );
  }

  // ── PREVIEW PHASE ──────────────────────────────────────────
  if (localPhase === 'preview') {
    return (
      <div className={styles.spellContent} style={{ width: '100%', maxWidth: '800px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className={styles.previewContainer} style={{ background: 'transparent' }}>
          <div className={styles.previewLabel} style={{ color: 'white', textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}>
            👀 Quan sát & Ghi nhớ
          </div>

          <div className={styles.previewWordRow} style={{ marginTop: 40 }}>
            {correctOrder.map((letter, idx) => (
              <div
                key={`preview-${idx}`}
                className={`${styles.previewLetter} ${revealedLetters.includes(idx) ? styles.letterVisible : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {letter.toUpperCase()}
              </div>
            ))}
          </div>

          <div className={styles.previewProgress} style={{ marginTop: 40, width: '100%', maxWidth: 400, margin: '40px auto 0' }}>
            <div className={styles.previewProgressBar} style={{ width: `${previewProgress}%` }} />
          </div>

          <div className={styles.previewMemorize} style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 20 }}>
            Hãy ghi nhớ từ này...
          </div>
        </div>
      </div>
    );
  }

  // ── SPELL PHASE ────────────────────────────────────────────
  return (
    <div className={styles.spellContent} style={{ width: '100%', maxWidth: '800px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

      <div className={styles.wordLengthBadge} style={{ alignSelf: 'center', marginBottom: 20 }}>
        📏 {totalSlots} chữ cái
      </div>

      {/* Answer Slots */}
      <div className={styles.slotsContainer}>
        <div className={styles.slotsRow}>
          {/* Filled slots */}
          {placedPieces.map((letter, i) => {
            let slotClass = `${styles.slot} ${styles.slotFilled}`;
            if (showFeedback && isLocked) {
              slotClass += letter.toLowerCase() === correctOrder[i]?.toLowerCase()
                ? ` ${styles.slotCorrect}`
                : ` ${styles.slotWrong}`;
            }
            return (
              <button
                key={`slot-${i}`}
                className={slotClass}
                onClick={() => removePlaced(i)}
                disabled={isLocked}
                style={showFeedback ? { animationDelay: `${i * 0.08}s` } : {}}
              >
                <span className={styles.slotIndex}>{i + 1}</span>
                {letter.toUpperCase()}
              </button>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, totalSlots - filledCount) }, (_, i) => (
            <div
              key={`empty-${i}`}
              className={`${styles.slot} ${styles.slotEmpty} ${i === 0 && !isLocked ? styles.slotNext : ''}`}
            >
              <span className={styles.slotIndex}>{filledCount + i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrambled Letter Tiles */}
      {!isLocked && (
        <div className={styles.tilesArea}>
          <div className={styles.tilesLabel}>Chữ cái có sẵn</div>
          <div className={styles.tilesRow}>
            {pieces.map((letter, i) => (
              <button
                key={`tile-${i}`}
                className={styles.tile}
                onClick={() => placePiece(i)}
                disabled={isLocked}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {letter.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionRow} style={{ marginTop: 'auto', paddingBottom: 20 }}>
        {!isLocked && (
          <>
            {filledCount > 0 && (
              <button className={styles.clearBtn} onClick={clearAll}>
                🔄 Xóa hết
              </button>
            )}

            <button
              className={styles.checkBtn}
              onClick={submitAnswer}
              disabled={!allPlaced}
            >
              GỬI ĐÁP ÁN
            </button>
          </>
        )}

        {answeredThisQ && !showFeedback && (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 18, marginTop: 10, width: '100%', textAlign: 'center' }}>
            ⏳ Đang chờ người khác...
          </div>
        )}
      </div>

    </div>
  );
}
