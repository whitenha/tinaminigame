/**
 * ============================================================
 * TINA MINIGAME — Room Channel (Broadcast + Presence)
 * ============================================================
 * 3-Layer Sync Architecture:
 *   Layer 1 — Broadcast:         Instant, fire-and-forget events
 *   Layer 2 — postgres_changes:  DB-authoritative room state sync (mg_rooms only)
 *   Layer 3 — HTTP Polling:      Absolute fallback (3s interval)
 *
 * IMPORTANT RULES (DO NOT REMOVE — see AGENTS.md):
 *   • Never remove the polling fallback — it's the safety net
 *   • Never remove postgres_changes on mg_rooms — it's reliable
 *   • All state transitions use guarded helpers to prevent double-fires
 *
 * NOTE: postgres_changes on mg_room_players is intentionally NOT used.
 * The filter `room_id=eq.X` requires REPLICA IDENTITY FULL which is not set.
 * Player list sync relies on broadcast + optimistic UI + debounced fetch.
 */

'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useRoomStore from './roomStore';
import { getStartingItems } from '@/lib/powerUpSystem';
import { GHOST_GRACE_MS, HEARTBEAT_INTERVAL_MS } from './constants';

// ── State Transition Guards ─────────────────────────────────
// These ensure each transition only fires once, even if multiple
// sync layers (broadcast, postgres_changes, polling) all trigger.

/** Transition to countdown → playing. Only fires if currently waiting/idle. */
function tryStartGame(settings: any, startQuestion: number) {
  const s = useRoomStore.getState();
  // @ts-ignore
  const phase = s.phase;
  if (phase === 'countdown' || phase === 'playing' || phase === 'podium') return;

  console.log('[MP] tryStartGame: phase was', phase, '→ countdown →', startQuestion);

  // @ts-ignore
  s.setRoomSettings(settings);
  if (settings?.shareScreen !== undefined) {
    // @ts-ignore
    s.setShareScreen(settings.shareScreen);
  }
  // @ts-ignore
  s.setInventory(getStartingItems());
  // @ts-ignore
  s.snapshotLeaderboard();
  // @ts-ignore
  s.setPhase('countdown');

  setTimeout(() => {
    const s2 = useRoomStore.getState();
    // @ts-ignore
    if (s2.phase !== 'countdown') return; // Guard: something else changed phase
    // @ts-ignore
    s2.setPhase('playing');
    // @ts-ignore
    s2.setCurrentQuestion(startQuestion);
    // @ts-ignore
    s2.setQuestionStartTime(Date.now());
    // @ts-ignore
    s2.setAnsweredThisQ(false);
    // @ts-ignore
    s2.setActiveEffects([]);
    // @ts-ignore
    s2.setItemMultiplier(1);
  }, 3500);
}

/** Advance to next question. Only fires if question index actually changed. */
function tryNextQuestion(questionIndex: number) {
  const s = useRoomStore.getState();
  // @ts-ignore
  if (questionIndex < 0 || s.currentQuestion === questionIndex) return;

  console.log('[MP] tryNextQuestion:', questionIndex);
  // @ts-ignore
  s.snapshotLeaderboard();
  // @ts-ignore
  s.setLastRoundPoints({});
  // @ts-ignore
  s.setCurrentQuestion(questionIndex);
  // @ts-ignore
  s.setQuestionStartTime(Date.now());
  // @ts-ignore
  s.setAnsweredThisQ(false);
  // @ts-ignore
  s.setAnswerStats(null);
  // @ts-ignore
  s.setFastestPlayer(null);
  // @ts-ignore
  s.setPhase('playing');
  // @ts-ignore
  s.setWrongGuesses([]);
  // @ts-ignore
  s.setCorrectPlayers([]);
  // @ts-ignore
  s.setItemMultiplier(1);
  // @ts-ignore
  s.setActiveEffects((prev: any) => prev.filter((e: any) => !e.expiresAt || e.expiresAt > Date.now()));
}

/** Transition to podium. Only fires once. */
function tryEndGame() {
  const s = useRoomStore.getState();
  // @ts-ignore
  if (s.phase === 'podium') return;
  console.log('[MP] tryEndGame');
  // @ts-ignore
  s.setPhase('podium');
  // @ts-ignore
  s.setPlayers([...s.players].sort((a, b) => (b.score || 0) - (a.score || 0)));
}

// ═══════════════════════════════════════════════════════════
// subscribeToRoom — Returns Promise<boolean>
// Resolves true when WebSocket is SUBSCRIBED, false on error.
// Caller MUST await this before sending any broadcasts.
// ═══════════════════════════════════════════════════════════
export function subscribeToRoom(code: any, myPlayerId: any, myName: any): Promise<boolean> {
  return new Promise((resolve) => {
    const store = useRoomStore.getState();
    // @ts-ignore
    const refs = store._refs;

    const channel = supabase.channel(`room:${code}`, {
      config: { broadcast: { self: true } },
    });

    // ════════════════════════════════════════════
    // LAYER 1 — BROADCAST EVENTS
    // ════════════════════════════════════════════

    channel
      // ── Player Joined ──
      .on('broadcast', { event: 'player_joined' }, (msg) => {
        const p = msg?.payload;
        if (p) {
          // Optimistic: add to player list immediately (no DB call needed)
          // @ts-ignore
          useRoomStore.getState().setPlayers((prev: any) => {
            if (prev.some((x: any) => x.id === p.playerId)) return prev;
            return [...prev, {
              id: p.playerId,
              room_id: code,
              player_name: p.playerName,
              avatar_emoji: p.avatar,
              score: 0,
              streak: 0,
              is_host: false,
              is_online: true,
              answers: [],
            }];
          });
        }
        // Also fetch from DB to correct any optimistic drift
        // @ts-ignore
        store.fetchPlayersDebounced(code);
      })

      // ── Game Start ──
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        if (refs.myPlayer?.is_host) {
          // Host already handled this optimistically; just update inventory
          const s = useRoomStore.getState();
          // @ts-ignore
          s.setInventory(getStartingItems());
          // @ts-ignore
          s.snapshotLeaderboard();
          return;
        }
        const settings = payload?.settings || {};
        const startQ = settings.initialQuestion ?? 0;
        tryStartGame(settings, startQ);
      })

      // ── Next Question ──
      .on('broadcast', { event: 'next_question' }, ({ payload }) => {
        if (refs.myPlayer?.is_host) {
          // Host did this optimistically
          const s = useRoomStore.getState();
          // @ts-ignore
          s.snapshotLeaderboard();
          // @ts-ignore
          s.setLastRoundPoints({});
          return;
        }
        tryNextQuestion(payload.questionIndex);
      })

      // ── Show Leaderboard ──
      .on('broadcast', { event: 'show_leaderboard' }, ({ payload }) => {
        if (refs.myPlayer?.is_host) return;
        const s = useRoomStore.getState();
        // @ts-ignore
        s.setPhase('leaderboard');
        // @ts-ignore
        s.setAnswerStats(payload.answerStats || null);
        // @ts-ignore
        s.setFastestPlayer(payload.fastestPlayer || null);
        // @ts-ignore
        if (payload.roundPoints) s.setLastRoundPoints(payload.roundPoints);
        // @ts-ignore
        s.fetchPlayersDebounced(code);
      })

      // ── Submit Answer ──
      .on('broadcast', { event: 'submit_answer' }, ({ payload }) => {
        const s = useRoomStore.getState();
        // @ts-ignore
        if (payload.questionIndex !== s._refs.currentQuestion) return; // Ignore stale

        // @ts-ignore
        s.setPlayers((prev: any) => prev.map((p: any) =>
          p.id === payload.playerId
            ? { ...p, score: payload.newScore, streak: payload.newStreak }
            : p
        ));
        // @ts-ignore
        s.setLastRoundPoints((prev: any) => ({ ...prev, [payload.playerId]: payload.points }));
        // @ts-ignore
        s.setCorrectPlayers((prev: any) => {
          if (prev.some((x: any) => x.playerId === payload.playerId)) return prev;
          // @ts-ignore
          const players = useRoomStore.getState().players;
          const p = players.find((x: any) => x.id === payload.playerId);
          return [...prev, {
            playerId: payload.playerId,
            playerName: p?.player_name || payload.playerName,
            avatar: p?.avatar_emoji || payload.avatar,
            correct: payload.isCorrect,
          }];
        });
      })

      // ── Wrong Guess ──
      .on('broadcast', { event: 'wrong_guess' }, ({ payload }) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        // @ts-ignore
        useRoomStore.getState().setWrongGuesses((prev: any) =>
          [...prev.slice(-9), { id, word: payload.word, timestamp: Date.now() }]
        );
      })

      // ── Reaction ──
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reactionId = `${payload.playerId}-${Date.now()}`;
        const s = useRoomStore.getState();
        // @ts-ignore
        s.setReactions((prev: any) => [...prev.slice(-20), {
          id: reactionId,
          emoji: payload.emoji,
          playerName: payload.playerName,
          timestamp: Date.now(),
        }]);
        setTimeout(() => {
          // @ts-ignore
          useRoomStore.getState().setReactions((prev: any) => prev.filter((r: any) => r.id !== reactionId));
        }, 3000);
      })

      // ── Pair Matched ──
      .on('broadcast', { event: 'pair_matched' }, ({ payload }) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tina_pair_matched', {
            detail: { pairId: payload.pairId, playerName: payload.playerName },
          }));
        }
      })

      // ── Game End ──
      .on('broadcast', { event: 'game_end' }, () => {
        if (refs.myPlayer?.is_host) return;
        tryEndGame();
      })

      // ── Player Left ──
      .on('broadcast', { event: 'player_left' }, () => {
        // @ts-ignore
        store.fetchPlayersDebounced(code);
      })

      // ── Kick Player ──
      .on('broadcast', { event: 'kick_player' }, ({ payload }) => {
        const s = useRoomStore.getState();
        if (payload.targetId === myPlayerId) {
          if (payload.ban) {
            localStorage.setItem(`tina_banned_room_${code}`, 'true');
            // @ts-ignore
            s.setError('Bạn đã bị Host cấm khỏi phòng này!');
          } else {
            // @ts-ignore
            s.setError('Bạn đã bị Host mời ra khỏi phòng.');
          }
          if (refs.leaveRoom) refs.leaveRoom();
        } else {
          // @ts-ignore
          s.fetchPlayersDebounced(code);
        }
      })

      // ── Return to Grid (Open Box) ──
      .on('broadcast', { event: 'return_to_grid' }, ({ payload }) => {
        if (refs.myPlayer?.is_host) return;
        const s = useRoomStore.getState();
        // @ts-ignore
        s.setCurrentQuestion(-1);
        // @ts-ignore
        const newSettings = { ...s._refs.roomSettings, openedBoxes: payload.openedBoxes };
        // @ts-ignore
        s.setRoomSettings(newSettings);
      })

      // ── Update Settings ──
      .on('broadcast', { event: 'update_settings' }, ({ payload }) => {
        if (refs.myPlayer?.is_host) return;
        // @ts-ignore
        const newSettings = { ...useRoomStore.getState()._refs.roomSettings, ...payload };
        // @ts-ignore
        useRoomStore.getState().setRoomSettings(newSettings);
      })

      // ── Fast Forward Timer ──
      .on('broadcast', { event: 'fast_forward_timer' }, () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tina_fast_forward_timer'));
        }
      })

      // ── Power-Up Events ──
      .on('broadcast', { event: 'use_powerup' }, () => {
        // Visual indicator only
      })
      .on('broadcast', { event: 'powerup_effect' }, ({ payload }) => {
        if (payload.targetId !== myPlayerId) return;
        const s = useRoomStore.getState();

        const effect = {
          effectType: payload.effectType,
          fromPlayer: payload.fromPlayerName,
          expiresAt: payload.duration ? Date.now() + payload.duration * 1000 : null,
          itemEmoji: payload.itemEmoji,
          itemName: payload.itemName,
        };

        // @ts-ignore
        const inv = s.inventory;
        const hasShield = inv.findIndex((i: any) => i.id === 'shield');
        if (hasShield >= 0 && payload.isAttack) {
          // @ts-ignore
          s.setInventory((prev: any) => prev.filter((_: any, idx: any) => idx !== hasShield));
          return; // Blocked!
        }

        const hasBoomerang = inv.findIndex((i: any) => i.id === 'boomerang');
        if (hasBoomerang >= 0 && payload.isAttack) {
          // @ts-ignore
          s.setInventory((prev: any) => prev.filter((_: any, idx: any) => idx !== hasBoomerang));
          refs.channel?.send({
            type: 'broadcast',
            event: 'powerup_effect',
            payload: {
              ...payload,
              targetId: payload.fromPlayerId,
              fromPlayerId: myPlayerId,
              fromPlayerName: myName,
              isAttack: true,
            },
          });
          return;
        }

        // @ts-ignore
        s.setActiveEffects((prev: any) => [...prev, effect]);
        if (effect.expiresAt) {
          setTimeout(() => {
            // @ts-ignore
            useRoomStore.getState().setActiveEffects((prev: any) => prev.filter((e: any) => e !== effect));
          }, payload.duration * 1000);
        }
      });

    // ════════════════════════════════════════════
    // LAYER 2 — POSTGRES CHANGES (mg_rooms ONLY)
    // ════════════════════════════════════════════
    // This works because the filter uses the PRIMARY KEY (id).
    // Do NOT add mg_room_players here — filter on room_id needs REPLICA IDENTITY FULL.

    channel.on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mg_rooms', filter: `id=eq.${code}` },
      (payload) => {
        if (refs.myPlayer?.is_host) return; // Host manages its own state

        const newStatus = payload.new.status;
        const newQ = payload.new.current_question;
        const settings = payload.new.settings || {};

        if (newStatus === 'playing') {
          const s = useRoomStore.getState();
          // @ts-ignore
          const phase = s.phase;

          if (phase === 'waiting' || phase === 'idle') {
            // Game just started
            tryStartGame(settings, newQ ?? 0);
          } else if (phase === 'playing' || phase === 'leaderboard') {
            // Question change or return to grid
            if (newQ >= 0) {
              tryNextQuestion(newQ);
            } else if (newQ === -1 && s.currentQuestion !== -1) {
              // @ts-ignore
              s.setCurrentQuestion(-1);
              // @ts-ignore
              s.setRoomSettings(settings);
            }
          }
        } else if (newStatus === 'finished') {
          tryEndGame();
        }
      }
    );

    // ════════════════════════════════════════════
    // PRESENCE
    // ════════════════════════════════════════════

    channel.on('presence', { event: 'sync' }, () => {
      const s = useRoomStore.getState();
      const state = channel.presenceState();
      // @ts-ignore
      const onlineIds = Object.values(state).flat().map(p => p.playerId);

      // Only update is_online — never remove or reorder players
      // @ts-ignore
      s.setPlayers((prev: any) => {
        const changed = prev.some((p: any) => p.is_online !== onlineIds.includes(p.id));
        if (!changed) return prev;
        return prev.map((p: any) => ({ ...p, is_online: onlineIds.includes(p.id) }));
      });

      const me = refs.myPlayer;

      // ── Auto-close if Host is missing (Client) ──
      if (me && !me.is_host) {
        // @ts-ignore
        const players = s.players;
        const hasHostData = players.some((x: any) => x.is_host);

        if (hasHostData) {
          const hostOnline = onlineIds.some(id => {
            const p = players.find((x: any) => x.id === id);
            return p && p.is_host;
          });

          if (!hostOnline) {
            if (!refs.hostOfflineTimer) {
              refs.hostOfflineTimer = setTimeout(() => {
                // @ts-ignore
                useRoomStore.getState().setError('Hệ thống ngắt kết nối do Host đã rời đi quá lâu!');
                if (refs.leaveRoom) refs.leaveRoom();
              }, 3000);
            }
          } else {
            if (refs.hostOfflineTimer) {
              clearTimeout(refs.hostOfflineTimer);
              refs.hostOfflineTimer = null;
            }
          }
        }
      }

      // ── Ghost Cleanup (Host) ──
      if (me && me.is_host) {
        const now = Date.now();
        // @ts-ignore
        const players = s.players;
        const ghostPlayers = players.filter((p: any) => {
          if (p.is_host) return false;
          if (onlineIds.includes(p.id)) return false;
          const joinedAt = p.created_at ? new Date(p.created_at).getTime() : now;
          return (now - joinedAt) > GHOST_GRACE_MS;
        });

        if (ghostPlayers.length > 0) {
          const ghostIds = ghostPlayers.map((p: any) => p.id);
          if (refs.phase === 'waiting') {
            supabase.from('mg_room_players').delete().in('id', ghostIds).then(() => {
              // @ts-ignore
              useRoomStore.getState().fetchPlayersDebounced(code);
              channel.send({ type: 'broadcast', event: 'player_left', payload: {} });
            });
          } else {
            supabase.from('mg_room_players').update({ is_online: false }).in('id', ghostIds).then(() => {
              // @ts-ignore
              useRoomStore.getState().fetchPlayersDebounced(code);
              channel.send({ type: 'broadcast', event: 'player_left', payload: {} });
            });
          }
        }
      }
    });

    // ════════════════════════════════════════════
    // SUBSCRIBE + TRACK PRESENCE
    // ════════════════════════════════════════════

    // Set channel ref BEFORE subscribing so it's available immediately
    refs.channel = channel;
    // @ts-ignore
    store.fetchPlayers(code);

    channel.subscribe(async (status) => {
      console.log('[MP] channel status:', status);

      if (status === 'SUBSCRIBED') {
        // @ts-ignore
        useRoomStore.getState().setConnectionStatus('connected');
        await channel.track({ playerId: myPlayerId, playerName: myName });

        // ── Reconcile state from DB on (re)connect ──
        try {
          const s = useRoomStore.getState();
          // @ts-ignore
          if (!s._refs.myPlayer?.is_host) {
            const { data: room } = await supabase
              .from('mg_rooms')
              .select('status, current_question, settings')
              .eq('id', code)
              .single();

            if (room) {
              // @ts-ignore
              const phase = s.phase;
              if (room.status === 'playing' && (phase === 'waiting' || phase === 'idle')) {
                tryStartGame(room.settings || {}, room.current_question ?? 0);
              } else if (room.status === 'finished' && phase !== 'podium') {
                tryEndGame();
              }
            }
          }
          // @ts-ignore
          s.fetchPlayersDebounced(code);
        } catch (err) {
          console.warn('[MP] Reconcile failed:', err);
        }

        resolve(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // @ts-ignore
        useRoomStore.getState().setConnectionStatus('error');
        resolve(false);
      } else if (status === 'CLOSED') {
        // @ts-ignore
        useRoomStore.getState().setConnectionStatus('disconnected');
      }
    });

    console.log('[MP] subscribeToRoom initiated for:', code);
  });
}

// ═══════════════════════════════════════════════════════════
// useRoomChannelLifecycle — React hook
// ═══════════════════════════════════════════════════════════
export function useRoomChannelLifecycle() {
  // @ts-ignore
  const { isHost, roomId, phase, fetchPlayers, _refs: refs } = useRoomStore();

  // ── Host Heartbeat (4s) — keeps player list fresh ──
  useEffect(() => {
    if (!isHost || !roomId) return;
    if (phase === 'podium' || phase === 'idle') return;

    refs.heartbeat = setInterval(() => {
      // @ts-ignore
      const code = useRoomStore.getState().roomId;
      // @ts-ignore
      if (code) useRoomStore.getState().fetchPlayers(code);
    }, 4000);

    return () => {
      if (refs.heartbeat) {
        clearInterval(refs.heartbeat);
        refs.heartbeat = null;
      }
    };
  }, [isHost, roomId, phase]);

  // ── LAYER 3 — Player Polling Fallback (3s) ──
  // Catches ALL missed events: game_start, next_question, game_end, player list.
  // This is the ABSOLUTE safety net. NEVER REMOVE THIS.
  useEffect(() => {
    if (isHost || !roomId) return;
    if (phase === 'podium' || phase === 'idle') return;

    const poll = setInterval(async () => {
      try {
        const { data: room } = await supabase
          .from('mg_rooms')
          .select('status, current_question, settings')
          .eq('id', roomId)
          .single();

        if (room) {
          const s = useRoomStore.getState();
          // @ts-ignore
          const currentPhase = s.phase;

          if (room.status === 'playing' && (currentPhase === 'waiting' || currentPhase === 'idle')) {
            console.log('[MP-Poll] Recovered game_start');
            tryStartGame(room.settings || {}, room.current_question ?? 0);
          } else if (room.status === 'playing' && (currentPhase === 'playing' || currentPhase === 'leaderboard')) {
            // @ts-ignore
            if (room.current_question !== s.currentQuestion && room.current_question >= 0) {
              console.log('[MP-Poll] Recovered next_question');
              tryNextQuestion(room.current_question);
            }
          } else if (room.status === 'finished' && currentPhase !== 'podium') {
            console.log('[MP-Poll] Recovered game_end');
            tryEndGame();
          }
        }

        // Always refresh player list
        // @ts-ignore
        useRoomStore.getState().fetchPlayersDebounced(roomId);
      } catch {
        // Ignore network errors on polling
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [isHost, roomId, phase]);

  // ── Beacon close (Host) ──
  useEffect(() => {
    if (!isHost || !roomId) return;
    const markFinished = () => {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mg_rooms?id=eq.${roomId}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      };
      // @ts-ignore
      fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ status: 'finished' }), keepalive: true }).catch(() => {});
    };
    window.addEventListener('beforeunload', markFinished);
    return () => window.removeEventListener('beforeunload', markFinished);
  }, [isHost, roomId]);

  // ── Unmount Cleanup ──
  useEffect(() => {
    return () => {
      // @ts-ignore
      const r = useRoomStore.getState()._refs;
      if (r.hostOfflineTimer) clearTimeout(r.hostOfflineTimer);
      if (r.heartbeat) { clearInterval(r.heartbeat); r.heartbeat = null; }
      if (r.fetchDebounce) { clearTimeout(r.fetchDebounce); r.fetchDebounce = null; }
      if (r.channel) {
        supabase.removeChannel(r.channel);
      }
      // Mark room finished on unmount
      const state = useRoomStore.getState();
      // @ts-ignore
      const currentIsHost = r.myPlayer?.is_host || state.isHost;
      // @ts-ignore
      const currentRoomId = state.roomId;
      if (currentIsHost && currentRoomId) {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mg_rooms?id=eq.${currentRoomId}`;
        const headers = {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        };
        // @ts-ignore
        fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ status: 'finished' }), keepalive: true }).catch(() => {});
      }
    };
  }, []);
}
