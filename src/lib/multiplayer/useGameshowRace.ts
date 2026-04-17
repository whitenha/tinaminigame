/**
 * ============================================================
 * useGameshowRace — v5: 15-Item System
 * ============================================================
 * Features:
 *   - 15 items: Active + Passive, with 5s activation delay
 *   - Protection chain: Invisibility → Mirror → Shield
 *   - FIFO 2-slot inventory
 *   - Help modal for target player
 *   - Visual effects: freeze, fog, earthquake, reverse text, stun
 *   - Save Streak passive auto-trigger
 *   - Session persistence via sessionStorage
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useRoomStore from './roomStore';
import { ITEM_CATALOG, rollRandomItem, addToInventory, checkItemExpiry, itemLabel } from './itemCatalog';

// ─── Types ──────────────────────────────────────────────────

interface HelpModalState {
  fromPlayerId: string;
  fromPlayerName: string;
  questionIndices: number[];
  currentIndex: number;        // 0 or 1
}

interface PendingActivation {
  itemId: string;
  emoji: string;
  itemName: string;
  fromPlayer: string;
  activatesAt: number;
}

interface RaceState {
  currentQuestionIndex: number;
  score: number;
  correctCount: number;
  totalAttempted: number;
  streak: number;

  isLocked: boolean;
  lockUntil: number | null;

  inventory: string[];
  activeEffects: any[];

  isFinished: boolean;
  raceStartedAt: number | null;
  raceDurationSec: number;

  isSubmitting: boolean;

  // Review questions
  wrongAnswerIndices: number[];
  isReviewMode: boolean;
  reviewQuestionIndex: number;
  questionsAnsweredSinceReview: number;

  // ── Item effect states ──
  frozenButtons: number[];
  frozenUntil: number | null;
  reverseTextRemaining: number;
  fogUntil: number | null;
  earthquakeUntil: number | null;
  timeBombUntil: number | null;
  mirrorUntil: number | null;
  invisibleUntil: number | null;
  stunUntil: number | null;
  helpModal: HelpModalState | null;
  pendingActivation: PendingActivation | null;
}

// ─── Helpers ────────────────────────────────────────────────

function getChannel(): any {
  const store = useRoomStore.getState() as any;
  return store._refs?.channel || null;
}

function getSessionKey(roomId: string, playerId: string) {
  return `tina_race_${roomId}_${playerId}`;
}

function saveSession(roomId: string, playerId: string, state: any) {
  try {
    const key = getSessionKey(roomId, playerId);
    sessionStorage.setItem(key, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function loadSession(roomId: string, playerId: string): Partial<RaceState> | null {
  try {
    const key = getSessionKey(roomId, playerId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > 10 * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch { return null; }
}

function clearSession(roomId: string, playerId: string) {
  try { sessionStorage.removeItem(getSessionKey(roomId, playerId)); } catch {}
}

/** Reverse word order in a string: "How are you?" → "? you are How" */
function reverseWords(text: string): string {
  return text.split(/\s+/).reverse().join(' ');
}

// ═══════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════

export function useGameshowRace(items: any[], mp: any) {
  const [state, setState] = useState<RaceState>(() => {
    // Try restoring from session
    if (mp.roomId && mp.playerId) {
      const saved = loadSession(mp.roomId, mp.playerId);
      if (saved && saved.currentQuestionIndex !== undefined) {
        return {
          currentQuestionIndex: saved.currentQuestionIndex ?? 0,
          score: saved.score ?? 0,
          correctCount: saved.correctCount ?? 0,
          totalAttempted: saved.totalAttempted ?? 0,
          streak: saved.streak ?? 0,
          isLocked: false,
          lockUntil: null,
          inventory: saved.inventory ?? [],
          activeEffects: [],
          isFinished: saved.isFinished ?? false,
          raceStartedAt: saved.raceStartedAt ?? null,
          raceDurationSec: saved.raceDurationSec ?? mp.roomSettings?.raceDuration ?? 300,
          isSubmitting: false,
          wrongAnswerIndices: saved.wrongAnswerIndices ?? [],
          isReviewMode: false,
          reviewQuestionIndex: -1,
          questionsAnsweredSinceReview: saved.questionsAnsweredSinceReview ?? 0,
          // Item effects reset on reload
          frozenButtons: [],
          frozenUntil: null,
          reverseTextRemaining: 0,
          fogUntil: null,
          earthquakeUntil: null,
          timeBombUntil: null,
          mirrorUntil: null,
          invisibleUntil: null,
          stunUntil: null,
          helpModal: null,
          pendingActivation: null,
        };
      }
    }
    // Fresh start with 2 random items
    const initialInventory = [rollRandomItem(), rollRandomItem()];

    return {
      currentQuestionIndex: 0,
      score: 0,
      correctCount: 0,
      totalAttempted: 0,
      streak: 0,
      isLocked: false,
      lockUntil: null,
      inventory: initialInventory,
      activeEffects: [],
      isFinished: false,
      raceStartedAt: null,
      raceDurationSec: mp.roomSettings?.raceDuration || 300,
      isSubmitting: false,
      wrongAnswerIndices: [],
      isReviewMode: false,
      reviewQuestionIndex: -1,
      questionsAnsweredSinceReview: 0,
      frozenButtons: [],
      frozenUntil: null,
      reverseTextRemaining: 0,
      fogUntil: null,
      earthquakeUntil: null,
      timeBombUntil: null,
      mirrorUntil: null,
      invisibleUntil: null,
      stunUntil: null,
      helpModal: null,
      pendingActivation: null,
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // One-time sync of initial inventory to server
  useEffect(() => {
    if (!mp.isHost && mp.roomId && mp.playerId) {
      if (!window.sessionStorage.getItem(`init_sync_${mp.roomId}_${mp.playerId}`)) {
        fetch('/api/race', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_inventory',
            room_id: mp.roomId,
            player_id: mp.playerId,
            inventory: stateRef.current.inventory,
          }),
        }).catch(console.error);
        window.sessionStorage.setItem(`init_sync_${mp.roomId}_${mp.playerId}`, '1');
      }
    }
  }, [mp.isHost, mp.roomId, mp.playerId]);

  const [feedback, setFeedback] = useState<any>(null);
  const [itemNotification, setItemNotification] = useState<any>(null);

  // ── Persist state to sessionStorage ────────────────────────
  useEffect(() => {
    if (mp.roomId && mp.playerId) {
      saveSession(mp.roomId, mp.playerId, state);
    }
  }, [state, mp.roomId, mp.playerId]);

  // ── Sync own score to mp.players for podium ────────────────
  useEffect(() => {
    if (mp.playerId && state.score > 0) {
      const store = useRoomStore.getState() as any;
      store.setPlayers?.((prev: any) => prev.map((p: any) =>
        p.id === mp.playerId ? { ...p, score: state.score } : p
      ));
    }
  }, [state.score, mp.playerId]);

  // ── Listen for race_started broadcast from host ────────────
  useEffect(() => {
    if (mp.isHost) return;
    const onBroadcast = (e: any) => {
      if (e.detail?.event === 'race_started') {
        const payload = e.detail.payload;
        setState(prev => ({
          ...prev,
          raceStartedAt: new Date(payload.race_started_at).getTime(),
          raceDurationSec: payload.race_duration_sec || prev.raceDurationSec,
        }));
      }
    };
    window.addEventListener('tina_race_broadcast', onBroadcast);
    return () => window.removeEventListener('tina_race_broadcast', onBroadcast);
  }, [mp.isHost]);

  // ═══════════════════════════════════════════════════════════
  // ITEM EFFECT LISTENER — Unified handler for all 15 items
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (mp.isHost) return;

    const handler = (e: any) => {
      const { event, payload } = e.detail || {};
      if (!payload) return;

      // ── Race item effect (from any player) ──
      if (event === 'race_item_effect') {
        const { effectType, fromPlayerId, targetPlayerId, data, activatesAt } = payload;
        const targetsMe = targetPlayerId === mp.playerId;
        const iAmCaster = fromPlayerId === mp.playerId;
        const isGlobal = ['earthquake', 'fog'].includes(effectType);
        const isGlobalAll = effectType === 'time_bomb';
        const affectsMe = targetsMe || (isGlobal && !iAmCaster) || isGlobalAll;

        const delay = activatesAt ? Math.max(0, activatesAt - Date.now()) : 0;

        // Show pending notification to everyone
        if (delay > 0 && !iAmCaster) {
          const def = ITEM_CATALOG[effectType] || ITEM_CATALOG[data?.itemId];
          setState(prev => ({
            ...prev,
            pendingActivation: {
              itemId: effectType,
              emoji: def?.emoji || '⚡',
              itemName: def?.name || effectType,
              fromPlayer: data?.fromPlayerName || 'Ai đó',
              activatesAt: activatesAt,
            },
          }));
        }

        setTimeout(() => {
          // Clear pending notification
          setState(prev => ({
            ...prev,
            pendingActivation: prev.pendingActivation?.itemId === effectType ? null : prev.pendingActivation,
          }));

          // Apply effects
          switch (effectType) {
            case 'smoke_bomb':
              if (targetsMe) {
                setState(prev => ({ ...prev, isLocked: true, lockUntil: Date.now() + 3000 }));
              }
              break;

            case 'freeze':
              if (targetsMe && data?.frozenButtons) {
                setState(prev => ({
                  ...prev,
                  frozenButtons: data.frozenButtons,
                  frozenUntil: Date.now() + 10000,
                }));
              }
              break;

            case 'infect':
              if (targetsMe) {
                setState(prev => ({ ...prev, reverseTextRemaining: data?.duration || 3 }));
              }
              break;

            case 'earthquake':
              if (!iAmCaster) {
                setState(prev => ({ ...prev, earthquakeUntil: Date.now() + 5000 }));
              }
              break;

            case 'fog':
              if (!iAmCaster) {
                setState(prev => ({ ...prev, fogUntil: Date.now() + 10000 }));
              }
              break;

            case 'time_bomb':
              setState(prev => ({ ...prev, timeBombUntil: Date.now() + 20000 }));
              break;

            case 'vampire':
              if (targetsMe && data?.stolenScore) {
                setState(prev => ({ ...prev, score: prev.score - data.stolenScore }));
              }
              if (iAmCaster && data?.new_score !== undefined) {
                setState(prev => ({ ...prev, score: data.new_score }));
              }
              break;

            case 'thief':
              if (targetsMe && data?.stolenItem) {
                setState(prev => {
                  const newInv = [...prev.inventory];
                  const idx = newInv.indexOf(data.stolenItem);
                  if (idx >= 0) newInv.splice(idx, 1);
                  return { ...prev, inventory: newInv };
                });
              }
              if (iAmCaster && data?.newInventory) {
                setState(prev => ({ ...prev, inventory: data.newInventory }));
              }
              break;

            case 'reflected_by_mirror':
              if (iAmCaster) {
                setState(prev => ({
                  ...prev,
                  isLocked: true,
                  stunUntil: Date.now() + 5000,
                  lockUntil: Date.now() + 5000,
                }));
              }
              break;

            case 'skip':
              if (iAmCaster && data) {
                setState(prev => ({
                  ...prev,
                  score: data.new_score,
                  currentQuestionIndex: data.new_question,
                  correctCount: prev.correctCount + 1,
                  totalAttempted: prev.totalAttempted + 1,
                  isFinished: data.is_finished || false,
                }));
                broadcastToHost({
                  score: data.new_score,
                  currentQuestionIndex: data.new_question,
                  correctCount: stateRef.current.correctCount + 1,
                  totalAttempted: stateRef.current.totalAttempted + 1,
                  isFinished: data.is_finished || false,
                  streak: stateRef.current.streak,
                });
              }
              break;
          }
        }, delay);
      }

      // ── Help Request: show modal on target ──
      if (event === 'race_help_request') {
        if (payload.targetPlayerId === mp.playerId) {
          setState(prev => ({
            ...prev,
            helpModal: {
              fromPlayerId: payload.fromPlayerId,
              fromPlayerName: payload.fromPlayerName,
              questionIndices: payload.questionIndices,
              currentIndex: 0,
            },
          }));
        }
      }

      // ── Help Answer: caster receives points ──
      if (event === 'race_help_answer') {
        if (payload.toPlayerId === mp.playerId && payload.isCorrect) {
          setState(prev => ({ ...prev, score: prev.score + 1000 }));
          // Sync score to server
          fetch('/api/race', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reward_score',
              room_id: mp.roomId,
              player_id: mp.playerId,
              amount: 1000,
            }),
          }).catch(console.error);
          broadcastToHost({ score: stateRef.current.score + 1000 });
        }
      }
    };

    window.addEventListener('tina_race_broadcast', handler);
    return () => window.removeEventListener('tina_race_broadcast', handler);
  }, [mp.playerId, mp.isHost]);

  // ── Effect expiry timers ──────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        let changed = false;
        const next = { ...prev };

        if (prev.frozenUntil && now > prev.frozenUntil) {
          next.frozenButtons = [];
          next.frozenUntil = null;
          changed = true;
        }
        if (prev.fogUntil && now > prev.fogUntil) {
          next.fogUntil = null;
          changed = true;
        }
        if (prev.earthquakeUntil && now > prev.earthquakeUntil) {
          next.earthquakeUntil = null;
          changed = true;
        }
        if (prev.timeBombUntil && now > prev.timeBombUntil) {
          next.timeBombUntil = null;
          changed = true;
        }
        if (prev.mirrorUntil && now > prev.mirrorUntil) {
          next.mirrorUntil = null;
          changed = true;
        }
        if (prev.invisibleUntil && now > prev.invisibleUntil) {
          next.invisibleUntil = null;
          changed = true;
        }
        if (prev.stunUntil && now > prev.stunUntil) {
          next.stunUntil = null;
          next.isLocked = false;
          next.lockUntil = null;
          changed = true;
        }
        if (prev.lockUntil && now > prev.lockUntil) {
          next.isLocked = false;
          next.lockUntil = null;
          changed = true;
        }

        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  // ── Vampire Bat expiry check ──────────────────────────────
  useEffect(() => {
    const expired = checkItemExpiry(state.inventory, state.currentQuestionIndex, items.length);
    if (expired.length !== state.inventory.length) {
      setState(prev => ({ ...prev, inventory: expired }));
      // Sync to server
      fetch('/api/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_inventory',
          room_id: mp.roomId,
          player_id: mp.playerId,
          inventory: expired,
        }),
      }).catch(console.error);
    }
  }, [state.currentQuestionIndex, items.length]);

  // ── Reverse text counter: decrement on question advance ───
  useEffect(() => {
    if (state.reverseTextRemaining > 0) {
      // This effect runs on question change — decrement is handled in submitAnswer
    }
  }, [state.currentQuestionIndex]);

  // ═══════════════════════════════════════════════════════════
  // REVIEW QUESTION LOGIC
  // ═══════════════════════════════════════════════════════════
  function checkForReviewQuestion(updatedState: any): any {
    const nextCount = (updatedState.questionsAnsweredSinceReview || 0) + 1;
    if (nextCount >= 10 && updatedState.wrongAnswerIndices?.length > 0) {
      let reviewIdx = updatedState.wrongAnswerIndices[
        Math.floor(Math.random() * updatedState.wrongAnswerIndices.length)
      ];
      if (reviewIdx === undefined || reviewIdx < 0) {
        const maxQ = updatedState.currentQuestionIndex ?? stateRef.current.currentQuestionIndex;
        reviewIdx = Math.floor(Math.random() * Math.max(1, maxQ));
      }
      return {
        questionsAnsweredSinceReview: 0,
        isReviewMode: true,
        reviewQuestionIndex: reviewIdx,
      };
    }
    return {
      questionsAnsweredSinceReview: nextCount,
      isReviewMode: false,
      reviewQuestionIndex: -1,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SUBMIT ANSWER
  // ═══════════════════════════════════════════════════════════
  const submitAnswer = useCallback(async (selectedIndex: number) => {
    const st = stateRef.current;
    if (st.isSubmitting || st.isLocked || st.isFinished) return;
    // Block if earthquake is active (can't click answers)
    if (st.earthquakeUntil && Date.now() < st.earthquakeUntil) return;
    // Block if stun is active
    if (st.stunUntil && Date.now() < st.stunUntil) return;

    setState(prev => ({ ...prev, isSubmitting: true }));

    // ── Review mode: validate locally ──
    if (st.isReviewMode) {
      const isCorrect = selectedIndex === 0;

      if (isCorrect) {
        const droppedItem = rollRandomItem();
        const newInv = addToInventory(st.inventory, droppedItem);

        // Sync to server
        fetch('/api/race', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_inventory',
            room_id: mp.roomId,
            player_id: mp.playerId,
            inventory: newInv,
          }),
        }).catch(console.error);

        setState(prev => ({
          ...prev,
          isSubmitting: false,
          isReviewMode: false,
          reviewQuestionIndex: -1,
          inventory: newInv,
        }));

        setFeedback({
          isCorrect: true,
          points: 0,
          isReview: true,
          itemGiven: droppedItem,
        });

        setTimeout(() => setFeedback(null), 2000);
      } else {
        // Wrong review answer
        const lockUntil = Date.now() + 3000;
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          isLocked: true,
          lockUntil,
        }));
        setFeedback({ isCorrect: false, isReview: true });
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isLocked: false,
            lockUntil: null,
            isReviewMode: false,
            reviewQuestionIndex: -1,
          }));
          setFeedback(null);
        }, 3000);
      }
      return;
    }

    // ── Normal question: hit server ──
    try {
      const res = await fetch('/api/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_answer',
          room_id: mp.roomId,
          player_id: mp.playerId,
          question_index: st.currentQuestionIndex,
          selected_option_index: selectedIndex,
          total_questions: items.length,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.locked) {
          setState(prev => ({
            ...prev,
            isSubmitting: false,
            isLocked: true,
            lockUntil: Date.now() + (data.lock_remaining_ms || 5000),
          }));
        } else if (data.is_finished) {
          setState(prev => ({ ...prev, isSubmitting: false, isFinished: true }));
        } else {
          setState(prev => ({ ...prev, isSubmitting: false }));
        }
        return;
      }

      const newState = {
        score: data.new_score,
        correctCount: st.correctCount + (data.is_correct ? 1 : 0),
        totalAttempted: st.totalAttempted + 1,
        streak: data.streak,
        currentQuestionIndex: data.new_question,
        isFinished: data.is_finished || false,
      };

      if (data.is_correct) {
        const reviewCheck = checkForReviewQuestion({
          ...newState,
          wrongAnswerIndices: st.wrongAnswerIndices,
          questionsAnsweredSinceReview: st.questionsAnsweredSinceReview,
        });

        setState(prev => ({
          ...prev,
          score: data.new_score,
          correctCount: prev.correctCount + 1,
          totalAttempted: prev.totalAttempted + 1,
          streak: data.streak,
          isSubmitting: false,
          isLocked: false,
          lockUntil: null,
          // Decrement reverse text if active
          reverseTextRemaining: Math.max(0, prev.reverseTextRemaining - 1),
        }));

        setFeedback({ isCorrect: true, points: data.points });
        broadcastToHost(newState);

        setTimeout(() => {
          setFeedback(null);
          setState(prev => ({
            ...prev,
            currentQuestionIndex: data.new_question,
            isFinished: data.is_finished || false,
            ...reviewCheck,
          }));
        }, 1200);

      } else {
        // ── WRONG ──
        const wrongLockUntil = Date.now() + 5000;
        const reviewCheck = checkForReviewQuestion({
          ...newState,
          wrongAnswerIndices: [...st.wrongAnswerIndices, st.currentQuestionIndex],
          questionsAnsweredSinceReview: st.questionsAnsweredSinceReview,
        });

        // Time Bomb penalty
        const timeBombActive = st.timeBombUntil && Date.now() < st.timeBombUntil;

        setState(prev => ({
          ...prev,
          isSubmitting: false,
          isLocked: true,
          lockUntil: timeBombActive ? Date.now() + 20000 : wrongLockUntil,
          totalAttempted: prev.totalAttempted + 1,
          streak: data.streak, // server already applied save_streak if applicable
          wrongAnswerIndices: [...prev.wrongAnswerIndices, prev.currentQuestionIndex],
          reverseTextRemaining: Math.max(0, prev.reverseTextRemaining - 1),
        }));

        setFeedback({
          isCorrect: false,
          saveStreakUsed: data.save_streak_used,
          timeBombPenalty: data.time_bomb_penalty,
        });
        broadcastToHost(newState);

        const lockDuration = timeBombActive ? 20000 : 5000;
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            score: data.new_score,
            currentQuestionIndex: data.new_question,
            isFinished: data.is_finished || false,
            isLocked: false,
            lockUntil: null,
            ...reviewCheck,
          }));
          setFeedback(null);
        }, lockDuration);
      }
    } catch (err) {
      console.error('[Race] Submit error:', err);
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [mp, items.length]);

  // ═══════════════════════════════════════════════════════════
  // ANSWER HELP MODAL (target player answers help questions)
  // ═══════════════════════════════════════════════════════════
  const answerHelpQuestion = useCallback((selectedIndex: number) => {
    const st = stateRef.current;
    if (!st.helpModal) return;

    const isCorrect = selectedIndex === 0;
    const ch = getChannel();

    // Broadcast result back to caster
    ch?.send({
      type: 'broadcast',
      event: 'race_help_answer',
      payload: {
        fromPlayerId: mp.playerId,
        toPlayerId: st.helpModal.fromPlayerId,
        isCorrect,
        questionNum: st.helpModal.currentIndex + 1,
      },
    });

    if (!isCorrect) {
      // Wrong: 5s red screen for the helper
      setState(prev => ({
        ...prev,
        stunUntil: Date.now() + 5000,
        isLocked: true,
        lockUntil: Date.now() + 5000,
      }));
    }

    if (st.helpModal.currentIndex >= 1) {
      // Both questions done, close modal
      setState(prev => ({ ...prev, helpModal: null }));
    } else {
      // Advance to question 2
      setState(prev => ({
        ...prev,
        helpModal: prev.helpModal ? { ...prev.helpModal, currentIndex: 1 } : null,
      }));
    }
  }, [mp.playerId]);

  // ═══════════════════════════════════════════════════════════
  // BROADCAST TO HOST
  // ═══════════════════════════════════════════════════════════
  function broadcastToHost(newState: any) {
    const ch = getChannel();
    if (!ch) return;
    const payload = {
      playerId: mp.playerId,
      playerName: mp.myPlayer?.player_name,
      avatar: mp.myPlayer?.avatar_emoji,
      ...newState,
    };
    ch.send({ type: 'broadcast', event: 'race_state_update', payload });
  }

  // ═══════════════════════════════════════════════════════════
  // USE ITEM — 15 types with 5s activation delay
  // ═══════════════════════════════════════════════════════════
  const useItem = useCallback(async (itemId: string, targetPlayerId?: string) => {
    const st = stateRef.current;
    const idx = st.inventory.indexOf(itemId);
    if (idx < 0) return;

    const def = ITEM_CATALOG[itemId];
    if (!def || def.type === 'passive') return; // Can't manually use passive items

    // Remove from inventory immediately (optimistic)
    setState(prev => {
      const newInv = [...prev.inventory];
      newInv.splice(idx, 1);
      return { ...prev, inventory: newInv };
    });

    // Instant self-buffs: apply immediately without delay
    if (itemId === 'double_points') {
      setState(prev => ({
        ...prev,
        activeEffects: [...prev.activeEffects, { effectType: 'score_multiply', value: 2 }],
      }));
    }

    try {
      const res = await fetch('/api/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'use_item',
          room_id: mp.roomId,
          player_id: mp.playerId,
          item_id: itemId,
          target_player_id: targetPlayerId,
          total_questions: items.length,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        // Restore item if API rejected
        setState(prev => ({
          ...prev,
          inventory: [...prev.inventory, itemId],
        }));
        console.warn('[Race] Item rejected:', result.error);
        return;
      }

      const ch = getChannel();

      // ── Determine activation delay ──
      const isInstant = def.instant;
      const activatesAt = isInstant ? Date.now() : Date.now() + 5000;

      // ── Handle self-buff effects locally ──
      if (itemId === 'mirror') {
        setState(prev => ({ ...prev, mirrorUntil: Date.now() + 30000 }));
      }
      if (itemId === 'invisibility') {
        setState(prev => ({ ...prev, invisibleUntil: Date.now() + 45000 }));
      }
      if (itemId === 'skip_question') {
        // Show pending then apply after delay
        setState(prev => ({
          ...prev,
          pendingActivation: {
            itemId: 'skip_question',
            emoji: '🚀',
            itemName: 'Nhảy Cóc',
            fromPlayer: mp.myPlayer?.player_name || '',
            activatesAt,
          },
        }));
      }

      // ── Handle thief result locally ──
      if (result.effect === 'thief' && result.newInventory) {
        setState(prev => ({ ...prev, inventory: result.newInventory }));
      }

      // ── Handle vampire result locally ──
      if (result.effect === 'vampire' && result.new_score !== undefined) {
        setState(prev => ({ ...prev, score: result.new_score }));
      }

      // ── Handle mirror reflection (attacker gets stunned) ──
      if (result.effect === 'reflected_by_mirror') {
        setState(prev => ({
          ...prev,
          isLocked: true,
          stunUntil: Date.now() + 5000,
          lockUntil: Date.now() + 5000,
        }));
      }

      // ── Broadcast effect to all players ──
      if (result.success) {
        // For Help item: broadcast help request with question indices
        if (itemId === 'help' && targetPlayerId) {
          // Pick 2 random question indices for the help modal
          const q1 = Math.floor(Math.random() * items.length);
          let q2 = Math.floor(Math.random() * items.length);
          while (q2 === q1 && items.length > 1) q2 = Math.floor(Math.random() * items.length);

          ch?.send({
            type: 'broadcast',
            event: 'race_help_request',
            payload: {
              fromPlayerId: mp.playerId,
              fromPlayerName: mp.myPlayer?.player_name,
              targetPlayerId,
              questionIndices: [q1, q2],
              activatesAt,
            },
          });
        }

        // Unified item effect broadcast
        ch?.send({
          type: 'broadcast',
          event: 'race_item_effect',
          payload: {
            effectType: result.effect,
            fromPlayerId: mp.playerId,
            targetPlayerId: targetPlayerId || result.target,
            activatesAt,
            data: {
              itemId,
              fromPlayerName: mp.myPlayer?.player_name,
              frozenButtons: result.frozenButtons,
              duration: result.duration,
              stolenItem: result.stolenItem,
              stolenScore: result.stolenScore,
              new_score: result.new_score,
              new_question: result.new_question,
              is_finished: result.is_finished,
              points: result.points,
              newInventory: result.newInventory,
            },
          },
        });

        // Dev log broadcast
        ch?.send({
          type: 'broadcast',
          event: 'dev_item_log',
          payload: {
            log_id: Math.random().toString(36).substr(2, 9),
            from_player: mp.myPlayer?.player_name,
            item_id: itemId,
            target_player_id: targetPlayerId,
            question: st.currentQuestionIndex + 1,
            effect: result.effect,
          },
        });
      }
    } catch (err) {
      console.error('[Race] Use item error:', err);
      // Restore item on network error
      setState(prev => ({ ...prev, inventory: [...prev.inventory, itemId] }));
    }
  }, [mp, items.length]);

  return {
    state,
    setState,
    feedback,
    itemNotification,
    submitAnswer,
    useItem,
    answerHelpQuestion,
    items,
    reverseWords,
  };
}
