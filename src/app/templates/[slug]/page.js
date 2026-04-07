import Link from 'next/link';
import { notFound } from 'next/navigation';
import TemplateIcon from '@/components/TemplateIcon/TemplateIcon';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import { getTemplateBySlug, getAllSlugs, getRelatedTemplates, BADGES, CATEGORIES } from '@/data/templates';
import styles from './detail.module.css';

// Pre-render all template pages at build time
export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) return {};
  return {
    title: `${template.name} (${template.nameVi}) — Tina MiniGame`,
    description: template.description,
  };
}

export default async function TemplateDetailPage({ params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const related = getRelatedTemplates(slug, 4);
  const category = CATEGORIES.find(c => c.id === template.category);

  const badgeClassMap = {
    POPULAR: styles.badgePopular,
    NEW: styles.badgeNew,
    PRO: styles.badgePro,
  };

  const difficultyLabels = ['', 'Dễ', 'Trung bình', 'Khó', 'Rất khó', 'Siêu khó'];

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/templates" className={styles.backLink}>
          ← Quay lại danh sách templates
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
              {template.name}
            </div>
            <div className={styles.templateNameVi}>{template.nameVi}</div>
          </div>

          {/* Right: Info */}
          <div className={styles.infoSection}>
            <div className={styles.badges}>
              {template.badges.map(badge => (
                <span key={badge} className={`${styles.badge} ${badgeClassMap[badge] || ''}`}>
                  {BADGES[badge]?.emoji} {BADGES[badge]?.label}
                </span>
              ))}
              {category && (
                <span className={`${styles.badge} ${styles.badgeCategory}`}>
                  {category.emoji} {category.label}
                </span>
              )}
            </div>

            <h1 className={styles.title}>{template.name}</h1>
            <p className={styles.nameVi}>{template.nameVi}</p>

            <p className={styles.description} style={{ borderColor: template.color }}>
              {template.description}
            </p>

            <div className={styles.howToPlay}>
              <h2 className={styles.howToPlayTitle}>📖 Cách chơi</h2>
              <p className={styles.howToPlayText}>{template.howToPlay}</p>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <span className={styles.metaEmoji}>⭐</span>
                <div className={styles.metaLabel}>Độ khó</div>
                <div className={styles.metaValue}>
                  {difficultyLabels[template.difficulty] || 'N/A'}
                </div>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaEmoji}>👥</span>
                <div className={styles.metaLabel}>Người chơi</div>
                <div className={styles.metaValue}>{template.playerCount}</div>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaEmoji}>
                  {template.tier === 'pro' ? '👑' : '📦'}
                </span>
                <div className={styles.metaLabel}>Gói</div>
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
              🚀 Tạo hoạt động với {template.name}
            </Link>
          </div>
        </div>

        {/* Related Templates */}
        {related.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>🎯 Templates tương tự</h2>
            <div className={styles.relatedGrid}>
              {related.map((t, i) => (
                <TemplateCard key={t.id} template={t} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
