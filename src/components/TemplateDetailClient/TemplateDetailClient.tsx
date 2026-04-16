'use client';

import Link from 'next/link';
import TemplateIcon from '@/components/TemplateIcon/TemplateIcon';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import Icon from '@/components/Icon/Icon';
import { BADGES } from '@/data/templates';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from '@/app/templates/[slug]/detail.module.css';

export default function TemplateDetailClient({ template, related, category }: any) {
  const { t, locale } = useLanguage();

  const badgeClassMap: any = {
    POPULAR: styles.badgePopular,
    NEW: styles.badgeNew,
    PRO: styles.badgePro,
  };

  const badgeIconMap: Record<string, any> = {
    POPULAR: 'star',
    NEW: 'star',
    PRO: 'crown',
  };

  const badgeLabels: Record<string, Record<string, string>> = {
    POPULAR: { en: 'Popular', vi: 'Phổ biến' },
    NEW: { en: 'New', vi: 'Mới' },
    PRO: { en: 'Pro', vi: 'Pro' }
  };

  const categoryIconMap: Record<string, any> = {
    all: 'gamepad',
    quiz: 'help-circle',
    matching: 'link',
    word: 'file',
    sentence: 'pencil',
    card: 'grid',
    wheel: 'clock',
    action: 'rocket',
    visual: 'eye',
    math: 'plus'
  };

  const difficultyLabels = ['', 'Dễ', 'Trung bình', 'Khó', 'Rất khó', 'Siêu khó'];

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/templates" className={styles.backLink}>
          {locale === 'vi' ? '← Quay lại danh sách templates' : '← Back to templates'}
        </Link>

        <div className={styles.detail}>
          {/* Left: Icon */}
          <div
            className={styles.iconSection}
            style={{
              background: `${template.color}10`,
              color: template.color,
              borderRadius: '24px',
            }}
          >
            <div className={styles.iconBig}>
              <TemplateIcon slug={template.slug} color={template.color} size={160} />
            </div>
            <div className={styles.templateName} style={{ color: template.color }}>
              {t(`game.${template.slug}.name` as any)}
            </div>
            {locale === 'vi' && <div className={styles.templateNameVi}>{template.nameVi}</div>}
          </div>

          {/* Right: Info */}
          <div className={styles.infoSection}>
            <div className={styles.badges}>
              {template.badges.map((badge: string) => (
                <span key={badge} className={`${styles.badge} ${badgeClassMap[badge] || ''}`}>
                  <span className={styles.badgeIconWrapper}>
                    <Icon name={badgeIconMap[badge] || 'star'} size={14} />
                  </span>
                  {badgeLabels[badge]?.[locale] || (BADGES as any)[badge]?.label}
                </span>
              ))}
              {category && (
                <span className={`${styles.badge} ${styles.badgeCategory}`}>
                  <span className={styles.badgeIconWrapper}>
                    <Icon name={categoryIconMap[category.id] || 'gamepad'} size={14} />
                  </span>
                  {t(category.labelKey as any)}
                </span>
              )}
            </div>

            <h1 className={styles.title}>{t(`game.${template.slug}.name` as any)}</h1>
            {locale === 'vi' && <p className={styles.nameVi}>{template.nameVi}</p>}

            <p className={styles.description} style={{ borderColor: template.color }}>
              {t(`game.${template.slug}.desc` as any)}
            </p>

            <div className={styles.howToPlay}>
              <h2 className={styles.howToPlayTitle}>
                <Icon name="book" size={20} className={styles.sectionIcon} />
                {locale === 'vi' ? 'Cách chơi' : 'How to Play'}
              </h2>
              <p className={styles.howToPlayText}>{t(`game.${template.slug}.how` as any)}</p>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <span className={styles.metaEmojiContainer}>
                  <Icon name="star" size={24} color="#f59e0b" />
                </span>
                <div className={styles.metaLabel}>{locale === 'vi' ? 'Độ khó' : 'Difficulty'}</div>
                <div className={styles.metaValue}>
                  {difficultyLabels[template.difficulty] || 'N/A'}
                </div>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaEmojiContainer}>
                  <Icon name="users" size={24} color="#6366f1" />
                </span>
                <div className={styles.metaLabel}>{locale === 'vi' ? 'Người chơi' : 'Players'}</div>
                <div className={styles.metaValue}>{template.playerCount}</div>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaEmojiContainer}>
                  <Icon name={template.tier === 'pro' ? 'crown' : 'package'} size={24} color={template.tier === 'pro' ? '#f59e0b' : '#8b5cf6'} />
                </span>
                <div className={styles.metaLabel}>{locale === 'vi' ? 'Gói' : 'Tier'}</div>
                <div className={styles.metaValue}>
                  {template.tier === 'pro' ? 'Pro' : 'Standard'}
                </div>
              </div>
            </div>

            <Link
              href={`/create/${template.slug}`}
              className={styles.ctaBtn}
              style={{ background: template.color }}
            >
              <Icon name="edit" size={20} className={styles.ctaIcon} />
              {locale === 'vi' ? 'Tạo hoạt động với' : 'Create with'} {t(`game.${template.slug}.name` as any)}
            </Link>
          </div>
        </div>

        {/* Related Templates */}
        {related.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>
              <Icon name="target" size={24} className={styles.sectionIcon} />
              {locale === 'vi' ? 'Templates tương tự' : 'Related Templates'}
            </h2>
            <div className={styles.relatedGrid}>
              {related.map((tItem: any, i: number) => (
                <TemplateCard key={tItem.id} template={tItem} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
