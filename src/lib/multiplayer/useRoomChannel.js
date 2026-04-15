/**
 * ============================================================
 * TINA MINIGAME — Room Channel (Broadcast + Presence)
 * ============================================================
 * Manages Supabase channel subscription, broadcast event handlers,
 * presence sync, ghost cleanup, and heartbeat reconciliation.
 */

'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import useRoomStore from './roomStore';
import { getStartingItems } from '@/lib/powerUpSystem';
import { GHOST_GRACE_MS, HEARTBEAT_INTERVAL_MS, HOST_NAMES } from './constants';

/**
 * Subscribe to a Supabase room channel and set up all broadcast handlers.
 * Call this AFTER the room/player is created in DB.
 */
export function subscribeToRoom(code, myPlayerId, myName) {
  const store = useRoomStore.getState();
  const refs = store._refs;

  const channel = supabase.channel(`room:${code}`, {
    config: { broadcast: { self: true } },
  });

  channel
    // ── Player Joined (legacy client-broadcast, kept for backward compat) ──
    .on('broadcast', { event: 'player_joined' }, (msg) => {
      console.log('[MP] player_joined event received:', msg?.payload);
      store.fetchPlayersDebounced(code);
    })

    // ── DB-Authoritative Player Sync (NEW: triggered by PostgreSQL) ──
    .on('broadcast', { event: 'player_sync' }, ({ payload }) => {
      if (!payload) return;
      const { event: op, player_id } = payload;

      if (op === 'INSERT') {
        // New player — add to state if not already present
        useRoomStore.getState().setPlayers(prev => {
          if (prev.some(p => p.id === player_id)) return prev;
          return [...prev, {
            id: player_id,
            room_id: payload.room_id,
            player_name: payload.player_name,
            avatar_emoji: payload.avatar_emoji,
            score: payload.score || 0,
            streak: 0,
            is_host: payload.is_host || false,
            is_online: payload.is_online !== false,
            answers: [],
          }];
        });
      } else if (op === 'UPDATE') {
        useRoomStore.getState().setPlayers(prev =>
          prev.map(p => p.id === player_id ? {
            ...p,
            player_name: payload.player_name ?? p.player_name,
            is_online: payload.is_online ?? p.is_online,
            score: payload.score ?? p.score,
            avatar_emoji: payload.avatar_emoji ?? p.avatar_emoji,
          } : p)
        );
      } else if (op === 'DELETE') {
        useRoomStore.getState().setPlayers(prev => prev.filter(p => p.id !== player_id));
      }
    })

    // ── Game Start ──
    .on('broadcast', { event: 'game_start' }, ({ payload }) => {
      const s = useRoomStore.getState();
      if (payload?.settings?.shareScreen !== undefined) {
        s.setShareScreen(payload.settings.shareScreen);
      }
      s.setInventory(getStartingItems());
      s.snapshotLeaderboard();

      if (refs.myPlayer?.is_host) return; // Host does this optimistically

      s.setPhase('countdown');
      setTimeout(() => {
        const s2 = useRoomStore.getState();
        s2.setPhase('playing');
        s2.setCurrentQuestion(0);
        s2.setQuestionStartTime(Date.now());
        s2.setAnsweredThisQ(false);
        s2.setActiveEffects([]);
        s2.setItemMultiplier(1);
      }, 3500);
    })

    // ── Next Question ──
    .on('broadcast', { event: 'next_question' }, ({ payload }) => {
      const s = useRoomStore.getState();
      s.snapshotLeaderboard();
      s.setLastRoundPoints({});

      if (refs.myPlayer?.is_host) return;

      s.setCurrentQuestion(payload.questionIndex);
      s.setQuestionStartTime(Date.now());
      s.setAnsweredThisQ(false);
      s.setAnswerStats(null);
      s.setFastestPlayer(null);
      s.setPhase('playing');
      s.setWrongGuesses([]);
      s.setCorrectPlayers([]);
      s.setItemMultiplier(1);
      s.setActiveEffects(prev => prev.filter(e => !e.expiresAt || e.expiresAt > Date.now()));
    })

    // ── Show Leaderboard ──
    .on('broadcast', { event: 'show_leaderboard' }, ({ payload }) => {
      if (refs.myPlayer?.is_host) return;
      const s = useRoomStore.getState();
      s.setPhase('leaderboard');
      s.setAnswerStats(payload.answerStats || null);
      s.setFastestPlayer(payload.fastestPlayer || null);
      if (payload.roundPoints) s.setLastRoundPoints(payload.roundPoints);
      s.fetchPlayersDebounced(code);
    })

    // ── Submit Answer ──
    .on('broadcast', { event: 'submit_answer' }, ({ payload }) => {
      const s = useRoomStore.getState();
      if (payload.questionIndex !== s._refs.currentQuestion) return; // IGNORE STALE

      s.setPlayers(prev => prev.map(p =>
        p.id === payload.playerId
          ? { ...p, score: payload.newScore, streak: payload.newStreak }
          : p
      ));
      s.setLastRoundPoints(prev => ({ ...prev, [payload.playerId]: payload.points }));
      s.setCorrectPlayers(prev => {
        if (prev.some(x => x.playerId === payload.playerId)) return prev;
        const players = useRoomStore.getState().players;
        const p = players.find(x => x.id === payload.playerId);
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
      useRoomStore.getState().setWrongGuesses(prev =>
        [...prev.slice(-9), { id, word: payload.word, timestamp: Date.now() }]
      );
    })

    // ── Reaction ──
    .on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const reactionId = `${payload.playerId}-${Date.now()}`;
      const s = useRoomStore.getState();
      s.setReactions(prev => [...prev.slice(-20), {
        id: reactionId,
        emoji: payload.emoji,
        playerName: payload.playerName,
        timestamp: Date.now(),
      }]);
      setTimeout(() => {
        useRoomStore.getState().setReactions(prev => prev.filter(r => r.id !== reactionId));
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
      const s = useRoomStore.getState();
      s.setPhase('podium');
      s.setPlayers([...s.players].sort((a, b) => (b.score || 0) - (a.score || 0)));
    })

    // ── Player Left ──
    .on('broadcast', { event: 'player_left' }, () => {
      store.fetchPlayersDebounced(code);
    })

    // ── Kick Player ──
    .on('broadcast', { event: 'kick_player' }, ({ payload }) => {
      const s = useRoomStore.getState();
      if (payload.targetId === myPlayerId) {
        if (payload.ban) {
          localStorage.setItem(`tina_banned_room_${code}`, 'true');
          s.setError('Bạn đã bị Host bị cấm khỏi phòng này!');
        } else {
          s.setError('Bạn đã bị Host mời ra khỏi phòng.');
        }
        // leaveRoom will be called by the wrapper hook via _refs.leaveRoom
        if (refs.leaveRoom) refs.leaveRoom();
      } else {
        s.fetchPlayersDebounced(code);
      }
    })

    // ── Return to Grid (Open Box) ──
    .on('broadcast', { event: 'return_to_grid' }, ({ payload }) => {
      if (refs.myPlayer?.is_host) return;
      const s = useRoomStore.getState();
      s.setCurrentQuestion(-1);
      const newSettings = { ...s._refs.roomSettings, openedBoxes: payload.openedBoxes };
      s.setRoomSettings(newSettings);
    })

    // ── Update Settings ──
    .on('broadcast', { event: 'update_settings' }, ({ payload }) => {
      if (refs.myPlayer?.is_host) return;
      const newSettings = { ...useRoomStore.getState()._refs.roomSettings, ...payload };
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
      // Visual indicator only — handled by consuming components
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

      // Check for shield
      const inv = s.inventory;
      const hasShield = inv.findIndex(i => i.id === 'shield');
      if (hasShield >= 0 && payload.isAttack) {
        s.setInventory(prev => prev.filter((_, idx) => idx !== hasShield));
        return; // Blocked!
      }

      // Check for boomerang
      const hasBoomerang = inv.findIndex(i => i.id === 'boomerang');
      if (hasBoomerang >= 0 && payload.isAttack) {
        s.setInventory(prev => prev.filter((_, idx) => idx !== hasBoomerang));
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

      s.setActiveEffects(prev => [...prev, effect]);
      if (effect.expiresAt) {
        setTimeout(() => {
          useRoomStore.getState().setActiveEffects(prev => prev.filter(e => e !== effect));
        }, payload.duration * 1000);
      }
    });

  // ── Presence (FIXED: additive-only) ──
  channel.on('presence', { event: 'sync' }, () => {
    const s = useRoomStore.getState();
    const state = channel.presenceState();
    const onlineIds = Object.values(state).flat().map(p => p.playerId);

    // Only update is_online — never remove or reorder
    s.setPlayers(prev => {
      const changed = prev.some(p => p.is_online !== onlineIds.includes(p.id));
      if (!changed) return prev;
      return prev.map(p => ({ ...p, is_online: onlineIds.includes(p.id) }));
    });

    const me = refs.myPlayer;

    // ── Auto-close if Host is missing (Client) ──
    if (me && !me.is_host) {
      const players = s.players;
      const hasHostData = players.some(x => x.is_host);

      if (hasHostData) {
        const hostOnline = onlineIds.some(id => {
          const p = players.find(x => x.id === id);
          return p && p.is_host;
        });

        if (!hostOnline) {
          if (!refs.hostOfflineTimer) {
            refs.hostOfflineTimer = setTimeout(() => {
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
      const players = s.players;
      const ghostPlayers = players.filter(p => {
        if (p.is_host) return false;
        if (onlineIds.includes(p.id)) return false;
        const joinedAt = p.created_at ? new Date(p.created_at).getTime() : now;
        return (now - joinedAt) > GHOST_GRACE_MS;
      });

      if (ghostPlayers.length > 0) {
        const ghostIds = ghostPlayers.map(p => p.id);
        if (refs.phase === 'waiting') {
          supabase.from('mg_room_players').delete().in('id', ghostIds).then(() => {
            useRoomStore.getState().fetchPlayersDebounced(code);
            channel.send({ type: 'broadcast', event: 'player_left', payload: {} });
          });
        } else {
          supabase.from('mg_room_players').update({ is_online: false }).in('id', ghostIds).then(() => {
            useRoomStore.getState().fetchPlayersDebounced(code);
            channel.send({ type: 'broadcast', event: 'player_left', payload: {} });
          });
        }
      }
    }
  });

  // ── Subscribe + Track Presence ──
  channel.subscribe(async (status) => {
    console.log('[MP] channel subscribe status:', status);
    if (status === 'SUBSCRIBED') {
      useRoomStore.getState().setConnectionStatus('connected');
      await channel.track({ playerId: myPlayerId, playerName: myName });
      console.log('[MP] presence tracked for:', myPlayerId);

      // ── CRITICAL FIX: Reconcile state from DB on (re)connect ──
      // Mobile clients often miss fire-and-forget broadcasts (game_start,
      // next_question, etc.) due to WebSocket disconnects. On every
      // reconnect we check the authoritative DB state and fast-forward
      // the client if it's behind.
      try {
        const s = useRoomStore.getState();
        const isPlayer = !s._refs.myPlayer?.is_host;

        if (isPlayer) {
          const { data: room } = await supabase
            .from('mg_rooms')
            .select('status, current_question, settings')
            .eq('id', code)
            .single();

          if (room) {
            const currentPhase = s.phase;

            if (room.status === 'playing' && (currentPhase === 'waiting' || currentPhase === 'idle')) {
              // Client is stuck in waiting — fast-forward to playing
              console.log('[MP] Reconcile: room is playing, client was', currentPhase, '→ fast-forwarding');
              if (room.settings?.shareScreen !== undefined) {
                s.setShareScreen(room.settings.shareScreen);
              }
              s.setRoomSettings(room.settings || {});
              s.setPhase('playing');
              s.setCurrentQuestion(room.current_question ?? 0);
              s.setQuestionStartTime(Date.now());
              s.setAnsweredThisQ(false);
            } else if (room.status === 'finished' && currentPhase !== 'podium') {
              console.log('[MP] Reconcile: room is finished → setting podium');
              s.setPhase('podium');
            }
          }
        }

        // Always refresh player list on reconnect
        s.fetchPlayersDebounced(code);
      } catch (err) {
        console.warn('[MP] Reconcile check failed:', err);
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      useRoomStore.getState().setConnectionStatus('error');
    } else if (status === 'CLOSED') {
      useRoomStore.getState().setConnectionStatus('disconnected');
    }
  });

  refs.channel = channel;
  store.fetchPlayers(code);
  console.log('[MP] subscribeToRoom complete for:', code);
}

/**
 * React hook for heartbeat reconciliation and lifecycle cleanup.
 * Must be called from a React component.
 */
export function useRoomChannelLifecycle() {
  const { isHost, roomId, phase, fetchPlayers, _refs: refs } = useRoomStore();

  // ── Heartbeat (Host-only, 8s) ──
  useEffect(() => {
    if (!isHost || !roomId) return;
    if (phase === 'podium' || phase === 'idle') return;

    refs.heartbeat = setInterval(() => {
      const code = useRoomStore.getState().roomId;
      if (code) useRoomStore.getState().fetchPlayers(code);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (refs.heartbeat) {
        clearInterval(refs.heartbeat);
        refs.heartbeat = null;
      }
    };
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
      fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ status: 'finished' }), keepalive: true }).catch(() => {});
    };
    window.addEventListener('beforeunload', markFinished);
    return () => window.removeEventListener('beforeunload', markFinished);
  }, [isHost, roomId]);

  // ── Unmount Cleanup ──
  useEffect(() => {
    return () => {
      const r = useRoomStore.getState()._refs;
      if (r.hostOfflineTimer) clearTimeout(r.hostOfflineTimer);
      if (r.heartbeat) { clearInterval(r.heartbeat); r.heartbeat = null; }
      if (r.fetchDebounce) { clearTimeout(r.fetchDebounce); r.fetchDebounce = null; }
      if (r.channel) {
        supabase.removeChannel(r.channel);
      }
      // Mark room finished on unmount
      const state = useRoomStore.getState();
      const currentIsHost = r.myPlayer?.is_host || state.isHost;
      const currentRoomId = state.roomId;
      if (currentIsHost && currentRoomId) {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mg_rooms?id=eq.${currentRoomId}`;
        const headers = {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        };
        fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ status: 'finished' }), keepalive: true }).catch(() => {});
      }
    };
  }, []);
}
