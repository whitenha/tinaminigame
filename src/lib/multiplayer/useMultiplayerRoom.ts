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

export function useMultiplayerRoom(activityId: any) {
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
    // @ts-ignore
    [...state.players]
      .filter(p => !HOST_NAMES.includes(p.player_name))
      .sort((a, b) => (b.score || 0) - (a.score || 0)),
    // @ts-ignore
    [state.players]
  );

  const myPlayer = useMemo(() =>
    // @ts-ignore
    state.players.find((p: any) => p.id === state.playerId),
    // @ts-ignore
    [state.players, state.playerId]
  );

  const myRank = useMemo(() =>
    // @ts-ignore
    leaderboard.findIndex(p => p.id === state.playerId) + 1,
    // @ts-ignore
    [leaderboard, state.playerId]
  );

  // ── Return the EXACT same API as v2 ───────────────────────
  return {
    // State
    // @ts-ignore
    roomId: state.roomId,
    // @ts-ignore
    playerId: state.playerId,
    // @ts-ignore
    isHost: state.isHost,
    // @ts-ignore
    players: state.players,
    // @ts-ignore
    phase: state.phase,
    // @ts-ignore
    currentQuestion: state.currentQuestion,
    // @ts-ignore
    answeredThisQ: state.answeredThisQ,
    // @ts-ignore
    answerStats: state.answerStats,
    // @ts-ignore
    reactions: state.reactions,
    // @ts-ignore
    fastestPlayer: state.fastestPlayer,
    // @ts-ignore
    error: state.error,
    leaderboard,
    myPlayer,
    myRank,
    // @ts-ignore
    questionStartTime: state.questionStartTime,
    // @ts-ignore
    status: state.connectionStatus,

    // v2 State
    // @ts-ignore
    shareScreen: state.shareScreen,
    // @ts-ignore
    previousLeaderboard: state.previousLeaderboard,
    // @ts-ignore
    inventory: state.inventory,
    // @ts-ignore
    activeEffects: state.activeEffects,
    // @ts-ignore
    itemMultiplier: state.itemMultiplier,
    // @ts-ignore
    lastRoundPoints: state.lastRoundPoints,
    // @ts-ignore
    wrongGuesses: state.wrongGuesses,
    // @ts-ignore
    correctPlayers: state.correctPlayers,
    // @ts-ignore
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
    // @ts-ignore
    setPhase: state.setPhase,
    // @ts-ignore
    setError: state.setError,
    // @ts-ignore
    setCurrentQuestion: state.setCurrentQuestion,
  };
}
