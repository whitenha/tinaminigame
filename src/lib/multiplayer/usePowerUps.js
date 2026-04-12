/**
 * ============================================================
 * TINA MINIGAME — Power-Up System Hook
 * ============================================================
 */

'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import useRoomStore from './roomStore';
import { useFromInventory } from '@/lib/powerUpSystem';

export function usePowerUps() {

  const usePowerUp = useCallback((slotIndex) => {
    const s = useRoomStore.getState();
    if (slotIndex < 0 || slotIndex >= s.inventory.length) return null;

    const { item, inventory: newInv } = useFromInventory(s.inventory, slotIndex);
    if (!item) return null;

    s.setInventory(newInv);

    const channel = s._refs.channel;
    const playerId = s.playerId;
    const players = s.players;
    const myPlayer = players.find(p => p.id === playerId);

    // Apply immediate self-effects
    switch (item.effect.type) {
      case 'score_multiply':
        s.setItemMultiplier(item.effect.value);
        break;

      case 'time_extend':
        window.dispatchEvent(new CustomEvent('tina_time_extend', { detail: item.effect.value }));
        break;

      case 'restore_streak': {
        if (myPlayer) {
          supabase.from('mg_room_players').update({ streak: item.effect.value }).eq('id', playerId);
          s.setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, streak: item.effect.value } : p));
        }
        break;
      }

      case 'luck_boost':
        s.setLuckMultiplier(item.effect.value);
        break;

      case 'eliminate_wrong':
        window.dispatchEvent(new CustomEvent('tina_eliminate_wrong'));
        break;

      case 'reveal_answer':
        window.dispatchEvent(new CustomEvent('tina_reveal_answer', { detail: item.effect.duration }));
        break;

      case 'hide_name':
        break;

      // Attack items → broadcast to random target
      case 'blur_screen':
      case 'freeze_player':
      case 'reverse_controls':
      case 'shrink_text':
      case 'scramble_options':
      case 'hide_correct': {
        const otherPlayers = players.filter(p => p.id !== playerId && !p.is_host);
        if (otherPlayers.length === 0) break;
        const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        channel?.send({
          type: 'broadcast',
          event: 'powerup_effect',
          payload: {
            targetId: target.id,
            effectType: item.effect.type,
            duration: item.effect.duration || 3,
            fromPlayerId: playerId,
            fromPlayerName: myPlayer?.player_name || 'Player',
            itemEmoji: item.emoji,
            itemName: item.name,
            isAttack: true,
          },
        });
        break;
      }

      case 'steal_points': {
        const leader = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        if (leader && leader.id !== playerId) {
          const stealAmount = Math.min(item.effect.value, leader.score || 0);
          supabase.from('mg_room_players').update({ score: (leader.score || 0) - stealAmount }).eq('id', leader.id);
          supabase.from('mg_room_players').update({ score: (myPlayer?.score || 0) + stealAmount }).eq('id', playerId);
          s.setPlayers(prev => prev.map(p => {
            if (p.id === leader.id) return { ...p, score: (p.score || 0) - stealAmount };
            if (p.id === playerId) return { ...p, score: (p.score || 0) + stealAmount };
            return p;
          }));
        }
        break;
      }

      case 'mass_damage': {
        const others = players.filter(p => p.id !== playerId && !p.is_host);
        const targets = others.sort(() => Math.random() - 0.5).slice(0, item.effect.targets || 3);
        targets.forEach(t => {
          const newScore = Math.max(0, (t.score || 0) - item.effect.value);
          supabase.from('mg_room_players').update({ score: newScore }).eq('id', t.id);
          channel?.send({
            type: 'broadcast',
            event: 'powerup_effect',
            payload: {
              targetId: t.id, effectType: 'lightning_hit',
              duration: 2, fromPlayerId: playerId,
              fromPlayerName: myPlayer?.player_name,
              itemEmoji: '🌩️', itemName: 'Lightning Strike', isAttack: true,
            },
          });
        });
        s.setPlayers(prev => prev.map(p => {
          if (targets.find(t => t.id === p.id)) return { ...p, score: Math.max(0, (p.score || 0) - item.effect.value) };
          return p;
        }));
        break;
      }

      case 'swap_rank': {
        const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
        const myIdx = sorted.findIndex(p => p.id === playerId);
        if (myIdx > 0) {
          const above = sorted[myIdx - 1];
          const me = sorted[myIdx];
          const [sA, sB] = [above.score, me.score];
          supabase.from('mg_room_players').update({ score: sB }).eq('id', above.id);
          supabase.from('mg_room_players').update({ score: sA }).eq('id', playerId);
          s.setPlayers(prev => prev.map(p => {
            if (p.id === above.id) return { ...p, score: sB };
            if (p.id === playerId) return { ...p, score: sA };
            return p;
          }));
        }
        break;
      }
    }

    // Broadcast usage for visual feedback
    channel?.send({
      type: 'broadcast',
      event: 'use_powerup',
      payload: {
        playerId,
        playerName: myPlayer?.player_name,
        itemId: item.id,
        itemEmoji: item.emoji,
        itemName: item.name,
      },
    });

    return item;
  }, []);

  return { usePowerUp };
}
