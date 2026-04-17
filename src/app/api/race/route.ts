/**
 * ============================================================
 * RACE SERVER — Server-Authoritative Game Logic (v3 — 15 Items)
 * ============================================================
 * POST /api/race
 *
 * Actions:
 *   start_race     — Host initializes race state for all players
 *   submit_answer  — Player submits answer, server validates
 *   use_item       — Player uses inventory item (15 types)
 *   sync_inventory — Client syncs local inventory to server
 *   reward_score   — Add score from help answers
 *   end_race       — Host force-ends the race
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(supabaseUrl, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'start_race':
        return handleStartRace(body);
      case 'submit_answer':
        return handleSubmitAnswer(body);
      case 'use_item':
        return handleUseItem(body);
      case 'sync_inventory':
        return handleSyncInventory(body);
      case 'reward_score':
        return handleRewardScore(body);
      case 'end_race':
        return handleEndRace(body);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Race Server] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════
// START RACE — Host initializes race state
// ═══════════════════════════════════════════════════════════
async function handleStartRace(body: any) {
  const { room_id, race_duration_sec = 300 } = body;
  if (!room_id) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 });

  const sb = getServiceClient();
  const now = new Date().toISOString();

  const { data: players, error: pErr } = await sb
    .from('mg_room_players')
    .select('id, player_name, is_host')
    .eq('room_id', room_id);

  if (pErr || !players) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }

  await sb.from('mg_race_state').delete().eq('room_id', room_id);

  const nonHostPlayers = players.filter(p => !p.is_host || p.player_name !== 'Host Teacher');

  const ITEM_POOL = [
    'shield', 'smoke_bomb', 'double_points', 'save_streak', 'skip_question',
    'freeze', 'help', 'thief_hand', 'infect', 'vampire_bat',
    'mirror', 'invisibility', 'earthquake', 'fog', 'time_bomb',
  ];
  const randomItem = () => ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];

  const rows = nonHostPlayers.map(p => ({
    room_id,
    player_id: p.id,
    current_question: 0,
    score: 0,
    correct_count: 0,
    total_attempted: 0,
    streak: 0,
    inventory: [randomItem(), randomItem()],
    active_effects: [],
    is_finished: false,
    lock_until: null,
    race_started_at: now,
    race_duration_sec,
  }));

  if (rows.length > 0) {
    const { error: insertErr } = await sb.from('mg_race_state').insert(rows);
    if (insertErr) {
      console.error('[Race Server] Insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    race_started_at: now,
    race_duration_sec,
    player_count: rows.length,
  });
}

// ═══════════════════════════════════════════════════════════
// SUBMIT ANSWER — Player submits, server validates & advances
// ═══════════════════════════════════════════════════════════
async function handleSubmitAnswer(body: any) {
  const { room_id, player_id, question_index, selected_option_index, total_questions } = body;

  if (!room_id || !player_id || question_index === undefined || selected_option_index === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const sb = getServiceClient();
  const totalQ = total_questions || 40;

  const { data: rs, error: rsErr } = await sb
    .from('mg_race_state')
    .select('*')
    .eq('room_id', room_id).eq('player_id', player_id)
    .single();

  if (rsErr || !rs) {
    return NextResponse.json({ error: 'Race state not found' }, { status: 404 });
  }

  if (rs.is_finished) {
    return NextResponse.json({ error: 'Race already finished', is_finished: true }, { status: 400 });
  }

  // Guard: locked by item effect
  if (rs.lock_until) {
    const lockMs = new Date(rs.lock_until).getTime();
    if (Date.now() < lockMs) {
      return NextResponse.json({
        error: 'Player is locked',
        locked: true,
        lock_remaining_ms: lockMs - Date.now(),
      }, { status: 429 });
    }
  }

  // Guard: time expired
  const raceEnd = new Date(rs.race_started_at).getTime() + (rs.race_duration_sec * 1000);
  if (Date.now() > raceEnd) {
    await sb.from('mg_race_state')
      .update({ is_finished: true, updated_at: new Date().toISOString() })
      .eq('room_id', room_id).eq('player_id', player_id);
    return NextResponse.json({ error: 'Time expired', is_finished: true }, { status: 400 });
  }

  // Guard: question sync
  if (question_index !== rs.current_question) {
    return NextResponse.json({
      error: 'Question mismatch',
      expected: rs.current_question,
      got: question_index,
    }, { status: 400 });
  }

  // Determine correctness (convention: options[0] is always correct)
  const isCorrect = selected_option_index === 0;

  const nextQ = rs.current_question + 1;
  const finished = nextQ >= totalQ;

  let points = 0;
  let newStreak = isCorrect ? rs.streak + 1 : 0;
  let newInventory = [...(rs.inventory || [])];
  let newEffects = [...(rs.active_effects || [])];
  let saveStreakUsed = false;

  if (isCorrect) {
    points = 1000;

    // Streak bonus
    if (newStreak >= 5) points += 500;
    else if (newStreak >= 3) points += 200;

    // x2 effect (score_multiply)
    const x2Idx = newEffects.findIndex((e: any) => e.effectType === 'score_multiply');
    if (x2Idx >= 0) {
      points *= newEffects[x2Idx].value || 2;
      newEffects.splice(x2Idx, 1);
    }
  } else {
    // ── SAVE STREAK (Passive) ──
    // If wrong answer + streak >= 3 + has save_streak → preserve streak
    if (rs.streak >= 3) {
      const saveIdx = newInventory.indexOf('save_streak');
      if (saveIdx >= 0) {
        newStreak = rs.streak; // preserve streak
        newInventory.splice(saveIdx, 1); // consume item
        saveStreakUsed = true;
      }
    }
  }

  // Time Bomb penalty: check if time_bomb is active
  let timeBombPenalty = 0;
  const timeBombEffect = newEffects.find((e: any) =>
    e.effectType === 'time_bomb' && new Date(e.expiresAt).getTime() > Date.now()
  );
  if (timeBombEffect && !isCorrect) {
    timeBombPenalty = 5000;
  }

  const update: any = {
    current_question: nextQ,
    score: rs.score + points - timeBombPenalty,
    correct_count: rs.correct_count + (isCorrect ? 1 : 0),
    total_attempted: rs.total_attempted + 1,
    streak: newStreak,
    inventory: newInventory,
    active_effects: newEffects,
    is_finished: finished,
    lock_until: null,
    updated_at: new Date().toISOString(),
  };

  await sb.from('mg_race_state')
    .update(update)
    .eq('room_id', room_id).eq('player_id', player_id);

  return NextResponse.json({
    is_correct: isCorrect,
    points,
    new_score: update.score,
    new_question: nextQ,
    streak: newStreak,
    is_finished: finished,
    total_questions: totalQ,
    save_streak_used: saveStreakUsed,
    time_bomb_penalty: timeBombPenalty,
  });
}

// ═══════════════════════════════════════════════════════════
// SYNC INVENTORY — Client pushes local inventory to server
// ═══════════════════════════════════════════════════════════
async function handleSyncInventory(body: any) {
  const { room_id, player_id, inventory } = body;
  if (!room_id || !player_id) {
    return NextResponse.json({ error: 'Missing req fields' }, { status: 400 });
  }
  const sb = getServiceClient();
  await sb.from('mg_race_state')
    .update({ inventory, updated_at: new Date().toISOString() })
    .eq('room_id', room_id).eq('player_id', player_id);

  return NextResponse.json({ success: true });
}

// ═══════════════════════════════════════════════════════════
// REWARD SCORE — Add score from help answers
// ═══════════════════════════════════════════════════════════
async function handleRewardScore(body: any) {
  const { room_id, player_id, amount } = body;
  if (!room_id || !player_id || !amount) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const sb = getServiceClient();
  const { data: rs } = await sb.from('mg_race_state')
    .select('score')
    .eq('room_id', room_id).eq('player_id', player_id)
    .single();

  if (!rs) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const newScore = rs.score + amount;
  await sb.from('mg_race_state')
    .update({ score: newScore, updated_at: new Date().toISOString() })
    .eq('room_id', room_id).eq('player_id', player_id);

  return NextResponse.json({ success: true, new_score: newScore });
}

// ═══════════════════════════════════════════════════════════
// USE ITEM — Player uses inventory item (15 types)
// ═══════════════════════════════════════════════════════════
async function handleUseItem(body: any) {
  const { room_id, player_id, item_id, target_player_id, total_questions } = body;
  if (!room_id || !player_id || !item_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const sb = getServiceClient();

  // Fetch player state
  const { data: rs } = await sb
    .from('mg_race_state')
    .select('*')
    .eq('room_id', room_id).eq('player_id', player_id)
    .single();

  if (!rs) {
    return NextResponse.json({ error: 'Race state not found' }, { status: 404 });
  }

  // Validate item exists in inventory
  const inv = [...(rs.inventory || [])];
  const itemIdx = inv.indexOf(item_id);
  if (itemIdx < 0) {
    return NextResponse.json({ error: 'Item not in inventory' }, { status: 400 });
  }

  // Check expiry (vampire_bat at 50%)
  if (item_id === 'vampire_bat') {
    const totalQ = total_questions || 40;
    if (rs.current_question >= totalQ * 0.5) {
      inv.splice(itemIdx, 1);
      await sb.from('mg_race_state')
        .update({ inventory: inv, updated_at: new Date().toISOString() })
        .eq('room_id', room_id).eq('player_id', player_id);
      return NextResponse.json({ error: 'Vampire Bat expired', expired: true }, { status: 400 });
    }
  }

  // Remove item from inventory
  inv.splice(itemIdx, 1);

  // Helper to update player state
  const updatePlayer = async (data: any) => {
    await sb.from('mg_race_state')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('room_id', room_id).eq('player_id', player_id);
  };

  // ─── PASSIVE ITEMS (should not be manually used) ───────
  if (item_id === 'shield' || item_id === 'save_streak') {
    return NextResponse.json({ error: 'Passive item, cannot use manually' }, { status: 400 });
  }

  // ─── SELF-BUFF ITEMS ──────────────────────────────────
  if (item_id === 'double_points') {
    const effects = [...(rs.active_effects || []), { effectType: 'score_multiply', value: 2 }];
    await updatePlayer({ inventory: inv, active_effects: effects });
    return NextResponse.json({ success: true, effect: 'score_multiply' });
  }

  if (item_id === 'skip_question') {
    const totalQ = total_questions || 40;
    const nextQ = rs.current_question + 1;
    const finished = nextQ >= totalQ;
    const points = 1000;
    await updatePlayer({
      inventory: inv,
      current_question: nextQ,
      score: rs.score + points,
      correct_count: rs.correct_count + 1,
      total_attempted: rs.total_attempted + 1,
      is_finished: finished,
    });
    return NextResponse.json({
      success: true, effect: 'skip',
      points, new_score: rs.score + points,
      new_question: nextQ, is_finished: finished,
    });
  }

  if (item_id === 'mirror') {
    const expiresAt = new Date(Date.now() + 30000).toISOString();
    const effects = [...(rs.active_effects || []), { effectType: 'mirror', expiresAt }];
    await updatePlayer({ inventory: inv, active_effects: effects });
    return NextResponse.json({ success: true, effect: 'mirror', expiresAt });
  }

  if (item_id === 'invisibility') {
    const expiresAt = new Date(Date.now() + 45000).toISOString();
    const effects = [...(rs.active_effects || []), { effectType: 'invisibility', expiresAt }];
    await updatePlayer({ inventory: inv, active_effects: effects });
    return NextResponse.json({ success: true, effect: 'invisibility', expiresAt });
  }

  // ─── TARGETED ITEMS (need target_player_id) ───────────
  if (['smoke_bomb', 'freeze', 'help', 'thief_hand', 'infect'].includes(item_id)) {
    if (!target_player_id) {
      return NextResponse.json({ error: 'Target required' }, { status: 400 });
    }

    // Fetch target state
    const { data: target } = await sb
      .from('mg_race_state')
      .select('*')
      .eq('room_id', room_id).eq('player_id', target_player_id)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    // ── Protection Chain ──────────────────────────────────
    // Filter active effects (not expired)
    const targetEffects = (target.active_effects || []).filter((e: any) => {
      if (!e.expiresAt) return true;
      return new Date(e.expiresAt).getTime() > Date.now();
    });

    // 1. Invisibility check
    if (targetEffects.some((e: any) => e.effectType === 'invisibility')) {
      await updatePlayer({ inventory: inv });
      return NextResponse.json({ success: true, effect: 'blocked_by_invisibility' });
    }

    // 2. Mirror check → reflect: stun attacker 5s
    if (targetEffects.some((e: any) => e.effectType === 'mirror')) {
      await updatePlayer({ inventory: inv });
      const stunUntil = new Date(Date.now() + 5000).toISOString();
      await sb.from('mg_race_state')
        .update({ lock_until: stunUntil, updated_at: new Date().toISOString() })
        .eq('room_id', room_id).eq('player_id', player_id);
      return NextResponse.json({
        success: true, effect: 'reflected_by_mirror',
        stunUntil, reflectedFrom: target_player_id,
      });
    }

    // 3. Shield check → consume shield, block attack
    const targetInv = [...(target.inventory || [])];
    const shieldIdx = targetInv.indexOf('shield');
    if (shieldIdx >= 0) {
      targetInv.splice(shieldIdx, 1);
      await sb.from('mg_race_state')
        .update({ inventory: targetInv, updated_at: new Date().toISOString() })
        .eq('room_id', room_id).eq('player_id', target_player_id);
      await updatePlayer({ inventory: inv });
      return NextResponse.json({ success: true, effect: 'blocked_by_shield' });
    }

    // ── Apply targeted effect ─────────────────────────────
    switch (item_id) {
      case 'smoke_bomb': {
        const lockUntil = new Date(Date.now() + 8000).toISOString(); // 5s delay + 3s lock
        await sb.from('mg_race_state')
          .update({ lock_until: lockUntil, updated_at: new Date().toISOString() })
          .eq('room_id', room_id).eq('player_id', target_player_id);
        await updatePlayer({ inventory: inv });
        return NextResponse.json({ success: true, effect: 'smoke_bomb', target: target_player_id });
      }

      case 'freeze': {
        const btn1 = Math.floor(Math.random() * 4);
        let btn2 = Math.floor(Math.random() * 4);
        while (btn2 === btn1) btn2 = Math.floor(Math.random() * 4);
        await updatePlayer({ inventory: inv });
        return NextResponse.json({
          success: true, effect: 'freeze',
          frozenButtons: [btn1, btn2], duration: 10000,
          target: target_player_id,
        });
      }

      case 'help': {
        await updatePlayer({ inventory: inv });
        return NextResponse.json({
          success: true, effect: 'help',
          target: target_player_id,
        });
      }

      case 'thief_hand': {
        const tInv = [...(target.inventory || [])];
        if (tInv.length === 0) {
          await updatePlayer({ inventory: inv });
          return NextResponse.json({ success: true, effect: 'thief_empty', target: target_player_id });
        }
        const stolenIdx = Math.floor(Math.random() * tInv.length);
        const stolenItem = tInv[stolenIdx];
        tInv.splice(stolenIdx, 1);

        // FIFO for attacker
        const attackerInv = [...inv];
        if (attackerInv.length >= 2) attackerInv.shift();
        attackerInv.push(stolenItem);

        await sb.from('mg_race_state')
          .update({ inventory: tInv, updated_at: new Date().toISOString() })
          .eq('room_id', room_id).eq('player_id', target_player_id);
        await updatePlayer({ inventory: attackerInv });
        return NextResponse.json({
          success: true, effect: 'thief',
          stolenItem, newInventory: attackerInv,
          target: target_player_id,
        });
      }

      case 'infect': {
        await updatePlayer({ inventory: inv });
        return NextResponse.json({
          success: true, effect: 'infect',
          duration: 3, target: target_player_id,
        });
      }
    }
  }

  // ─── RANDOM TARGET ITEM ───────────────────────────────
  if (item_id === 'vampire_bat') {
    const { data: allPlayers } = await sb.from('mg_race_state')
      .select('player_id, score')
      .eq('room_id', room_id)
      .neq('player_id', player_id)
      .eq('is_finished', false);

    if (!allPlayers || allPlayers.length === 0) {
      await updatePlayer({ inventory: inv });
      return NextResponse.json({ success: true, effect: 'vampire_no_target' });
    }

    const victim = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    const stolenScore = Math.floor(victim.score * 0.1);

    await sb.from('mg_race_state')
      .update({ score: victim.score - stolenScore, updated_at: new Date().toISOString() })
      .eq('room_id', room_id).eq('player_id', victim.player_id);
    await updatePlayer({ inventory: inv, score: rs.score + stolenScore });

    return NextResponse.json({
      success: true, effect: 'vampire',
      target: victim.player_id, stolenScore,
      new_score: rs.score + stolenScore,
    });
  }

  // ─── GLOBAL ITEMS ─────────────────────────────────────
  if (['earthquake', 'fog', 'time_bomb'].includes(item_id)) {
    // For time_bomb, store effect on ALL players (including caster)
    if (item_id === 'time_bomb') {
      const expiresAt = new Date(Date.now() + 25000).toISOString(); // 5s delay + 20s duration
      // Add to ALL players' active_effects
      const { data: allStates } = await sb.from('mg_race_state')
        .select('player_id, active_effects')
        .eq('room_id', room_id)
        .eq('is_finished', false);

      if (allStates) {
        for (const s of allStates) {
          const effects = [...(s.active_effects || []), { effectType: 'time_bomb', expiresAt }];
          await sb.from('mg_race_state')
            .update({ active_effects: effects, updated_at: new Date().toISOString() })
            .eq('room_id', room_id).eq('player_id', s.player_id);
        }
      }
    }

    await updatePlayer({ inventory: inv });
    return NextResponse.json({ success: true, effect: item_id });
  }

  // ─── FALLBACK ─────────────────────────────────────────
  await updatePlayer({ inventory: inv });
  return NextResponse.json({ success: true, effect: 'unknown' });
}

// ═══════════════════════════════════════════════════════════
// END RACE — Host force-ends
// ═══════════════════════════════════════════════════════════
async function handleEndRace(body: any) {
  const { room_id } = body;
  if (!room_id) return NextResponse.json({ error: 'Missing room_id' }, { status: 400 });

  const sb = getServiceClient();

  await sb.from('mg_race_state')
    .update({ is_finished: true, updated_at: new Date().toISOString() })
    .eq('room_id', room_id);

  await sb.from('mg_rooms')
    .update({ status: 'finished' })
    .eq('id', room_id);

  return NextResponse.json({ success: true });
}
