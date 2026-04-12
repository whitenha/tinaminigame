/**
 * ============================================================
 * TINA MINIGAME — useMultiplayerRoom (v3 Modular)
 * ============================================================
 * Thin wrapper that composes all modular hooks and returns
 * the EXACT same API as v2 for zero breaking changes.
 */

'use client';

import { useMemo } from 'react';
import useRoomStore from './roomStore';
import { useRoomActions } from './useRoomActions';
import { useRoomChannelLifecycle } from './useRoomChannel';
import { useGameplay } from './useGameplay';
import { usePowerUps } from './usePowerUps';
import { HOST_NAMES } from './constants';

export function useMultiplayerRoom(activityId) {
  // ── Read state from Zustand store ─────────────────────────
  const state = useRoomStore();

  // ── Compose modular hooks ─────────────────────────────────
  const actions = useRoomActions(activityId);
  const gameplay = useGameplay();
  const powerups = usePowerUps();

  // ── Lifecycle (heartbeat, beacon close, cleanup) ──────────
  useRoomChannelLifecycle();

  // ── Derived state ─────────────────────────────────────────
  const leaderboard = useMemo(() =>
    [...state.players]
      .filter(p => !HOST_NAMES.includes(p.player_name))
      .sort((a, b) => (b.score || 0) - (a.score || 0)),
    [state.players]
  );

  const myPlayer = useMemo(() =>
    state.players.find(p => p.id === state.playerId),
    [state.players, state.playerId]
  );

  const myRank = useMemo(() =>
    leaderboard.findIndex(p => p.id === state.playerId) + 1,
    [leaderboard, state.playerId]
  );

  // ── Return the EXACT same API as v2 ───────────────────────
  return {
    // State
    roomId: state.roomId,
    playerId: state.playerId,
    isHost: state.isHost,
    players: state.players,
    phase: state.phase,
    currentQuestion: state.currentQuestion,
    answeredThisQ: state.answeredThisQ,
    answerStats: state.answerStats,
    reactions: state.reactions,
    fastestPlayer: state.fastestPlayer,
    error: state.error,
    leaderboard,
    myPlayer,
    myRank,
    questionStartTime: state.questionStartTime,
    status: state.connectionStatus,

    // v2 State
    shareScreen: state.shareScreen,
    previousLeaderboard: state.previousLeaderboard,
    inventory: state.inventory,
    activeEffects: state.activeEffects,
    itemMultiplier: state.itemMultiplier,
    lastRoundPoints: state.lastRoundPoints,
    wrongGuesses: state.wrongGuesses,
    correctPlayers: state.correctPlayers,
    roomSettings: state.roomSettings,

    // Actions
    createRoom: actions.createRoom,
    joinRoom: actions.joinRoom,
    leaveRoom: actions.leaveRoom,
    updatePlayerProfile: actions.updatePlayerProfile,
    broadcastPairMatch: gameplay.broadcastPairMatch,
    hostStartGame: gameplay.hostStartGame,
    hostNextQuestion: gameplay.hostNextQuestion,
    hostShowLeaderboard: gameplay.hostShowLeaderboard,
    hostEndGame: gameplay.hostEndGame,
    hostKickPlayer: gameplay.hostKickPlayer,
    hostReturnToGrid: gameplay.hostReturnToGrid,
    hostFastForwardTimer: gameplay.hostFastForwardTimer,
    submitAnswer: gameplay.submitAnswer,
    sendReaction: gameplay.sendReaction,
    usePowerUp: powerups.usePowerUp,

    // Setters
    setPhase: state.setPhase,
    setError: state.setError,
    setCurrentQuestion: state.setCurrentQuestion,
  };
}
