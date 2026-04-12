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
    if (!s.isHost || !s.roomId) return;

    const startQ = settings.initialQuestion !== undefined ? settings.initialQuestion : 0;

    const { error } = await supabase
      .from('mg_rooms')
      .update({ status: 'playing', current_question: startQ, settings })
      .eq('id', s.roomId);

    if (error) {
      console.warn("Could not save settings. Starting game anyway...");
      await supabase
        .from('mg_rooms')
        .update({ status: 'playing', current_question: startQ })
        .eq('id', s.roomId);
    }

    s.snapshotLeaderboard();

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { settings },
    });

    // Optimistic for Host
    s.setPhase('countdown');
    setTimeout(() => {
      const s2 = useRoomStore.getState();
      s2.setPhase('playing');
      s2.setCurrentQuestion(startQ);
      s2.setQuestionStartTime(Date.now());
      s2.setAnsweredThisQ(false);
      s2.setActiveEffects([]);
      s2.setItemMultiplier(1);
    }, 3500);
  }, []);

  // ── Host: Return To Grid (Open Box) ───────────────────────
  const hostReturnToGrid = useCallback(async (openedIndex) => {
    const s = useRoomStore.getState();
    if (!s.isHost || !s.roomId) return;

    const currentOpened = s._refs.roomSettings?.openedBoxes || [];
    if (!currentOpened.includes(openedIndex)) {
      currentOpened.push(openedIndex);
    }

    const newSettings = { ...s._refs.roomSettings, openedBoxes: currentOpened };

    await supabase
      .from('mg_rooms')
      .update({ current_question: -1, settings: newSettings })
      .eq('id', s.roomId);

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'return_to_grid',
      payload: { openedBoxes: currentOpened },
    });

    s.setCurrentQuestion(-1);
    s.setRoomSettings(newSettings);
  }, []);

  // ── Host: Next Question ───────────────────────────────────
  const hostNextQuestion = useCallback(async (nextIndex) => {
    const s = useRoomStore.getState();
    if (!s.isHost || !s.roomId) return;

    await supabase
      .from('mg_rooms')
      .update({ current_question: nextIndex })
      .eq('id', s.roomId);

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'next_question',
      payload: { questionIndex: nextIndex },
    });

    // Optimistic for Host
    s.snapshotLeaderboard();
    s.setLastRoundPoints({});
    s.setCurrentQuestion(nextIndex);
    s.setQuestionStartTime(Date.now());
    s.setAnsweredThisQ(false);
    s.setAnswerStats(null);
    s.setFastestPlayer(null);
    s.setPhase('playing');
    s.setWrongGuesses([]);
    s.setCorrectPlayers([]);
    s.setItemMultiplier(1);
    s.setActiveEffects(prev => prev.filter(e => !e.expiresAt || e.expiresAt > Date.now()));
  }, []);

  // ── Host: Kick Player ─────────────────────────────────────
  const hostKickPlayer = useCallback(async (targetId, ban = false) => {
    const s = useRoomStore.getState();
    if (!s.isHost || !s.roomId) return;

    await supabase.from('mg_room_players').delete().eq('id', targetId);

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'kick_player',
      payload: { targetId, ban },
    });

    s.fetchPlayersDebounced(s.roomId);
  }, []);

  // ── Host: Show Leaderboard ────────────────────────────────
  const hostShowLeaderboard = useCallback(async (stats) => {
    const s = useRoomStore.getState();
    if (!s.isHost) return;

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'show_leaderboard',
      payload: {
        answerStats: stats?.answerStats || null,
        fastestPlayer: stats?.fastestPlayer || null,
        roundPoints: stats?.roundPoints || {},
      },
    });

    s.setPhase('leaderboard');
    s.setLastRoundPoints(stats?.roundPoints || {});
  }, []);

  // ── Host: End Game ────────────────────────────────────────
  const hostEndGame = useCallback(async () => {
    const s = useRoomStore.getState();
    if (!s.isHost || !s.roomId) return;

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'game_end',
      payload: {},
    });

    await supabase.from('mg_rooms').delete().eq('id', s.roomId);
  }, []);

  // ── Player: Submit Answer ─────────────────────────────────
  const submitAnswer = useCallback(async (selectedIndex, isCorrect, item, totalQuestions, overridePoints = null) => {
    const s = useRoomStore.getState();
    if (!s.playerId || !s.roomId || s.answeredThisQ) return;

    s.setAnsweredThisQ(true);
    const timeMs = Date.now() - (s.questionStartTime || Date.now());
    const timeLimit = (item?.extra_data?.time_limit || 20) * 1000;
    const timeRemaining = Math.max(0, timeLimit - timeMs);

    const myPlayer = s.players.find(p => p.id === s.playerId);
    const currentStreak = myPlayer?.streak || 0;

    let scoreResult;
    if (overridePoints !== null) {
      scoreResult = {
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
        itemMultiplier: s.itemMultiplier,
      });
    }

    if (s.itemMultiplier > 1) s.setItemMultiplier(1);

    const newScore = (myPlayer?.score || 0) + scoreResult.points;
    const answerRecord = {
      questionIndex: s.currentQuestion,
      selectedIndex,
      correct: isCorrect,
      timeMs,
      points: scoreResult.points,
    };

    const existingAnswers = myPlayer?.answers || [];
    await supabase
      .from('mg_room_players')
      .update({
        score: newScore,
        streak: scoreResult.newStreak,
        answers: [...existingAnswers, answerRecord],
      })
      .eq('id', s.playerId);

    s._refs.channel?.send({
      type: 'broadcast',
      event: 'submit_answer',
      payload: {
        playerId: s.playerId,
        playerName: myPlayer?.player_name,
        questionIndex: s.currentQuestion,
        isCorrect,
        timeMs,
        points: scoreResult.points,
        newScore,
        newStreak: scoreResult.newStreak,
      },
    });

    // Optimistic self add
    s.setCorrectPlayers(prev => {
      if (prev.some(x => x.playerId === s.playerId)) return prev;
      return [...prev, { playerId: s.playerId, playerName: myPlayer?.player_name, avatar: myPlayer?.avatar_emoji, correct: isCorrect }];
    });

    // Item roll (30% chance on correct)
    if (isCorrect && Math.random() < 0.3 * s.luckMultiplier) {
      const newItem = rollForItem(s.luckMultiplier);
      if (newItem) {
        const result = addToInventory(s.inventory, newItem);
        if (result.success) s.setInventory(result.inventory);
      }
    }

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
  const sendReaction = useCallback((emoji) => {
    const s = useRoomStore.getState();
    if (!s._refs.channel) return;
    const myPlayer = s.players.find(p => p.id === s.playerId);
    s._refs.channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: {
        playerId: s.playerId,
        playerName: myPlayer?.player_name || 'Player',
        emoji,
      },
    });
  }, []);

  // ── Player: Pair Matched ──────────────────────────────────
  const broadcastPairMatch = useCallback((pairId) => {
    const s = useRoomStore.getState();
    if (!s.playerId || !s.roomId) return;
    const myPlayer = s.players.find(p => p.id === s.playerId);
    s._refs.channel?.send({
      type: 'broadcast',
      event: 'pair_matched',
      payload: {
        playerId: s.playerId,
        playerName: myPlayer?.player_name || 'Một học sinh',
        pairId,
      },
    });
  }, []);

  // ── Host: Fast Forward Timer ──────────────────────────────
  const hostFastForwardTimer = useCallback(() => {
    const s = useRoomStore.getState();
    if (!s.isHost) return;

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
