'use client';

import { useState } from 'react';
import Link from 'next/link';
import TemplateIcon from '../TemplateIcon/TemplateIcon';
import Icon from '../Icon/Icon';
import { useLanguage } from '@/i18n/LanguageContext';
import { BADGES } from '@/data/templates';
import styles from './TemplateCard.module.css';

const LOCKED_SLUGS = [
  'flip-tiles', 'random-wheel', 'find-the-match', 'balloon-pop', 'pair-or-no-pair', 
  'speed-sorting', 'anagram', 'wordsearch', 'crossword', 'word-magnets', 'word-magnets-pro', 
  'complete-the-sentence', 'missing-word', 'maze-chase', 'flying-fruit', 'airplane', 
  'watch-memorize', 'watch-and-memorize', 'labelled-diagram', 'labelled-diagram-pro', 
  'rank-order', 'maths-generator'
];

interface TemplateData {
  id: string | number;
  slug: string;
  name: string;
  nameVi: string;
  description: string;
  color: string;
  badges: string[];
  difficulty: number;
  playerCount: string;
}

interface TemplateCardProps {
  template: TemplateData;
  index?: number;
  basePath?: string;
}

const BADGE_META: Record<string, { label: Record<string, string>; className: string }> = {
  POPULAR: { label: { en: 'Popular', vi: 'Phổ biến' }, className: styles.badgePopular },
  NEW: { label: { en: 'New', vi: 'Mới' }, className: styles.badgeNew },
  PRO: { label: { en: 'Pro', vi: 'Pro' }, className: styles.badgePro },
};

export default function TemplateCard({ template, index = 0, basePath = '/templates' }: TemplateCardProps) {
  const { slug, name, nameVi, description, color, badges, difficulty, playerCount } = template;
  const isLocked = LOCKED_SLUGS.includes(slug);
  const [imgError, setImgError] = useState(false);
  const { t, locale } = useLanguage();

  const Component = isLocked ? 'div' : Link;
  const linkProps = isLocked ? {} : { href: `${basePath}/${slug}` };

  return (
    // @ts-ignore — polymorphic component (div | Link)
    <Component
      {...linkProps}
      className={`${styles.card} ${isLocked ? styles.cardLocked : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        if (!isLocked) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `var(--shadow-card-hover), 0 0 0 1px ${color}20`;
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
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
            <Icon name="lock" size={24} />
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.header}>
          <span className={styles.name}>{name}</span>
          {locale === 'vi' && <span className={styles.nameVi}>({nameVi})</span>}
          <div className={styles.badges}>
            {isLocked ? (
              <span className={`${styles.badge} ${styles.badgeLocked}`}>
                <Icon name="clock" size={14} /> {locale === 'vi' ? 'Sắp ra mắt' : 'Coming soon'}
              </span>
            ) : (
              badges.map((badge: string) => {
                const meta = BADGE_META[badge];
                if (!meta) return null;
                return (
                  <span key={badge} className={`${styles.badge} ${meta.className}`}>
                    <Icon name={badge === 'PRO' ? 'crown' : 'star'} size={14} />
                    {meta.label[locale] || meta.label.en}
                  </span>
                );
              })
            )}
          </div>
        </div>

        <p className={styles.description}>{t(`game.${slug}.desc` as any)}</p>

        <div className={styles.meta}>
          <span className={styles.difficulty}>
            {[1, 2, 3, 4, 5].map(level => (
              <Icon
                key={level}
                name={level <= difficulty ? 'star' : 'star-empty'}
                size={14}
                color={level <= difficulty ? '#F59E0B' : '#CBD5E1'}
              />
            ))}
          </span>
          <span className={styles.playerInfo}>
            <Icon name="users" size={14} />
            {playerCount}
          </span>
        </div>
      </div>
    </Component>
  );
}
