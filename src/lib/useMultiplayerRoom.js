/**
 * ============================================================
 * TINA MINIGAME — useMultiplayerRoom (v2)
 * ============================================================
 * Real-time multiplayer hook using Supabase Channels.
 * Kahoot-style: Host controls pacing, all players sync.
 *
 * v2 Changes:
 * - Time-decay scoring via scoringEngine
 * - Power-up items system
 * - previousLeaderboard for animated rank changes
 * - shareScreen mode support
 * - Item broadcast events
 *
 * Events (broadcast):
 *   game_start      → Host starts the game (includes settings)
 *   next_question   → Host advances to next question
 *   submit_answer   → Player submits their answer
 *   show_leaderboard → Between questions
 *   reaction        → Fun emoji reactions
 *   game_end        → Game finished
 *   player_joined   → Notify new player
 *   use_powerup     → Player uses a power-up
 *   powerup_effect  → Effect lands on target player
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { calcScore } from '@/lib/scoringEngine';
import { getStartingItems, rollForItem, addToInventory, useFromInventory, getPowerUp } from '@/lib/powerUpSystem';

// ── Random Room Code Generator ──────────────────────────────
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Random Image Avatar ─────────────────────────────────────
const AVATARS = [
  '/avatars/avatar_1.png', '/avatars/avatar_2.png',
  '/avatars/avatar_3.png', '/avatars/avatar_4.png',
  '/avatars/avatar_5.png', '/avatars/avatar_6.png',
  '/avatars/avatar_7.png', '/avatars/avatar_8.png',
];
function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

export function useMultiplayerRoom(activityId) {
  // ── State ─────────────────────────────────────────────────
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('idle');
  const [currentQuestion, setCurrentQuestion] = useState(-1);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [answeredThisQ, setAnsweredThisQ] = useState(false);
  const [answerStats, setAnswerStats] = useState(null);
  const [roomSettings, setRoomSettings] = useState({});
  const [reactions, setReactions] = useState([]);
  const roomSettingsRef = useRef({});
  const [fastestPlayer, setFastestPlayer] = useState(null);
  const [error, setError] = useState(null);

  const currentQuestionRef = useRef(-1);

  // ── v2 State ──────────────────────────────────────────────
  const [shareScreen, setShareScreen] = useState(true);
  const [previousLeaderboard, setPreviousLeaderboard] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeEffects, setActiveEffects] = useState([]); // [{effectType, expiresAt, fromPlayer}]
  const [itemMultiplier, setItemMultiplier] = useState(1);
  const [luckMultiplier, setLuckMultiplier] = useState(1);
  const [lastRoundPoints, setLastRoundPoints] = useState({});  // {playerId: points}
  
  // ── Typing Game Feed States ───────────────────────────────
  const [wrongGuesses, setWrongGuesses] = useState([]); // [{id, word, timestamp}]
  const [correctPlayers, setCorrectPlayers] = useState([]); // [{playerId, playerName, avatar}]

  const channelRef = useRef(null);
  const myPlayerRef = useRef(null);
  const playersRef = useRef([]);
  playersRef.current = players;
  const hostOfflineTimerRef = useRef(null);
  const setErrorRef = useRef(setError);
  setErrorRef.current = setError;

  // ── Create Room (Host) ────────────────────────────────────
  const createRoom = useCallback(async (playerName) => {
    try {
      const code = generateRoomCode();
      const avatar = randomAvatar();

      const { error: roomError } = await supabase
        .from('mg_rooms')
        .insert({
          id: code,
          activity_id: activityId,
          host_name: playerName,
          status: 'waiting',
          max_players: 40,
          settings: { hostPacing: true, showLeaderboard: true },
        });

      if (roomError) throw roomError;

      const { data: playerData, error: playerError } = await supabase
        .from('mg_room_players')
        .insert({
          room_id: code,
          player_name: playerName,
          avatar_emoji: avatar,
          is_host: true,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setRoomId(code);
      setPlayerId(playerData.id);
      setIsHost(true);
      myPlayerRef.current = playerData;

      await subscribeToRoom(code, playerData.id, playerName);
      setPhase('waiting');

      return code;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [activityId]);

  // ── Join Room (Player) ────────────────────────────────────
  const joinRoom = useCallback(async (code, playerName, requestedAvatar = null) => {
    try {
      const upperCode = code.toUpperCase();
      const trimmedName = playerName.trim();

      if (localStorage.getItem(`tina_banned_room_${upperCode}`)) {
        return { success: false, error: 'Bạn đã bị máy chủ từ chối (Banned)!', type: 'banned' };
      }

      const { data: room, error: roomError } = await supabase
        .from('mg_rooms')
        .select('*')
        .eq('id', upperCode)
        .single();

      if (roomError || !room) return { success: false, error: 'Phòng không tồn tại!', type: 'not_found' };
      if (room.status === 'finished') return { success: false, error: 'Phòng đã kết thúc!', type: 'finished' };
      
      setRoomSettings(room.settings || {});
      roomSettingsRef.current = room.settings || {};

      // ── Duplicate name check (case-insensitive) ──────────
      const { data: playersWithSameName } = await supabase
        .from('mg_room_players')
        .select('*')
        .eq('room_id', upperCode)
        .ilike('player_name', trimmedName);

      let playerData;

      if (playersWithSameName && playersWithSameName.length > 0) {
        // There's already someone with this name in the room
        // Check if this is a RECONNECTION (same device)
        const sessionKey = `tina_player_session_${upperCode}`;
        const savedPlayerId = localStorage.getItem(sessionKey);
        const matchingSession = playersWithSameName.find(p => p.id === savedPlayerId);

        if (matchingSession) {
          // This is a legitimate reconnection from the same device
          playerData = matchingSession;
          await supabase
            .from('mg_room_players')
            .update({ is_online: true })
            .eq('id', matchingSession.id);
        } else {
          // This is a DIFFERENT person trying to use the same name → BLOCK
          return { 
            success: false, 
            error: `Tên "${trimmedName}" đã có người sử dụng trong phòng! Vui lòng chọn tên khác.`, 
            type: 'duplicate_name' 
          };
        }
      } else {
        // No one with this name exists yet — create new player
        if (room.status !== 'waiting') return { success: false, error: 'Phòng đã bắt đầu chơi rồi!', type: 'started' };

        const { count } = await supabase
          .from('mg_room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', upperCode);

        if (count >= room.max_players) return { success: false, error: 'Phòng đã đầy!', type: 'full' };

        const avatar = requestedAvatar || randomAvatar();

        const { data: newPlayer, error: playerError } = await supabase
          .from('mg_room_players')
          .insert({
            room_id: upperCode,
            player_name: trimmedName,
            avatar_emoji: avatar,
            is_host: false,
          })
          .select()
          .single();

        if (playerError) return { success: false, error: playerError.message, type: 'db_error' };
        playerData = newPlayer;
        
        // Save session for future reconnects (keyed by room only, not by name)
        localStorage.setItem(`tina_player_session_${upperCode}`, newPlayer.id);
      }

      setRoomId(upperCode);
      setPlayerId(playerData.id);
      setIsHost(playerData.is_host || false);
      myPlayerRef.current = playerData;

      await subscribeToRoom(upperCode, playerData.id, trimmedName);
      setPhase('waiting');

      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { playerName: trimmedName, avatar: playerData.avatar_emoji, playerId: playerData.id },
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message, type: 'unknown' };
    }
  }, []);

  // ── Subscribe to Room Channel ─────────────────────────────
  const subscribeToRoom = useCallback(async (code, myPlayerId, myName) => {
    console.log('[MP] subscribeToRoom:', code, myPlayerId, myName);
    const channel = supabase.channel(`room:${code}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'player_joined' }, (msg) => {
        console.log('[MP] player_joined event received:', msg?.payload);
        fetchPlayers(code);
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        // Save shareScreen setting
        if (payload?.settings?.shareScreen !== undefined) {
          setShareScreen(payload.settings.shareScreen);
        }

        // Give each player 2 starting items
        const startItems = getStartingItems();
        setInventory(startItems);

        // Snapshot leaderboard 
        setPreviousLeaderboard([...playersRef.current].filter(p => p.player_name !== 'Host Teacher' && p.player_name !== 'Giáo viên').sort((a, b) => (b.score || 0) - (a.score || 0)));

        if (myPlayerRef.current?.is_host) return; // Host does this optimistically

        setPhase('countdown');
        setTimeout(() => {
          setPhase('playing');
          setCurrentQuestion(0);
          currentQuestionRef.current = 0;
          setQuestionStartTime(Date.now());
          setAnsweredThisQ(false);
          setActiveEffects([]);
          setItemMultiplier(1);
        }, 3500);
      })
      .on('broadcast', { event: 'next_question' }, ({ payload }) => {
        // Snapshot leaderboard before next question
        setPreviousLeaderboard([...playersRef.current].filter(p => p.player_name !== 'Host Teacher' && p.player_name !== 'Giáo viên').sort((a, b) => (b.score || 0) - (a.score || 0)));
        setLastRoundPoints({});

        if (myPlayerRef.current?.is_host) return;

        setCurrentQuestion(payload.questionIndex);
        currentQuestionRef.current = payload.questionIndex;
        setQuestionStartTime(Date.now());
        setAnsweredThisQ(false);
        setAnswerStats(null);
        setFastestPlayer(null);
        setPhase('playing');
        
        setWrongGuesses([]);
        setCorrectPlayers([]);

        // Reset per-question item multiplier
        setItemMultiplier(1);

        // Clear expired effects
        setActiveEffects(prev => prev.filter(e => !e.expiresAt || e.expiresAt > Date.now()));
      })
      .on('broadcast', { event: 'show_leaderboard' }, ({ payload }) => {
        if (myPlayerRef.current?.is_host) return; // Host does this optimistically

        setPhase('leaderboard');
        setAnswerStats(payload.answerStats || null);
        setFastestPlayer(payload.fastestPlayer || null);
        if (payload.roundPoints) setLastRoundPoints(payload.roundPoints);
        fetchPlayers(code);
      })
      .on('broadcast', { event: 'submit_answer' }, ({ payload }) => {
        if (payload.questionIndex !== currentQuestionRef.current) return; // IGNORE STALE ANSWERS

        setPlayers(prev => prev.map(p =>
          p.id === payload.playerId
            ? { ...p, score: payload.newScore, streak: payload.newStreak }
            : p
        ));
        // Track round points per player
        setLastRoundPoints(prev => ({ ...prev, [payload.playerId]: payload.points }));
        
        // Add to live feed of who has answered
        setCorrectPlayers(prev => {
          if (prev.some(x => x.playerId === payload.playerId)) return prev;
          const p = playersRef.current.find(x => x.id === payload.playerId);
          return [...prev, { playerId: payload.playerId, playerName: p?.player_name || payload.playerName, avatar: p?.avatar_emoji || payload.avatar, correct: payload.isCorrect }];
        });
      })
      .on('broadcast', { event: 'wrong_guess' }, ({ payload }) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        setWrongGuesses(prev => [...prev.slice(-9), { id, word: payload.word, timestamp: Date.now() }]);
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reactionId = `${payload.playerId}-${Date.now()}`;
        setReactions(prev => [...prev.slice(-20), {
          id: reactionId,
          emoji: payload.emoji,
          playerName: payload.playerName,
          timestamp: Date.now(),
        }]);
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== reactionId));
        }, 3000);
      })
      .on('broadcast', { event: 'pair_matched' }, ({ payload }) => {
        // Dispatch custom event for Host UI to trigger effects
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tina_pair_matched', { 
            detail: { pairId: payload.pairId, playerName: payload.playerName } 
          }));
        }
      })
      .on('broadcast', { event: 'game_end' }, () => {
        setPhase('podium');
        // Do NOT fetchPlayers here! The host deletes the Room immediately on game_end,
        // which CASCADE deletes all players in the DB.
        // We rely on the local state which already has the final scores.
        setPlayers([...playersRef.current].sort((a, b) => (b.score || 0) - (a.score || 0)));
      })
      .on('broadcast', { event: 'player_left' }, () => {
        fetchPlayers(code);
      })
      .on('broadcast', { event: 'kick_player' }, ({ payload }) => {
        if (payload.targetId === myPlayerId) {
          if (payload.ban) {
            localStorage.setItem(`tina_banned_room_${code}`, 'true');
            setError('Bạn đã bị Host bị cấm khỏi phòng này!');
          } else {
            setError('Bạn đã bị Host mời ra khỏi phòng.');
          }
          leaveRoom();
        } else {
          fetchPlayers(code);
        }
      })
      // ── return_to_grid (Open Box) ────────
      .on('broadcast', { event: 'return_to_grid' }, (msg) => {
        const { openedBoxes } = msg.payload || {};
        setPhase('playing');
        setCurrentQuestion(-1);
        currentQuestionRef.current = -1;
        const newSettings = { ...roomSettingsRef.current, openedBoxes: openedBoxes || [] };
        setRoomSettings(newSettings);
        roomSettingsRef.current = newSettings;
      })
      // ── Power-Up Events ─────────────────────────────────
      .on('broadcast', { event: 'use_powerup' }, ({ payload }) => {
        // Someone used a power-up — show visual indicator
      })
      .on('broadcast', { event: 'powerup_effect' }, ({ payload }) => {
        // An effect targets me
        if (payload.targetId === myPlayerId) {
          const effect = {
            effectType: payload.effectType,
            fromPlayer: payload.fromPlayerName,
            expiresAt: payload.duration ? Date.now() + payload.duration * 1000 : null,
            itemEmoji: payload.itemEmoji,
            itemName: payload.itemName,
          };

          // Check for shield
          const hasShield = inventory.findIndex(i => i.id === 'shield');
          if (hasShield >= 0 && payload.isAttack) {
            // Shield blocks the attack
            setInventory(prev => prev.filter((_, idx) => idx !== hasShield));
            return; // Blocked!
          }

          // Check for boomerang
          const hasBoomerang = inventory.findIndex(i => i.id === 'boomerang');
          if (hasBoomerang >= 0 && payload.isAttack) {
            setInventory(prev => prev.filter((_, idx) => idx !== hasBoomerang));
            // Reflect back to attacker
            channelRef.current?.send({
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

          setActiveEffects(prev => [...prev, effect]);

          // Auto-remove after duration
          if (effect.expiresAt) {
            setTimeout(() => {
              setActiveEffects(prev => prev.filter(e => e !== effect));
            }, payload.duration * 1000);
          }
        }
      });

      // ── Presence ──────────────────────────────────────────
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state).flat().map(p => p.playerId);
        setPlayers(prev => prev.map(p => ({
          ...p,
          is_online: onlineIds.includes(p.id),
        })));

        const me = myPlayerRef.current;
        
        // ── Auto-close if Host is missing for 3 seconds (Client) ──────
        if (me && !me.is_host) {
          const hasHostData = playersRef.current.some(x => x.is_host);
          
          if (hasHostData) {
            const hostOnline = onlineIds.some(id => {
              const p = playersRef.current.find(x => x.id === id);
              return p && p.is_host;
            });

            if (!hostOnline) {
              if (!hostOfflineTimerRef.current) {
                hostOfflineTimerRef.current = setTimeout(() => {
                  setErrorRef.current('Hệ thống ngắt kết nối do Host đã rời đi quá lâu!');
                  if (leaveRoomRef.current) leaveRoomRef.current();
                }, 3000);
              }
            } else {
              if (hostOfflineTimerRef.current) {
                clearTimeout(hostOfflineTimerRef.current);
                hostOfflineTimerRef.current = null;
              }
            }
          }
        }

        // ── Auto-delete disconnected players (Host) ─────────
        if (me && me.is_host) {
          // Find players currently in DB state but NOT in onlineIds presence
          // Grace period: only remove players who joined more than 15 seconds ago
          // (newly joined players may not have tracked presence yet)
          const now = Date.now();
          const GRACE_MS = 15000;
          const ghostPlayers = playersRef.current.filter(p => {
            if (p.is_host) return false;
            if (onlineIds.includes(p.id)) return false;
            // Don't delete players who just joined (within grace period)
            const joinedAt = p.created_at ? new Date(p.created_at).getTime() : now;
            return (now - joinedAt) > GRACE_MS;
          });
          
          if (ghostPlayers.length > 0) {
            const ghostIds = ghostPlayers.map(p => p.id);
            if (phaseRef.current === 'waiting') {
              // Erase them completely from DB if game hasn't started
              supabase.from('mg_room_players').delete().in('id', ghostIds).then(() => {
                 channelRef.current?.send({ type: 'broadcast', event: 'player_left', payload: {} });
              });
            } else {
              // Game started: preserve score, just mark offline so they stay on leaderboard!
              supabase.from('mg_room_players').update({ is_online: false }).in('id', ghostIds).then(() => {
                 channelRef.current?.send({ type: 'broadcast', event: 'player_left', payload: {} });
              });
            }
          }
        }
      });

    await channel.subscribe(async (status) => {
      console.log('[MP] channel subscribe status:', status);
      if (status === 'SUBSCRIBED') {
        await channel.track({ playerId: myPlayerId, playerName: myName });
        console.log('[MP] presence tracked for:', myPlayerId);
      }
    });

    channelRef.current = channel;
    await fetchPlayers(code);
    console.log('[MP] initial fetchPlayers done for room:', code);
  }, []);

  // ── Fetch Players from DB ─────────────────────────────────
  const fetchPlayers = useCallback(async (code) => {
    const { data } = await supabase
      .from('mg_room_players')
      .select('*')
      .eq('room_id', code)
      .order('score', { ascending: false });

    if (data) setPlayers(data);
  }, []);

  // ── Update Player Profile ─────────────────────────────────
  const updatePlayerProfile = useCallback(async (name, avatar) => {
    if (!playerId || !roomId) return false;
    try {
      await supabase
        .from('mg_room_players')
        .update({ player_name: name, avatar_emoji: avatar })
        .eq('id', playerId);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { playerName: name, avatar: avatar, playerId: playerId },
        });
      }
      await fetchPlayers(roomId);
      return true;
    } catch (err) {
      console.error('Error updating player profile:', err);
      return false;
    }
  }, [playerId, roomId, fetchPlayers]);

  // ── Host: Start Game ──────────────────────────────────────
  const hostStartGame = useCallback(async (settings = {}) => {
    if (!isHost || !roomId) return;

    const startQ = settings.initialQuestion !== undefined ? settings.initialQuestion : 0;

    const { error } = await supabase
      .from('mg_rooms')
      .update({ status: 'playing', current_question: startQ, settings })
      .eq('id', roomId);

    if (error) {
      console.warn("Could not save settings. Starting game anyway...");
      await supabase
        .from('mg_rooms')
        .update({ status: 'playing', current_question: startQ })
        .eq('id', roomId);
    }

    // Snapshot leaderboard
    setPreviousLeaderboard([...playersRef.current].sort((a, b) => (b.score || 0) - (a.score || 0)));

    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { settings },
    });

    // Optimistic fallback for Host
    setPhase('countdown');
    setTimeout(() => {
      setPhase('playing');
      setCurrentQuestion(startQ);
      currentQuestionRef.current = startQ;
      setQuestionStartTime(Date.now());
      setAnsweredThisQ(false);
      setActiveEffects([]);
      setItemMultiplier(1);
    }, 3500);
  }, [isHost, roomId]);

  // ── Host: Return To Grid (Open Box) ───────────────────────
  const hostReturnToGrid = useCallback(async (openedIndex) => {
    if (!isHost || !roomId) return;

    const currentOpened = roomSettingsRef.current?.openedBoxes || [];
    if (!currentOpened.includes(openedIndex)) {
       currentOpened.push(openedIndex);
    }
    
    const newSettings = { ...roomSettingsRef.current, openedBoxes: currentOpened };

    await supabase
      .from('mg_rooms')
      .update({ current_question: -1, settings: newSettings })
      .eq('id', roomId);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'return_to_grid',
      payload: { openedBoxes: currentOpened },
    });

    // Optimistic
    setCurrentQuestion(-1);
    currentQuestionRef.current = -1;
    setRoomSettings(newSettings);
    roomSettingsRef.current = newSettings;
  }, [isHost, roomId]);

  // ── Host: Next Question ───────────────────────────────────
  const hostNextQuestion = useCallback(async (nextIndex) => {
    if (!isHost || !roomId) return;

    await supabase
      .from('mg_rooms')
      .update({ current_question: nextIndex })
      .eq('id', roomId);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'next_question',
      payload: { questionIndex: nextIndex },
    });

    // Optimistic fallback for Host
    // Snapshot leaderboard before next question
    setPreviousLeaderboard([...playersRef.current].filter(p => p.player_name !== 'Host Teacher' && p.player_name !== 'Giáo viên').sort((a, b) => (b.score || 0) - (a.score || 0)));
    setLastRoundPoints({});

    setCurrentQuestion(nextIndex);
    currentQuestionRef.current = nextIndex;
    setQuestionStartTime(Date.now());
    setAnsweredThisQ(false);
    setAnswerStats(null);
    setFastestPlayer(null);
    setPhase('playing');
    setWrongGuesses([]);
    setCorrectPlayers([]);
    setItemMultiplier(1);
    setActiveEffects(prev => prev.filter(e => !e.expiresAt || e.expiresAt > Date.now()));
  }, [isHost, roomId]);

  // ── Host: Kick Player ─────────────────────────────────────
  const hostKickPlayer = useCallback(async (targetId, ban = false) => {
    if (!isHost || !roomId) return;
    
    await supabase.from('mg_room_players').delete().eq('id', targetId);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'kick_player',
      payload: { targetId, ban },
    });
    
    fetchPlayers(roomId);
  }, [isHost, roomId]);

  // ── Host: Show Leaderboard ────────────────────────────────
  const hostShowLeaderboard = useCallback(async (stats) => {
    if (!isHost) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'show_leaderboard',
      payload: {
        answerStats: stats?.answerStats || null,
        fastestPlayer: stats?.fastestPlayer || null,
        roundPoints: stats?.roundPoints || {},
      },
    });

    // Optimistic fallback for Host
    setPhase('leaderboard');
    setLastRoundPoints(stats?.roundPoints || {});
  }, [isHost]);

  // ── Host: End Game ────────────────────────────────────────
  const hostEndGame = useCallback(async () => {
    if (!isHost || !roomId) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_end',
      payload: {},
    });

    await supabase
      .from('mg_rooms')
      .delete()
      .eq('id', roomId);
  }, [isHost, roomId]);

  // ── Player: Submit Answer ─────────────────────────────────
  const submitAnswer = useCallback(async (selectedIndex, isCorrect, item, totalQuestions, overridePoints = null) => {
    if (!playerId || !roomId || answeredThisQ) return;

    setAnsweredThisQ(true);
    const timeMs = Date.now() - (questionStartTime || Date.now());
    const timeLimit = (item?.extra_data?.time_limit || 20) * 1000;
    const timeRemaining = Math.max(0, timeLimit - timeMs);

    const myPlayer = playersRef.current.find(p => p.id === playerId);
    const currentStreak = myPlayer?.streak || 0;

    // Calculate score using the new engine
    let scoreResult;
    if (overridePoints !== null) {
      scoreResult = {
        points: overridePoints * itemMultiplier,
        newStreak: isCorrect ? currentStreak + 1 : 0,
        breakdown: { base: overridePoints, streakMultiplier: 1 }
      };
    } else {
      scoreResult = calcScore({
        isCorrect,
        timeRemainingMs: timeRemaining,
        timeLimitMs: timeLimit,
        currentStreak,
        itemMultiplier,
      });
    }

    // Reset item multiplier after use
    if (itemMultiplier > 1) setItemMultiplier(1);

    const newScore = (myPlayer?.score || 0) + scoreResult.points;
    const answerRecord = {
      questionIndex: currentQuestion,
      selectedIndex,
      correct: isCorrect,
      timeMs,
      points: scoreResult.points,
    };

    // Update DB
    const existingAnswers = myPlayer?.answers || [];
    await supabase
      .from('mg_room_players')
      .update({
        score: newScore,
        streak: scoreResult.newStreak,
        answers: [...existingAnswers, answerRecord],
      })
      .eq('id', playerId);

    // Broadcast to all
    channelRef.current?.send({
      type: 'broadcast',
      event: 'submit_answer',
      payload: {
        playerId,
        playerName: myPlayer?.player_name,
        questionIndex: currentQuestion,
        isCorrect,
        timeMs,
        points: scoreResult.points,
        newScore,
        newStreak: scoreResult.newStreak,
      },
    });

    // Optimistic: add self to correctPlayers (broadcast doesn't echo back to sender)
    setCorrectPlayers(prev => {
      if (prev.some(x => x.playerId === playerId)) return prev;
      return [...prev, { playerId, playerName: myPlayer?.player_name, avatar: myPlayer?.avatar_emoji, correct: isCorrect }];
    });

    // Roll for new item (30% chance on correct answer)
    if (isCorrect && Math.random() < 0.3 * luckMultiplier) {
      const newItem = rollForItem(luckMultiplier);
      if (newItem) {
        const result = addToInventory(inventory, newItem);
        if (result.success) {
          setInventory(result.inventory);
        }
        // If inventory full, item is silently lost
      }
    }

    // Reset luck if used
    if (luckMultiplier > 1) setLuckMultiplier(1);

    return { points: scoreResult.points, newScore, newStreak: scoreResult.newStreak, breakdown: scoreResult.breakdown, streakInfo: scoreResult.streakInfo };
  }, [playerId, roomId, answeredThisQ, questionStartTime, currentQuestion, itemMultiplier, luckMultiplier, inventory]);

  // ── Player: Pair Matched ──────────────────────────────────
  const broadcastPairMatch = useCallback((pairId) => {
    if (!playerId || !roomId) return;
    const myPlayer = playersRef.current.find(p => p.id === playerId);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'pair_matched',
      payload: {
        playerId,
        playerName: myPlayer?.player_name || 'Một học sinh',
        pairId,
      },
    });
  }, [playerId, roomId]);

  // ── Player: Use Power-Up ──────────────────────────────────
  const usePowerUp = useCallback((slotIndex) => {
    if (slotIndex < 0 || slotIndex >= inventory.length) return null;
    const { item, inventory: newInv } = useFromInventory(inventory, slotIndex);
    if (!item) return null;

    setInventory(newInv);

    // Apply immediate self-effects
    switch (item.effect.type) {
      case 'score_multiply':
        setItemMultiplier(item.effect.value);
        break;
      case 'time_extend':
        // Dispatch custom event for the timer component to listen
        window.dispatchEvent(new CustomEvent('tina_time_extend', { detail: item.effect.value }));
        break;
      case 'restore_streak': {
        const myPlayer = playersRef.current.find(p => p.id === playerId);
        if (myPlayer) {
          supabase.from('mg_room_players').update({ streak: item.effect.value }).eq('id', playerId);
          setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, streak: item.effect.value } : p));
        }
        break;
      }
      case 'luck_boost':
        setLuckMultiplier(item.effect.value);
        break;
      case 'eliminate_wrong':
        window.dispatchEvent(new CustomEvent('tina_eliminate_wrong'));
        break;
      case 'reveal_answer':
        window.dispatchEvent(new CustomEvent('tina_reveal_answer', { detail: item.effect.duration }));
        break;
      case 'hide_name':
        // Will be handled in leaderboard rendering
        break;

      // Attack items → broadcast to random target
      case 'blur_screen':
      case 'freeze_player':
      case 'reverse_controls':
      case 'shrink_text':
      case 'scramble_options':
      case 'hide_correct': {
        const otherPlayers = playersRef.current.filter(p => p.id !== playerId && !p.is_host);
        if (otherPlayers.length === 0) break;
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        channelRef.current?.send({
          type: 'broadcast',
          event: 'powerup_effect',
          payload: {
            targetId: target.id,
            effectType: item.effect.type,
            duration: item.effect.duration || 3,
            fromPlayerId: playerId,
            fromPlayerName: playersRef.current.find(p => p.id === playerId)?.player_name || 'Player',
            itemEmoji: item.emoji,
            itemName: item.name,
            isAttack: true,
          },
        });
        break;
      }

      case 'steal_points': {
        const leader = [...playersRef.current].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        if (leader && leader.id !== playerId) {
          const stealAmount = Math.min(item.effect.value, leader.score || 0);
          // Update both players
          const myPlayer = playersRef.current.find(p => p.id === playerId);
          supabase.from('mg_room_players').update({ score: (leader.score || 0) - stealAmount }).eq('id', leader.id);
          supabase.from('mg_room_players').update({ score: (myPlayer?.score || 0) + stealAmount }).eq('id', playerId);
          setPlayers(prev => prev.map(p => {
            if (p.id === leader.id) return { ...p, score: (p.score || 0) - stealAmount };
            if (p.id === playerId) return { ...p, score: (p.score || 0) + stealAmount };
            return p;
          }));
        }
        break;
      }

      case 'mass_damage': {
        const others = playersRef.current.filter(p => p.id !== playerId && !p.is_host);
        const targets = others.sort(() => Math.random() - 0.5).slice(0, item.effect.targets || 3);
        targets.forEach(t => {
          const newScore = Math.max(0, (t.score || 0) - item.effect.value);
          supabase.from('mg_room_players').update({ score: newScore }).eq('id', t.id);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'powerup_effect',
            payload: {
              targetId: t.id, effectType: 'lightning_hit',
              duration: 2, fromPlayerId: playerId,
              fromPlayerName: playersRef.current.find(p => p.id === playerId)?.player_name,
              itemEmoji: '🌩️', itemName: 'Lightning Strike', isAttack: true,
            },
          });
        });
        setPlayers(prev => prev.map(p => {
          if (targets.find(t => t.id === p.id)) return { ...p, score: Math.max(0, (p.score || 0) - item.effect.value) };
          return p;
        }));
        break;
      }

      case 'swap_rank': {
        const sorted = [...playersRef.current].sort((a, b) => (b.score || 0) - (a.score || 0));
        const myIdx = sorted.findIndex(p => p.id === playerId);
        if (myIdx > 0) {
          const above = sorted[myIdx - 1];
          const myPlayer = sorted[myIdx];
          const [sA, sB] = [above.score, myPlayer.score];
          supabase.from('mg_room_players').update({ score: sB }).eq('id', above.id);
          supabase.from('mg_room_players').update({ score: sA }).eq('id', playerId);
          setPlayers(prev => prev.map(p => {
            if (p.id === above.id) return { ...p, score: sB };
            if (p.id === playerId) return { ...p, score: sA };
            return p;
          }));
        }
        break;
      }
    }

    // Broadcast that item was used (for visual feedback)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'use_powerup',
      payload: {
        playerId,
        playerName: playersRef.current.find(p => p.id === playerId)?.player_name,
        itemId: item.id,
        itemEmoji: item.emoji,
        itemName: item.name,
      },
    });

    return item;
  }, [inventory, playerId]);

  // ── Player: Send Reaction ─────────────────────────────────
  const sendReaction = useCallback((emoji) => {
    if (!channelRef.current) return;
    const myPlayer = playersRef.current.find(p => p.id === playerId);
    channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: {
        playerId,
        playerName: myPlayer?.player_name || 'Player',
        emoji,
      },
    });
  }, [playerId]);

  // ── Leave Room ────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    if (hostOfflineTimerRef.current) clearTimeout(hostOfflineTimerRef.current);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_left',
        payload: { playerId },
      });
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (playerId) {
      await supabase
        .from('mg_room_players')
        .update({ is_online: false })
        .eq('id', playerId);
    }
    // If host leaves, mark room as finished so link expires
    if (isHost && roomId) {
      await supabase
        .from('mg_rooms')
        .update({ status: 'finished' })
        .eq('id', roomId);
    }
    setPhase('idle');
  }, [playerId, isHost, roomId]);

  // ── Host: mark room finished on tab close ─────────────────
  useEffect(() => {
    if (!isHost || !roomId) return;

    const markFinished = () => {
      // Use sendBeacon for reliability on tab close
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mg_rooms?id=eq.${roomId}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      };
      const body = JSON.stringify({ status: 'finished' });

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        // sendBeacon doesn't support custom headers, fall back to fetch keepalive
        fetch(url, { method: 'PATCH', headers, body, keepalive: true }).catch(() => {});
      } else {
        fetch(url, { method: 'PATCH', headers, body, keepalive: true }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', markFinished);
    return () => {
      window.removeEventListener('beforeunload', markFinished);
    };
  }, [isHost, roomId]);

  // Refs to allow cleanup to read latest values without depending on them
  const roomIdRef = useRef(roomId);
  const isHostRef = useRef(isHost);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (hostOfflineTimerRef.current) clearTimeout(hostOfflineTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      // Also mark room finished on component unmount (navigation away)
      const currentRoomId = roomIdRef.current;
      const currentIsHost = myPlayerRef.current?.is_host || isHostRef.current;
      if (currentIsHost && currentRoomId) {
        // Use keepalive fetch as it's more reliable during unmount
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

  const leaveRoomRef = useRef();
  leaveRoomRef.current = leaveRoom;

  // ── Sorted leaderboard ────────────────────────────────────
  const leaderboard = [...players].filter(p => p.player_name !== 'Host Teacher' && p.player_name !== 'Giáo viên').sort((a, b) => (b.score || 0) - (a.score || 0));
  const myPlayer = players.find(p => p.id === playerId);
  const myRank = leaderboard.findIndex(p => p.id === playerId) + 1;

  return {
    // State
    roomId, playerId, isHost, players, phase, currentQuestion,
    answeredThisQ, answerStats, reactions, fastestPlayer, error,
    leaderboard, myPlayer, myRank, questionStartTime,

    // v2 State
    shareScreen, previousLeaderboard, inventory, activeEffects,
    itemMultiplier, lastRoundPoints, wrongGuesses, correctPlayers, roomSettings,

    // Actions
    createRoom, joinRoom, leaveRoom,
    broadcastPairMatch,
    hostStartGame, hostNextQuestion, hostShowLeaderboard, hostEndGame, hostKickPlayer,
    hostReturnToGrid,
    submitAnswer, sendReaction, updatePlayerProfile, usePowerUp,

    // Setters
    setPhase, setError, setCurrentQuestion,
  };
}
