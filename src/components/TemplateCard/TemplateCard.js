'use client';

import { useState } from 'react';
import Link from 'next/link';
import TemplateIcon from '../TemplateIcon/TemplateIcon';
import { BADGES } from '@/data/templates';
import styles from './TemplateCard.module.css';

const LOCKED_SLUGS = [
  'image-quiz', 'flip-tiles', 'random-wheel', 'find-the-match', 'balloon-pop', 'pair-or-no-pair', 
  'speed-sorting', 'anagram', 'wordsearch', 'crossword', 'word-magnets', 'word-magnets-pro', 
  'complete-the-sentence', 'missing-word', 'maze-chase', 'flying-fruit', 'airplane', 
  'watch-memorize', 'watch-and-memorize', 'labelled-diagram', 'labelled-diagram-pro', 
  'rank-order', 'maths-generator'
];

/**
 * TemplateCard — Renders a single template card.
 * Fully data-driven: pass a template object and it renders everything.
 */
export default function TemplateCard({ template, index = 0, basePath = '/templates' }) {
  const { slug, name, nameVi, description, color, badges, difficulty, playerCount } = template;

  const isLocked = LOCKED_SLUGS.includes(slug);

  const badgeClassMap = {
    POPULAR: styles.badgePopular,
    NEW: styles.badgeNew,
    PRO: styles.badgePro,
  };

  const [imgError, setImgError] = useState(false);

  // If locked, we don't navigate
  const Component = isLocked ? 'div' : Link;
  const linkProps = isLocked ? {} : { href: `${basePath}/${slug}` };

  return (
    <Component
      {...linkProps}
      className={`${styles.card} ${isLocked ? styles.cardLocked : ''}`}
      style={{
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={(e) => {
        if (!isLocked) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `0 12px 32px ${color}25`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isLocked) {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.boxShadow = '';
        }
      }}
    >
      <div className={styles.imageContainer}>
        {!isLocked && <div className={styles.imageGlow} style={{ background: color }}></div>}
        {!imgError ? (
          <img 
            src={`/template-images/${slug}.png`} 
            alt={name} 
            className={`${styles.templateImage} ${isLocked ? styles.imageBW : ''}`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.iconWrapper} style={{ background: isLocked ? '#f1f5f9' : `${color}15` }}>
            <TemplateIcon slug={slug} color={isLocked ? '#94a3b8' : color} size={48} />
          </div>
        )}
        
        {isLocked && (
          <div className={styles.lockOverlay}>
            <span className={styles.lockIcon}>🔒</span>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.header}>
          <span className={styles.name}>{name}</span>
          <span className={styles.nameVi}>({nameVi})</span>
          <div className={styles.badges}>
            {isLocked ? (
              <span className={`${styles.badge} ${styles.badgeLocked}`}>
                ⏳ Sắp ra mắt
              </span>
            ) : (
              badges.map(badge => (
                <span key={badge} className={`${styles.badge} ${badgeClassMap[badge] || ''}`}>
                  {BADGES[badge]?.emoji} {BADGES[badge]?.label}
                </span>
              ))
            )}
          </div>
        </div>

        <p className={styles.description}>{description}</p>

        <div className={styles.meta}>
          <span className={styles.difficulty}>
            {[1, 2, 3, 4, 5].map(level => (
              <span
                key={level}
                className={`${styles.diffStar} ${level <= difficulty ? styles.diffStarActive : styles.diffStarInactive}`}
              >
                ★
              </span>
            ))}
          </span>
          <span>👥 {playerCount}</span>
        </div>
      </div>
    </Component>
  );
}
