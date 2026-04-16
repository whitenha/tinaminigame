'use client';

import { useState, useEffect } from 'react';
import styles from './PowerUpInventory.module.css';

/**
 * PowerUpInventory — Floating item slots for players
 * Shows 2 item slots on the left side of the screen.
 * Players can tap to use items during gameplay.
 */
export default function PowerUpInventory({ inventory, onUseItem, activeEffects, itemMultiplier }: any) {
  const [hoveredSlot, setHoveredSlot] = useState<any>(null);
  const [attackNotif, setAttackNotif] = useState<any>(null);

  // Show attack notification when hit
  useEffect(() => {
    if (activeEffects.length > 0) {
      const latest = activeEffects[activeEffects.length - 1];
      if (latest.fromPlayer) {
        setAttackNotif(latest);
        setTimeout(() => setAttackNotif(null), 2500);
      }
    }
  }, [activeEffects]);

  const getRarityClass = (item: any) => {
    if (!item) return '';
    const r = item.rarity?.id || 'common';
    return styles[`slot${r.charAt(0).toUpperCase() + r.slice(1)}`] || '';
  };

  // Active effect overlays
  const hasFreezeEffect = activeEffects.some((e: any) => e.effectType === 'freeze_player');
  const hasBlurEffect = activeEffects.some((e: any) => e.effectType === 'blur_screen');

  return (
    <>
      {/* Item Multiplier Badge */}
      {itemMultiplier > 1 && (
        <div className={styles.multiplierBadge}>
          ×{itemMultiplier} Points Active!
        </div>
      )}

      {/* Item Slots */}
      <div className={styles.inventoryContainer}>
        {[0, 1].map(slotIdx => {
          const item = inventory[slotIdx];
          return (
            <div
              key={slotIdx}
              className={`${styles.slot} ${item ? getRarityClass(item) : styles.slotEmpty} ${item ? styles.slotNew : ''}`}
              onClick={() => item && onUseItem(slotIdx)}
              onMouseEnter={() => item && setHoveredSlot(slotIdx)}
              onMouseLeave={() => setHoveredSlot(null)}
              title={item ? `${item.name}: ${item.description}` : 'Empty slot'}
            >
              {item ? item.emoji : '—'}
              {item && <span className={styles.useLabel}>TAP</span>}

              {/* Tooltip */}
              {hoveredSlot === slotIdx && item && (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipName}>
                    {item.emoji} {item.name}
                    <span
                      className={styles.tooltipRarity}
                      style={{
                        background: item.rarity.color + '22',
                        color: item.rarity.color,
                        border: `1px solid ${item.rarity.color}44`,
                      }}
                    >
                      {item.rarity.label}
                    </span>
                  </div>
                  <div className={styles.tooltipDesc}>{item.description}</div>
                  <div className={styles.tooltipInstruction}>{item.instruction}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Effect Overlays */}
      {hasFreezeEffect && <div className={styles.effectFreeze} />}
      {hasBlurEffect && <div className={styles.effectBlur} />}

      {/* Attack Notification */}
      {attackNotif && (
        <div className={styles.attackOverlay}>
          <div className={styles.attackNotification}>
            <span className={styles.attackEmoji}>{attackNotif.itemEmoji || '⚡'}</span>
            <div className={styles.attackText}>{attackNotif.itemName || 'Attack!'}</div>
            <div className={styles.attackFrom}>from {attackNotif.fromPlayer}</div>
          </div>
        </div>
      )}
    </>
  );
}
