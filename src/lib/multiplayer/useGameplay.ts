/**
 * ============================================================
 * TINA MINIGAME — Gameplay Actions (Host Controls + Scoring)
 * ============================================================
 */

'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import useRoomStore from './roomStore';
import { calcScore } from '@/lib/scoringEngine';
import { rollForItem, addToInventory } from '@/lib/powerUpSystem';
import { HOST_NAMES } from './constants';

export function useGameplay() {

  // ── Host: Start Game ──────────────────────────────────────
  const hostStartGame = useCallback(async (settings = {}) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost || !s.roomId) return;

    // @ts-ignore
    const startQ = settings.initialQuestion !== undefined ? settings.initialQuestion : 0;

    const { error } = await supabase
      .from('mg_rooms')
      .update({ status: 'playing', current_question: startQ, settings })
      // @ts-ignore
      .eq('id', s.roomId);

    if (error) {
      console.warn("Could not save settings. Starting game anyway...");
      await supabase
        .from('mg_rooms')
        .update({ status: 'playing', current_question: startQ })
        // @ts-ignore
        .eq('id', s.roomId);
    }

      // @ts-ignore
      s.snapshotLeaderboard();

      // @ts-ignore
      s.setLastRoundPoints({});
      // @ts-ignore
      s.setAnswerStats(null);
      // @ts-ignore
      s.setFastestPlayer(null);
      // @ts-ignore
      s.setWrongGuesses([]);
      // @ts-ignore
      s.setCorrectPlayers([]);

      // @ts-ignore
      s._refs.channel?.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { settings: { ...settings, initialQuestion: startQ } },
      });

      // Optimistic for Host
      // @ts-ignore
      s.setPhase('countdown');
      setTimeout(() => {
        const s2 = useRoomStore.getState();
        // @ts-ignore
        s2.setPhase('playing');
        // @ts-ignore
        s2.setCurrentQuestion(startQ);
        // @ts-ignore
        s2.setQuestionStartTime(Date.now());
        // @ts-ignore
        s2.setAnsweredThisQ(false);
        // @ts-ignore
        s2.setActiveEffects([]);
        // @ts-ignore
        s2.setItemMultiplier(1);
      }, 3500);
  }, []);

  // ── Host: Return To Grid (Open Box) ───────────────────────
  const hostReturnToGrid = useCallback(async (openedIndex: any) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost || !s.roomId) return;

    // @ts-ignore
    const currentOpened = s._refs.roomSettings?.openedBoxes || [];
    if (!currentOpened.includes(openedIndex)) {
      currentOpened.push(openedIndex);
    }

    // @ts-ignore
    const newSettings = { ...s._refs.roomSettings, openedBoxes: currentOpened };

    await supabase
      .from('mg_rooms')
      .update({ current_question: -1, settings: newSettings })
      // @ts-ignore
      .eq('id', s.roomId);

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'return_to_grid',
      payload: { openedBoxes: currentOpened },
    });

    // @ts-ignore
    s.setCurrentQuestion(-1);
    // @ts-ignore
    s.setRoomSettings(newSettings);
  }, []);

  // ── Host: Next Question ───────────────────────────────────
  const hostNextQuestion = useCallback(async (nextIndex: any) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost || !s.roomId) return;

    await supabase
      .from('mg_rooms')
      .update({ current_question: nextIndex })
      // @ts-ignore
      .eq('id', s.roomId);

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'next_question',
      payload: { questionIndex: nextIndex },
    });

    // Optimistic for Host
    // @ts-ignore
    s.snapshotLeaderboard();
    // @ts-ignore
    s.setLastRoundPoints({});
    // @ts-ignore
    s.setCurrentQuestion(nextIndex);
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
  }, []);

  // ── Host: Kick Player ─────────────────────────────────────
  const hostKickPlayer = useCallback(async (targetId: any, ban = false) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost || !s.roomId) return;

    await supabase.from('mg_room_players').delete().eq('id', targetId);

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'kick_player',
      payload: { targetId, ban },
    });

    // @ts-ignore
    s.fetchPlayersDebounced(s.roomId);
  }, []);

  // ── Host: Show Leaderboard ────────────────────────────────
  const hostShowLeaderboard = useCallback(async (stats: any) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost) return;

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'show_leaderboard',
      payload: {
        answerStats: stats?.answerStats || null,
        fastestPlayer: stats?.fastestPlayer || null,
        roundPoints: stats?.roundPoints || {},
      },
    });

    // @ts-ignore
    s.setPhase('leaderboard');
    // @ts-ignore
    s.setLastRoundPoints(stats?.roundPoints || {});
  }, []);

  // ── Host: End Game ────────────────────────────────────────
  const hostEndGame = useCallback(async () => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost || !s.roomId) return;

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'game_end',
      payload: {},
    });

    // @ts-ignore
    await supabase.from('mg_rooms').delete().eq('id', s.roomId);
  }, []);

  // ── Player: Submit Answer ─────────────────────────────────
  const submitAnswer = useCallback(async (selectedIndex: any, isCorrect: any, item: any, totalQuestions: any, overridePoints = null) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.playerId || !s.roomId || s.answeredThisQ) return;

    // @ts-ignore
    s.setAnsweredThisQ(true);
    // @ts-ignore
    const timeMs = Date.now() - (s.questionStartTime || Date.now());
    const timeLimit = (item?.extra_data?.time_limit || 20) * 1000;
    const timeRemaining = Math.max(0, timeLimit - timeMs);

    // @ts-ignore
    const myPlayer = s.players.find((p: any) => p.id === s.playerId);
    const currentStreak = myPlayer?.streak || 0;

    let scoreResult;
    if (overridePoints !== null) {
      scoreResult = {
        // @ts-ignore
        points: overridePoints * s.itemMultiplier,
        newStreak: isCorrect ? currentStreak + 1 : 0,
        breakdown: { base: overridePoints, streakMultiplier: 1 },
      };
    } else {
      scoreResult = calcScore({
        isCorrect,
        timeRemainingMs: timeRemaining,
        timeLimitMs: timeLimit,
        currentStreak,
        // @ts-ignore
        itemMultiplier: s.itemMultiplier,
      });
    }

    // @ts-ignore
    if (s.itemMultiplier > 1) s.setItemMultiplier(1);

    const newScore = (myPlayer?.score || 0) + scoreResult.points;
    const answerRecord = {
      // @ts-ignore
      questionIndex: s.currentQuestion,
      selectedIndex,
      correct: isCorrect,
      timeMs,
      points: scoreResult.points,
    };

    const existingAnswers = myPlayer?.answers || [];
    // Use the RPC for atomic, short-transaction updates
    await supabase.rpc('submit_minigame_answer', {
      p_id: (s as any).playerId,
      new_score: newScore,
      new_streak: scoreResult.newStreak,
      answer_record: answerRecord
    });

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'submit_answer',
      payload: {
        // @ts-ignore
        playerId: s.playerId,
        playerName: myPlayer?.player_name,
        // @ts-ignore
        questionIndex: s.currentQuestion,
        isCorrect,
        timeMs,
        points: scoreResult.points,
        newScore,
        newStreak: scoreResult.newStreak,
      },
    });

    // Optimistic self add
    // @ts-ignore
    s.setCorrectPlayers((prev: any) => {
      // @ts-ignore
      if (prev.some((x: any) => x.playerId === s.playerId)) return prev;
      // @ts-ignore
      return [...prev, { playerId: s.playerId, playerName: myPlayer?.player_name, avatar: myPlayer?.avatar_emoji, correct: isCorrect }];
    });

    // Item roll (30% chance on correct)
    // @ts-ignore
    if (isCorrect && Math.random() < 0.3 * s.luckMultiplier) {
      // @ts-ignore
      const newItem = rollForItem(s.luckMultiplier);
      if (newItem) {
        // @ts-ignore
        const result = addToInventory(s.inventory, newItem);
        // @ts-ignore
        if (result.success) s.setInventory(result.inventory);
      }
    }

    // @ts-ignore
    if (s.luckMultiplier > 1) s.setLuckMultiplier(1);

    return {
      points: scoreResult.points,
      newScore,
      newStreak: scoreResult.newStreak,
      breakdown: scoreResult.breakdown,
      streakInfo: scoreResult.streakInfo,
    };
  }, []);

  // ── Player: Send Reaction ─────────────────────────────────
  const sendReaction = useCallback((emoji: any) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s._refs.channel) return;
    // @ts-ignore
    const myPlayer = s.players.find((p: any) => p.id === s.playerId);
    // @ts-ignore
    s._refs.channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: {
        // @ts-ignore
        playerId: s.playerId,
        playerName: myPlayer?.player_name || 'Player',
        emoji,
      },
    });
  }, []);

  // ── Player: Pair Matched ──────────────────────────────────
  const broadcastPairMatch = useCallback((pairId: any) => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.playerId || !s.roomId) return;
    // @ts-ignore
    const myPlayer = s.players.find((p: any) => p.id === s.playerId);
    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'pair_matched',
      payload: {
        // @ts-ignore
        playerId: s.playerId,
        playerName: myPlayer?.player_name || 'Một học sinh',
        pairId,
      },
    });
  }, []);

  // ── Host: Fast Forward Timer ──────────────────────────────
  const hostFastForwardTimer = useCallback(() => {
    const s = useRoomStore.getState();
    // @ts-ignore
    if (!s.isHost) return;

    // @ts-ignore
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'fast_forward_timer',
      payload: {},
    });
  }, []);

  return {
    hostStartGame,
    hostNextQuestion,
    hostShowLeaderboard,
    hostEndGame,
    hostKickPlayer,
    hostReturnToGrid,
    hostFastForwardTimer,
    submitAnswer,
    sendReaction,
    broadcastPairMatch,
  };
}
