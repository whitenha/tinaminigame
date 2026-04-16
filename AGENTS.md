# AGENTS.md — Tina Minigame Rules for AI Agents

## multiplayer-sync-rules (CRITICAL — DO NOT VIOLATE)

The multiplayer system uses a **3-layer sync architecture**. Removing ANY layer will cause sync failures.

### Layer 1 — Broadcast (Instant)
- Primary channel for all events: `player_joined`, `game_start`, `next_question`, etc.
- Uses `self: true` so the sender also receives its own broadcasts.
- **Player joins use Optimistic UI**: the `player_joined` handler adds the player to the list immediately without waiting for a DB round-trip.

### Layer 2 — postgres_changes on mg_rooms (Reliable)
- Listens for `UPDATE` events on `mg_rooms` filtered by primary key `id`.
- Only used for room-level state changes (game start, question change, game end).
- **DO NOT** add `postgres_changes` on `mg_room_players` — the filter on `room_id` (non-PK column) does NOT work without `REPLICA IDENTITY FULL`.

### Layer 3 — HTTP Polling (Fallback — NEVER REMOVE)
- Polls every **3 seconds** for players, every **4 seconds** heartbeat for host.
- Catches ALL missed events from Layers 1 and 2.
- This is the absolute safety net for network instability.

### State Transition Guards
- All state transitions (`tryStartGame`, `tryNextQuestion`, `tryEndGame`) are **guarded functions**.
- They check the current phase before transitioning, preventing double-fires when multiple layers trigger simultaneously.
- **NEVER bypass these guards** by calling `setPhase()` directly for game state transitions.

### subscribeToRoom Returns a Promise
- `subscribeToRoom()` returns `Promise<boolean>` that resolves when the WebSocket is `SUBSCRIBED`.
- Callers **MUST await** this before sending broadcasts (e.g., `player_joined`), otherwise the broadcast will be silently dropped.

### Score Submission
- Uses the `submit_minigame_answer` RPC function for atomic, server-side updates.
- **DO NOT** replace RPC calls with direct `UPDATE` statements — they cause deadlocks under high concurrency.
