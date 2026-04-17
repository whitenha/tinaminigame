import React, { useEffect, useState, useMemo, useCallback } from 'react';
import MultipleChoiceBoard from './MultipleChoiceBoard';
import { useGameshowRace } from '@/lib/multiplayer/useGameshowRace';
import { ITEM_CATALOG, isPassiveItem, needsTargetPicker, itemLabel } from '@/lib/multiplayer/itemCatalog';
import useRoomStore from '@/lib/multiplayer/roomStore';
import styles from './GameshowRace.module.css';

export default function GameshowRacePlayer({ mp, items }: any) {
  const {
    state, feedback, itemNotification, submitAnswer, useItem,
    answerHelpQuestion, reverseWords,
  } = useGameshowRace(items, mp);

  // Target picker modal state
  const [targetModal, setTargetModal] = useState<{ itemId: string; slotIdx: number } | null>(null);

  // Other players list for target picker
  const otherPlayers = useMemo(() => {
    const allPlayers = (useRoomStore.getState() as any).players as any[];
    return (allPlayers || []).filter((p: any) =>
      p.id !== mp.playerId && !p.is_host && p.player_name !== 'Host Teacher'
    );
  }, [mp.playerId, targetModal]);

  // Timer derived from server's race_started_at
  const [timeLeft, setTimeLeft] = useState(state.raceDurationSec);

  useEffect(() => {
    const getRemaining = () => {
      if (!state.raceStartedAt) {
        const base = mp.questionStartTime || Date.now();
        const elapsed = Math.floor((Date.now() - base) / 1000);
        return Math.max(0, state.raceDurationSec - elapsed);
      }
      const elapsed = Math.floor((Date.now() - state.raceStartedAt) / 1000);
      return Math.max(0, state.raceDurationSec - elapsed);
    };
    setTimeLeft(getRemaining());
    const iv = setInterval(() => {
      const remaining = getRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [state.raceStartedAt, state.raceDurationSec, mp.questionStartTime]);

  // ── Determine current question (normal or review) ──────────
  const isReview = state.isReviewMode;
  const currentQIndex = isReview
    ? state.reviewQuestionIndex
    : Math.min(state.currentQuestionIndex, items.length - 1);
  const currentQ = items[currentQIndex];

  // Shuffle options once per question change
  const shuffledOptions = useMemo(() => {
    if (!currentQ?.options) return [];
    const opts = currentQ.options.map((opt: any, index: number) => ({
      text: typeof opt === 'string' ? opt : opt?.text || '',
      originalIndex: index,
    }));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentQuestionIndex, state.isReviewMode, state.reviewQuestionIndex]);

  // Help modal shuffled options
  const helpQuestion = useMemo(() => {
    if (!state.helpModal) return null;
    const qIdx = state.helpModal.questionIndices[state.helpModal.currentIndex];
    return items[qIdx] || null;
  }, [state.helpModal, items]);

  const helpShuffledOptions = useMemo(() => {
    if (!helpQuestion?.options) return [];
    const opts = helpQuestion.options.map((opt: any, index: number) => ({
      text: typeof opt === 'string' ? opt : opt?.text || '',
      originalIndex: index,
    }));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helpQuestion, state.helpModal?.currentIndex]);

  const handleAnswer = (originalIndex: number) => {
    if (state.isLocked || state.isFinished || state.isSubmitting) return;
    if (state.earthquakeUntil && Date.now() < state.earthquakeUntil) return;
    if (state.stunUntil && Date.now() < state.stunUntil) return;
    submitAnswer(originalIndex);
  };

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;

  // Lock countdown for display
  const [lockDisplay, setLockDisplay] = useState(0);
  useEffect(() => {
    if (!state.lockUntil) { setLockDisplay(0); return; }
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((state.lockUntil! - Date.now()) / 1000));
      setLockDisplay(left);
      if (left <= 0) clearInterval(iv);
    }, 250);
    return () => clearInterval(iv);
  }, [state.lockUntil]);

  // Pending activation countdown
  const [pendingCountdown, setPendingCountdown] = useState(0);
  useEffect(() => {
    if (!state.pendingActivation) { setPendingCountdown(0); return; }
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((state.pendingActivation!.activatesAt - Date.now()) / 1000));
      setPendingCountdown(left);
      if (left <= 0) clearInterval(iv);
    }, 250);
    return () => clearInterval(iv);
  }, [state.pendingActivation]);

  // Earthquake countdown
  const [earthquakeLeft, setEarthquakeLeft] = useState(0);
  useEffect(() => {
    if (!state.earthquakeUntil) { setEarthquakeLeft(0); return; }
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((state.earthquakeUntil! - Date.now()) / 1000));
      setEarthquakeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 250);
    return () => clearInterval(iv);
  }, [state.earthquakeUntil]);

  // Fog active check
  const fogActive = state.fogUntil ? Date.now() < state.fogUntil : false;
  // Earthquake active check
  const earthquakeActive = state.earthquakeUntil ? Date.now() < state.earthquakeUntil : false;
  // Time Bomb active check
  const timeBombActive = state.timeBombUntil ? Date.now() < state.timeBombUntil : false;
  // Stun active check
  const stunActive = state.stunUntil ? Date.now() < state.stunUntil : false;

  // Handle item button click
  const handleItemClick = (item: string, slotIdx: number) => {
    if (!item) return;
    const def = ITEM_CATALOG[item];
    if (!def) return;

    // Passive items can't be clicked
    if (def.type === 'passive') return;

    // Self/random/global items: use directly
    if (def.target === 'self' || def.target === 'random' || def.target === 'global' || def.target === 'global_all') {
      useItem(item);
      return;
    }

    // Target items: open target picker
    if (def.target === 'pick_target') {
      setTargetModal({ itemId: item, slotIdx });
    }
  };

  // Finished screen
  if (state.isFinished || timeLeft <= 0) {
    return (
      <div className={styles.playerContainer}>
        <div className={styles.finishScreen}>
           <h2>🏁 Cán Đích!</h2>
           <p>Đang đợi các người chơi khác...</p>
           <div className={styles.summaryBox}>
             <p>Điểm của bạn: <b>{state.score.toLocaleString()}</b></p>
             <p>Số câu đúng: <b>{state.correctCount}/{state.totalAttempted}</b></p>
             <p>Streak: <b>{state.streak}</b></p>
           </div>
        </div>
      </div>
    );
  }

  // Question text with optional reverse
  let questionText = currentQ?.term || currentQ?.question || '';
  if (state.reverseTextRemaining > 0 && !isReview) {
    questionText = reverseWords(questionText);
  }

  // Determine frozen buttons (mapped from shuffled order)
  const isFrozen = state.frozenUntil ? Date.now() < state.frozenUntil : false;

  return (
    <div className={styles.playerContainer}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.progressCounter}>
          {isReview ? '⭐ Ôn Tập' : `Câu ${state.currentQuestionIndex + 1}/${items.length}`}
        </div>
        <div className={`${styles.timer} ${timeLeft < 30 ? styles.timerPulse : ''}`}>⏱ {timeStr}</div>
        <div className={styles.scorePill}>⭐ {state.score.toLocaleString()}</div>
      </div>

      {/* Active effect indicators */}
      <div className={styles.effectBar}>
        {state.mirrorUntil && Date.now() < state.mirrorUntil && (
          <span className={styles.effectTag}>🪞 Gương</span>
        )}
        {state.invisibleUntil && Date.now() < state.invisibleUntil && (
          <span className={styles.effectTag}>👻 Tàng Hình</span>
        )}
        {timeBombActive && (
          <span className={`${styles.effectTag} ${styles.effectDanger}`}>💣 BOM!</span>
        )}
        {state.reverseTextRemaining > 0 && (
          <span className={`${styles.effectTag} ${styles.effectDanger}`}>✒️ Nhiễm ({state.reverseTextRemaining})</span>
        )}
        {state.streak >= 3 && (
          <span className={styles.effectTag}>🔥 Streak {state.streak}</span>
        )}
      </div>

      {/* Review question banner */}
      {isReview && (
        <div className={styles.reviewBanner}>
          <span className={styles.reviewIcon}>🔄</span>
          <span>CÂU ÔN TẬP — Trả lời đúng để nhận vật phẩm!</span>
        </div>
      )}

      {/* Question Content */}
      <div className={`${styles.questionSection} ${fogActive ? styles.fogEffect : ''}`}>
        {currentQ?.image_url && (
          <img
            src={currentQ.image_url}
            alt=""
            style={{ maxHeight: 180, borderRadius: 16, marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
          />
        )}
        <h2 className={styles.questionText}>{questionText}</h2>
      </div>

      {/* Multiple Choice Grid */}
      <div className={`${styles.optionsWrapper} ${fogActive ? styles.fogEffect : ''} ${earthquakeActive ? styles.earthquakeShake : ''}`}>
        <MultipleChoiceBoard
          shuffledOptions={shuffledOptions}
          eliminatedOptions={[]}
          selectedAnswer={null}
          showFeedback={feedback !== null}
          answerRevealed={feedback !== null}
          answeredThisQ={feedback !== null}
          isShareScreen={false}
          handleAnswer={handleAnswer}
          frozenButtons={isFrozen ? state.frozenButtons : []}
          earthquakeActive={earthquakeActive}
        />
      </div>

      {/* Inventory Bar */}
      <div className={styles.inventoryBar}>
        <h4>Túi đồ</h4>
        <div className={styles.inventorySlots}>
          {[0, 1].map((slotIdx) => {
            const item = state.inventory[slotIdx];
            const def = item ? ITEM_CATALOG[item] : null;
            return (
              <button
                key={slotIdx}
                className={`${styles.itemSlot} ${item ? styles.itemSlotFilled : ''} ${def?.type === 'passive' ? styles.itemSlotPassive : ''}`}
                onClick={() => item && handleItemClick(item, slotIdx)}
                disabled={!item || def?.type === 'passive'}
                title={def?.description || ''}
              >
                {def ? `${def.emoji} ${def.name}` : 'Trống'}
                {def?.type === 'passive' && <span className={styles.passiveBadge}>Tự động</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ WRONG ANSWER: Full Red Screen Overlay + Lock ═══ */}
      {state.isLocked && feedback && !feedback.isCorrect && lockDisplay > 0 && !stunActive && (
        <div className={styles.redOverlay}>
          <h2>❌ Sai rồi!</h2>
          {feedback.saveStreakUsed && (
            <p style={{ color: '#fbbf24', fontSize: 18 }}>🩺 Cứu Viện đã bảo vệ streak!</p>
          )}
          {feedback.timeBombPenalty > 0 && (
            <p style={{ color: '#ef4444', fontSize: 22 }}>💣 -{feedback.timeBombPenalty.toLocaleString()}đ</p>
          )}
          <p>Bị phạt chờ {lockDisplay} giây</p>
        </div>
      )}

      {/* Stun overlay (from mirror reflection / help wrong) */}
      {stunActive && (
        <div className={styles.redOverlay} style={{ background: 'rgba(139, 92, 246, 0.9)' }}>
          <h2>💫 Bị choáng!</h2>
          <p>{lockDisplay}s</p>
        </div>
      )}

      {/* Smoke Bomb overlay */}
      {state.isLocked && (!feedback || feedback.isCorrect) && !stunActive && lockDisplay > 0 && (
        <div className={styles.redOverlay} style={{ background: 'rgba(14, 165, 233, 0.9)' }}>
          <h2>💨 Bị tấn công!</h2>
          <p>Đang bị khói mù... {lockDisplay}s</p>
        </div>
      )}

      {/* Earthquake overlay */}
      {earthquakeActive && (
        <div className={styles.earthquakeOverlay}>
          <h2>🌍 Động Đất!</h2>
          <p>Không thể chọn đáp án... {earthquakeLeft}s</p>
        </div>
      )}

      {/* CORRECT ANSWER FLASH */}
      {feedback && feedback.isCorrect && (
        <div className={styles.correctFlash}>
          {feedback.points ? <span>+{feedback.points.toLocaleString()}</span> : null}
          {feedback.isReview && feedback.itemGiven && (
            <span className={styles.itemBounce}>
              {ITEM_CATALOG[feedback.itemGiven]?.emoji || '🎁'} Nhận {ITEM_CATALOG[feedback.itemGiven]?.name || 'vật phẩm'}!
            </span>
          )}
          {feedback.isReview && !feedback.itemGiven && (
            <span className={styles.itemBounce}>✅ Đúng rồi!</span>
          )}
        </div>
      )}

      {/* Item notification */}
      {itemNotification && (
        <div className={styles.itemGivenOverlay}>
          <h3>🎁 Vật Phẩm Mới!</h3>
          <p>{itemNotification.itemName}</p>
        </div>
      )}

      {/* ═══ PENDING ACTIVATION (5s countdown) ═══ */}
      {state.pendingActivation && pendingCountdown > 0 && (
        <div className={styles.pendingOverlay}>
          <div className={styles.pendingCard}>
            <div className={styles.pendingEmoji}>{state.pendingActivation.emoji}</div>
            <div className={styles.pendingText}>
              {state.pendingActivation.fromPlayer} đang kích hoạt {state.pendingActivation.itemName}
            </div>
            <div className={styles.pendingCountdown}>{pendingCountdown}</div>
          </div>
        </div>
      )}

      {/* ═══ HELP MODAL (target player answers 2 questions) ═══ */}
      {state.helpModal && helpQuestion && (
        <div className={styles.helpModalBackdrop}>
          <div className={styles.helpModalContent}>
            <h3>🤝 {state.helpModal.fromPlayerName} cần bạn giúp đỡ!</h3>
            <p className={styles.helpSubtitle}>
              Câu {state.helpModal.currentIndex + 1}/2 — Đúng = họ +1000đ, Sai = bạn bị 5s đỏ
            </p>
            <h4 className={styles.helpQuestion}>{helpQuestion.term || helpQuestion.question}</h4>
            <div className={styles.helpOptions}>
              {helpShuffledOptions.map((opt: any, i: number) => (
                <button
                  key={i}
                  className={styles.helpOptionBtn}
                  onClick={() => answerHelpQuestion(opt.originalIndex)}
                >
                  {['A', 'B', 'C', 'D'][i]}. {opt.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TARGET PICKER MODAL ═══ */}
      {targetModal && (
        <div className={styles.targetModalBackdrop} onClick={() => setTargetModal(null)}>
          <div className={styles.targetModal} onClick={e => e.stopPropagation()}>
            <h3>{ITEM_CATALOG[targetModal.itemId]?.emoji} Chọn mục tiêu: {ITEM_CATALOG[targetModal.itemId]?.name}</h3>
            <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
              {ITEM_CATALOG[targetModal.itemId]?.description}
            </p>
            <div className={styles.targetList}>
              {otherPlayers.map((p: any) => (
                <button
                  key={p.id}
                  className={styles.targetItem}
                  onClick={() => {
                    useItem(targetModal.itemId, p.id);
                    setTargetModal(null);
                  }}
                >
                  <span className={styles.targetAvatar}>
                    {p.avatar_emoji?.startsWith('/') ? (
                      <img src={p.avatar_emoji} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                    ) : (p.avatar_emoji || '👤')}
                  </span>
                  <span className={styles.targetName}>{p.player_name || 'Player'}</span>
                </button>
              ))}
              {otherPlayers.length === 0 && <p style={{ opacity: 0.6 }}>Không có người chơi khác</p>}
            </div>
            <button className={styles.targetCancel} onClick={() => setTargetModal(null)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {state.isSubmitting && (
        <div className={styles.submittingIndicator}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
}
