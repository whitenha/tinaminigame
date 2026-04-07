'use client';

import { useState } from 'react';
import Link from 'next/link';
import TemplateIcon from '../TemplateIcon/TemplateIcon';
import { BADGES } from '@/data/templates';
import styles from './TemplateCard.module.css';

/**
 * TemplateCard — Renders a single template card.
 * Fully data-driven: pass a template object and it renders everything.
 */
export default function TemplateCard({ template, index = 0 }) {
  const { slug, name, nameVi, description, color, badges, difficulty, playerCount } = template;

  const badgeClassMap = {
    POPULAR: styles.badgePopular,
    NEW: styles.badgeNew,
    PRO: styles.badgePro,
  };

  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/templates/${slug}`}
      className={styles.card}
      style={{
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className={styles.imageContainer}>
        <div className={styles.imageGlow} style={{ background: color }}></div>
        {!imgError ? (
          <img 
            src={`/template-images/${slug}.png`} 
            alt={name} 
            className={styles.templateImage}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.iconWrapper} style={{ background: `${color}15` }}>
            <TemplateIcon slug={slug} color={color} size={48} />
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.header}>
          <span className={styles.name}>{name}</span>
          <span className={styles.nameVi}>({nameVi})</span>
          <div className={styles.badges}>
            {badges.map(badge => (
              <span key={badge} className={`${styles.badge} ${badgeClassMap[badge] || ''}`}>
                {BADGES[badge]?.emoji} {BADGES[badge]?.label}
              </span>
            ))}
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
    </Link>
  );
}
