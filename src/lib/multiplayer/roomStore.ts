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

const initialState = {
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
};

const useRoomStore = create((set, get) => ({
  ...initialState,

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
  resetStore: () => {
    set(initialState);
    // @ts-ignore
    const refs = get()._refs;
    refs.myPlayer = null;
    refs.currentQuestion = -1;
    refs.roomSettings = {};
  },
  setRoomId: (v: any) => set({ roomId: v }),
  setPlayerId: (v: any) => set({ playerId: v }),
  setIsHost: (v: any) => set({ isHost: v }),
  setPhase: (v: any) => {
    set({ phase: v });
    // Keep ref in sync
    // @ts-ignore
    get()._refs.phase = v;
  },
  setConnectionStatus: (v: any) => set({ connectionStatus: v }),
  setError: (v: any) => set({ error: v }),
  setPlayers: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ players: updater(state.players) }));
    } else {
      set({ players: updater });
    }
  },
  setCurrentQuestion: (v: any) => {
    set({ currentQuestion: v });
    // @ts-ignore
    get()._refs.currentQuestion = v;
  },
  setQuestionStartTime: (v: any) => set({ questionStartTime: v }),
  setAnsweredThisQ: (v: any) => set({ answeredThisQ: v }),
  setAnswerStats: (v: any) => set({ answerStats: v }),
  setFastestPlayer: (v: any) => set({ fastestPlayer: v }),
  setRoomSettings: (v: any) => {
    set({ roomSettings: v });
    // @ts-ignore
    get()._refs.roomSettings = v;
  },
  setReactions: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ reactions: updater(state.reactions) }));
    } else {
      set({ reactions: updater });
    }
  },
  setShareScreen: (v: any) => set({ shareScreen: v }),
  setPreviousLeaderboard: (v: any) => set({ previousLeaderboard: v }),
  setInventory: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ inventory: updater(state.inventory) }));
    } else {
      set({ inventory: updater });
    }
  },
  setActiveEffects: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ activeEffects: updater(state.activeEffects) }));
    } else {
      set({ activeEffects: updater });
    }
  },
  setItemMultiplier: (v: any) => set({ itemMultiplier: v }),
  setLuckMultiplier: (v: any) => set({ luckMultiplier: v }),
  setLastRoundPoints: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ lastRoundPoints: updater(state.lastRoundPoints) }));
    } else {
      set({ lastRoundPoints: updater });
    }
  },
  setWrongGuesses: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ wrongGuesses: updater(state.wrongGuesses) }));
    } else {
      set({ wrongGuesses: updater });
    }
  },
  setCorrectPlayers: (updater: any) => {
    if (typeof updater === 'function') {
      set((state: any) => ({ correctPlayers: updater(state.correctPlayers) }));
    } else {
      set({ correctPlayers: updater });
    }
  },

  // ── Fetch Players (with presence merge) ───────────────────
  fetchPlayers: async (code: any) => {
    const { data } = await supabase
      .from('mg_room_players')
      .select('*')
      .eq('room_id', code)
      .order('score', { ascending: false });

    if (data) {
      // @ts-ignore
      const channel = get()._refs.channel;
      const presenceOnlineIds = channel
        // @ts-ignore
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
  fetchPlayersDebounced: (code: any) => {
    // @ts-ignore
    const refs = get()._refs;
    if (refs.fetchDebounce) clearTimeout(refs.fetchDebounce);
    refs.fetchDebounce = setTimeout(() => {
      // @ts-ignore
      get().fetchPlayers(code);
    }, FETCH_DEBOUNCE_MS);
  },

  // ── Snapshot Leaderboard ──────────────────────────────────
  snapshotLeaderboard: () => {
    // @ts-ignore
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
