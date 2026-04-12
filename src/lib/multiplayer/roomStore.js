/**
 * ============================================================
 * TINA MINIGAME — Room Store (Zustand)
 * ============================================================
 * Central state container for multiplayer room data.
 * All hooks read/write through this store. No business logic here.
 */

'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { HOST_NAMES, FETCH_DEBOUNCE_MS } from './constants';

const useRoomStore = create((set, get) => ({
  // ── Core State ────────────────────────────────────────────
  roomId: null,
  playerId: null,
  isHost: false,
  players: [],
  phase: 'idle',
  connectionStatus: 'connecting',
  error: null,

  // ── Game State ────────────────────────────────────────────
  currentQuestion: -1,
  questionStartTime: null,
  answeredThisQ: false,
  answerStats: null,
  fastestPlayer: null,
  roomSettings: {},
  reactions: [],

  // ── v2 State ──────────────────────────────────────────────
  shareScreen: true,
  previousLeaderboard: [],
  inventory: [],
  activeEffects: [],
  itemMultiplier: 1,
  luckMultiplier: 1,
  lastRoundPoints: {},

  // ── Feed State ────────────────────────────────────────────
  wrongGuesses: [],
  correctPlayers: [],

  // ── Internal Refs (non-reactive, mutable) ─────────────────
  // Access via useRoomStore.getState()._refs
  _refs: {
    channel: null,
    myPlayer: null,
    currentQuestion: -1,
    roomSettings: {},
    hostOfflineTimer: null,
    fetchDebounce: null,
    heartbeat: null,
    leaveRoom: null,
  },

  // ── Simple Setters ────────────────────────────────────────
  setRoomId: (v) => set({ roomId: v }),
  setPlayerId: (v) => set({ playerId: v }),
  setIsHost: (v) => set({ isHost: v }),
  setPhase: (v) => {
    set({ phase: v });
    // Keep ref in sync
    get()._refs.phase = v;
  },
  setConnectionStatus: (v) => set({ connectionStatus: v }),
  setError: (v) => set({ error: v }),
  setPlayers: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ players: updater(state.players) }));
    } else {
      set({ players: updater });
    }
  },
  setCurrentQuestion: (v) => {
    set({ currentQuestion: v });
    get()._refs.currentQuestion = v;
  },
  setQuestionStartTime: (v) => set({ questionStartTime: v }),
  setAnsweredThisQ: (v) => set({ answeredThisQ: v }),
  setAnswerStats: (v) => set({ answerStats: v }),
  setFastestPlayer: (v) => set({ fastestPlayer: v }),
  setRoomSettings: (v) => {
    set({ roomSettings: v });
    get()._refs.roomSettings = v;
  },
  setReactions: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ reactions: updater(state.reactions) }));
    } else {
      set({ reactions: updater });
    }
  },
  setShareScreen: (v) => set({ shareScreen: v }),
  setPreviousLeaderboard: (v) => set({ previousLeaderboard: v }),
  setInventory: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ inventory: updater(state.inventory) }));
    } else {
      set({ inventory: updater });
    }
  },
  setActiveEffects: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ activeEffects: updater(state.activeEffects) }));
    } else {
      set({ activeEffects: updater });
    }
  },
  setItemMultiplier: (v) => set({ itemMultiplier: v }),
  setLuckMultiplier: (v) => set({ luckMultiplier: v }),
  setLastRoundPoints: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ lastRoundPoints: updater(state.lastRoundPoints) }));
    } else {
      set({ lastRoundPoints: updater });
    }
  },
  setWrongGuesses: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ wrongGuesses: updater(state.wrongGuesses) }));
    } else {
      set({ wrongGuesses: updater });
    }
  },
  setCorrectPlayers: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ correctPlayers: updater(state.correctPlayers) }));
    } else {
      set({ correctPlayers: updater });
    }
  },

  // ── Fetch Players (with presence merge) ───────────────────
  fetchPlayers: async (code) => {
    const { data } = await supabase
      .from('mg_room_players')
      .select('*')
      .eq('room_id', code)
      .order('score', { ascending: false });

    if (data) {
      const channel = get()._refs.channel;
      const presenceOnlineIds = channel
        ? Object.values(channel.presenceState()).flat().map(p => p.playerId)
        : [];

      const merged = data.map(p => ({
        ...p,
        is_online: presenceOnlineIds.length > 0
          ? presenceOnlineIds.includes(p.id)
          : (p.is_online !== false),
      }));

      set({ players: merged });
    }
  },

  // ── Debounced Fetch Players ───────────────────────────────
  fetchPlayersDebounced: (code) => {
    const refs = get()._refs;
    if (refs.fetchDebounce) clearTimeout(refs.fetchDebounce);
    refs.fetchDebounce = setTimeout(() => {
      get().fetchPlayers(code);
    }, FETCH_DEBOUNCE_MS);
  },

  // ── Snapshot Leaderboard ──────────────────────────────────
  snapshotLeaderboard: () => {
    const players = get().players;
    const snapshot = [...players]
      .filter(p => !HOST_NAMES.includes(p.player_name))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    set({ previousLeaderboard: snapshot });
  },

  // ── Reset for new room ────────────────────────────────────
  resetRoom: () => set({
    roomId: null,
    playerId: null,
    isHost: false,
    players: [],
    phase: 'idle',
    connectionStatus: 'connecting',
    error: null,
    currentQuestion: -1,
    questionStartTime: null,
    answeredThisQ: false,
    answerStats: null,
    fastestPlayer: null,
    roomSettings: {},
    reactions: [],
    shareScreen: true,
    previousLeaderboard: [],
    inventory: [],
    activeEffects: [],
    itemMultiplier: 1,
    luckMultiplier: 1,
    lastRoundPoints: {},
    wrongGuesses: [],
    correctPlayers: [],
  }),
}));

export default useRoomStore;
