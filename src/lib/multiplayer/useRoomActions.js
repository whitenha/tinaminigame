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

export function useRoomActions(activityId) {
  const store = useRoomStore();

  // ── Create Room (Host) ────────────────────────────────────
  const createRoom = useCallback(async (playerName, extraSettings = {}) => {
    try {
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

      s.setRoomId(code);
      s.setPlayerId(playerData.id);
      s.setIsHost(true);
      s.setRoomSettings(mergedSettings);
      s._refs.myPlayer = playerData;

      await subscribeToRoom(code, playerData.id, playerName);
      s.setPhase('waiting');

      return code;
    } catch (err) {
      useRoomStore.getState().setError(err.message);
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

      const s = useRoomStore.getState();
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

      s.setRoomId(upperCode);
      s.setPlayerId(playerData.id);
      s.setIsHost(playerData.is_host || false);
      s._refs.myPlayer = playerData;

      await subscribeToRoom(upperCode, playerData.id, trimmedName);
      s.setPhase('waiting');

      // Legacy client-side broadcast (still useful until DB trigger is set up)
      s._refs.channel?.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { playerName: trimmedName, avatar: playerData.avatar_emoji, playerId: playerData.id },
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message, type: 'unknown' };
    }
  }, []);

  // ── Leave Room ────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    const s = useRoomStore.getState();
    const refs = s._refs;

    if (refs.hostOfflineTimer) clearTimeout(refs.hostOfflineTimer);
    if (refs.heartbeat) { clearInterval(refs.heartbeat); refs.heartbeat = null; }
    if (refs.fetchDebounce) { clearTimeout(refs.fetchDebounce); refs.fetchDebounce = null; }

    if (refs.channel) {
      refs.channel.send({
        type: 'broadcast',
        event: 'player_left',
        payload: { playerId: s.playerId },
      });
      await supabase.removeChannel(refs.channel);
      refs.channel = null;
    }

    if (s.playerId) {
      await supabase
        .from('mg_room_players')
        .update({ is_online: false })
        .eq('id', s.playerId);
    }

    if (s.isHost && s.roomId) {
      await supabase
        .from('mg_rooms')
        .update({ status: 'finished' })
        .eq('id', s.roomId);
    }

    s.setPhase('idle');
  }, []);

  // ── Update Player Profile ─────────────────────────────────
  const updatePlayerProfile = useCallback(async (name, avatar) => {
    const s = useRoomStore.getState();
    if (!s.playerId || !s.roomId) return false;
    try {
      await supabase
        .from('mg_room_players')
        .update({ player_name: name, avatar_emoji: avatar })
        .eq('id', s.playerId);

      s._refs.channel?.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { playerName: name, avatar: avatar, playerId: s.playerId },
      });

      await s.fetchPlayers(s.roomId);
      return true;
    } catch (err) {
      console.error('Error updating player profile:', err);
      return false;
    }
  }, []);

  // Store leaveRoom ref for kick handler
  store._refs.leaveRoom = leaveRoom;

  return { createRoom, joinRoom, leaveRoom, updatePlayerProfile };
}
