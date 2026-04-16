/**
 * ============================================================
 * TINA MINIGAME — Room Actions (Create / Join / Leave)
 * ============================================================
 */

'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import useRoomStore from './roomStore';
import { subscribeToRoom } from './useRoomChannel';
import { generateRoomCode, randomAvatar } from './constants';

export function useRoomActions(activityId: any) {
  const store = useRoomStore();

  // ── Create Room (Host) ────────────────────────────────────
  const createRoom = useCallback(async (playerName: any, extraSettings = {}) => {
    try {
      // @ts-ignore
      useRoomStore.getState().resetStore();
      const code = generateRoomCode();
      const avatar = randomAvatar();
      const s = useRoomStore.getState();

      const mergedSettings = { hostPacing: true, showLeaderboard: true, ...extraSettings };

      const { error: roomError } = await supabase
        .from('mg_rooms')
        .insert({
          id: code,
          activity_id: activityId,
          host_name: playerName,
          status: 'waiting',
          max_players: 40,
          settings: mergedSettings,
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

      // @ts-ignore
      s.setRoomId(code);
      // @ts-ignore
      s.setPlayerId(playerData.id);
      // @ts-ignore
      s.setIsHost(true);
      // @ts-ignore
      s.setRoomSettings(mergedSettings);
      // @ts-ignore
      s._refs.myPlayer = playerData;

      await subscribeToRoom(code, playerData.id, playerName);
      // @ts-ignore
      s.setPhase('waiting');

      return code;
    } catch (err: any) {
      // @ts-ignore
      useRoomStore.getState().setError(err.message);
      return null;
    }
  }, [activityId]);

  // ── Join Room (Player) ────────────────────────────────────
  const joinRoom = useCallback(async (code: any, playerName: any, requestedAvatar = null) => {
    try {
      // @ts-ignore
      useRoomStore.getState().resetStore();
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

      const s = useRoomStore.getState();
      // @ts-ignore
      s.setRoomSettings(room.settings || {});

      // ── Duplicate name check ──
      const { data: playersWithSameName } = await supabase
        .from('mg_room_players')
        .select('*')
        .eq('room_id', upperCode)
        .ilike('player_name', trimmedName);

      let playerData;

      if (playersWithSameName && playersWithSameName.length > 0) {
        // Session key is per room + per name (case-insensitive)
        const sessionKey = `tina_player_session_${upperCode}_${trimmedName.toLowerCase()}`;
        const savedPlayerId = localStorage.getItem(sessionKey);
        const matchingSession = savedPlayerId
          ? playersWithSameName.find(p => p.id === savedPlayerId)
          : null;

        if (matchingSession) {
          // Legitimate reconnection from the same device+name
          playerData = matchingSession;
          await supabase
            .from('mg_room_players')
            .update({ is_online: true })
            .eq('id', matchingSession.id);
        } else {
          // Different person or different device trying to use same name → BLOCK
          return {
            success: false,
            error: `Tên "${trimmedName}" đã có người sử dụng trong phòng! Vui lòng chọn tên khác.`,
            type: 'duplicate_name',
          };
        }
      } else {
        if (room.status !== 'waiting') return { success: false, error: 'Phòng đã bắt đầu chơi rồi!', type: 'started' };

        const { count } = await supabase
          .from('mg_room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', upperCode);

        // @ts-ignore
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

        // Save session keyed by room + player name for reconnection
        localStorage.setItem(`tina_player_session_${upperCode}_${trimmedName.toLowerCase()}`, newPlayer.id);
      }

      // @ts-ignore
      s.setRoomId(upperCode);
      // @ts-ignore
      s.setPlayerId(playerData.id);
      // @ts-ignore
      s.setIsHost(playerData.is_host || false);
      // @ts-ignore
      s._refs.myPlayer = playerData;

      await subscribeToRoom(upperCode, playerData.id, trimmedName);
      
      // Fix: If mobile rejoins an in-progress game, sync phase
      if (room.status === 'playing') {
        // @ts-ignore
        s.setPhase('playing');
        // @ts-ignore
        s.setCurrentQuestion(room.current_question || 0);
        // @ts-ignore
        s.setQuestionStartTime(Date.now());
      } else if (room.status === 'finished') {
        // @ts-ignore
        s.setPhase('podium');
      } else {
        // @ts-ignore
        s.setPhase('waiting');
      }

      // Legacy client-side broadcast (still useful until DB trigger is set up)
      // @ts-ignore
      s._refs.channel?.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { playerName: trimmedName, avatar: playerData.avatar_emoji, playerId: playerData.id },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message, type: 'unknown' };
    }
  }, []);

  // ── Leave Room ────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    const s = useRoomStore.getState();
    // @ts-ignore
    const refs = s._refs;

    if (refs.hostOfflineTimer) clearTimeout(refs.hostOfflineTimer);
    if (refs.heartbeat) { clearInterval(refs.heartbeat); refs.heartbeat = null; }
    if (refs.fetchDebounce) { clearTimeout(refs.fetchDebounce); refs.fetchDebounce = null; }

    if (refs.channel) {
      refs.channel.send({
        type: 'broadcast',
        event: 'player_left',
        // @ts-ignore
        payload: { playerId: s.playerId },
      });
      await supabase.removeChannel(refs.channel);
      refs.channel = null;
    }

    // @ts-ignore
    if (s.playerId) {
      await supabase
        .from('mg_room_players')
        .update({ is_online: false })
        // @ts-ignore
        .eq('id', s.playerId);
    }

    // @ts-ignore
    if (s.isHost && s.roomId) {
      await supabase
        .from('mg_rooms')
        .update({ status: 'finished' })
        // @ts-ignore
        .eq('id', s.roomId);
    }

    // @ts-ignore
    s.resetStore();
  }, []);

  // ── Update Player Profile ─────────────────────────────────
  const updatePlayerProfile = useCallback(async (name: any, avatar: any) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.playerId || !s.roomId) return false;
    try {
      await supabase
        .from('mg_room_players')
        .update({ player_name: name, avatar_emoji: avatar })
        // @ts-ignore
        .eq('id', s.playerId);

      // @ts-ignore
      s._refs.channel?.send({
        type: 'broadcast',
        event: 'player_joined',
        // @ts-ignore
        payload: { playerName: name, avatar: avatar, playerId: s.playerId },
      });

      // @ts-ignore
      await s.fetchPlayers(s.roomId);
      return true;
    } catch (err: any) {
      console.error('Error updating player profile:', err);
      return false;
    }
  }, []);

  // Store leaveRoom ref for kick handler
  // @ts-ignore
  store._refs.leaveRoom = leaveRoom;

  return { createRoom, joinRoom, leaveRoom, updatePlayerProfile };
}
