'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';
import { TEMPLATES, CATEGORIES, getCategoryCounts, getFeaturedTemplates, getActiveCategories } from '@/data/templates';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import styles from './home.module.css';

export default function HomePage() {
  const { t } = useLanguage();
  const featured = getFeaturedTemplates(6);
  const categories = getActiveCategories().filter(c => c.id !== 'all');
  const counts = getCategoryCounts();
  const templateCount = TEMPLATES.length;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: HERO — Platform Identity
          Trả lời: "Đây là gì?", "Dành cho ai?", "Bấm vào đâu?"
       ═══════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        {/* Subtle decorative pattern */}
        <div className={styles.heroPattern} aria-hidden="true">
          <svg viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="650" cy="100" r="180" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
            <circle cx="700" cy="150" r="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <circle cx="100" cy="450" r="140" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <circle cx="400" cy="300" r="4" fill="rgba(255,255,255,0.15)"/>
            <circle cx="300" cy="100" r="3" fill="rgba(255,255,255,0.1)"/>
            <circle cx="550" cy="400" r="3" fill="rgba(255,255,255,0.12)"/>
            <circle cx="200" cy="250" r="2" fill="rgba(255,255,255,0.08)"/>
            <path d="M50 500 Q200 480 350 500" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none"/>
            <path d="M450 50 Q600 30 750 50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none"/>
          </svg>
        </div>

        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              Nền tảng học tập K–12
            </div>
            <h1 className={styles.heroTitle} dangerouslySetInnerHTML={{ __html: t('home.hero.title') }} />
            <p className={styles.heroSubtitle}>
              {t('home.hero.subtitle')}
            </p>
            <div className={styles.heroActions}>
              <Link href="/templates" className={styles.btnPrimary}>
                {t('home.hero.cta.start')}
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                {t('home.hero.cta.explore')}
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <span className={styles.heroCardDot} style={{background:'#EF4444'}}></span>
                <span className={styles.heroCardDot} style={{background:'#F59E0B'}}></span>
                <span className={styles.heroCardDot} style={{background:'#10B981'}}></span>
              </div>
              <div className={styles.heroCardBody}>
                <div className={styles.heroMockQ}>Thủ đô của Việt Nam là gì?</div>
                <div className={styles.heroMockGrid}>
                  <div className={`${styles.heroMockOpt} ${styles.heroMockCorrect}`}>Hà Nội</div>
                  <div className={styles.heroMockOpt}>Đà Nẵng</div>
                  <div className={styles.heroMockOpt}>TP.HCM</div>
                  <div className={styles.heroMockOpt}>Huế</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: TRUST STRIP — Credibility at a glance
       ═══════════════════════════════════════════════════════════ */}
      <section className={styles.trustStrip}>
        <div className="container">
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>{templateCount}+</span>
              <span className={styles.trustLabel}>Mẫu trò chơi</span>
            </div>
            <div className={styles.trustDivider}></div>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>{categories.length}</span>
              <span className={styles.trustLabel}>Danh mục</span>
            </div>
            <div className={styles.trustDivider}></div>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>K–12</span>
              <span className={styles.trustLabel}>Cấp lớp</span>
            </div>
            <div className={styles.trustDivider}></div>
            <div className={styles.trustItem}>
              <span className={styles.trustNumber}>30+</span>
              <span className={styles.trustLabel}>Người chơi đồng thời</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: AUDIENCE PATHWAYS — For Whom?
       ═══════════════════════════════════════════════════════════ */}
      <section className={`section ${styles.audiences}`}>
        <div className="container">
          <div className="section-header">
            <h2>{t('home.audience.title')}</h2>
          </div>

          <div className="grid-3">
            <div className={styles.audienceCard}>
              <div className={`${styles.audienceIcon} ${styles.audienceTeacher}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <h3>{t('home.audience.teacher')}</h3>
              <p>{t('home.audience.teacher.desc')}</p>
              <Link href="/login" className={styles.audienceLink}>
                Bắt đầu tạo hoạt động →
              </Link>
            </div>

            <div className={styles.audienceCard}>
              <div className={`${styles.audienceIcon} ${styles.audienceStudent}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <h3>{t('home.audience.student')}</h3>
              <p>{t('home.audience.student.desc')}</p>
              <Link href="/templates" className={styles.audienceLink}>
                Khám phá trò chơi →
              </Link>
            </div>

            <div className={styles.audienceCard}>
              <div className={`${styles.audienceIcon} ${styles.audienceParent}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <h3>{t('home.audience.parent')}</h3>
              <p>{t('home.audience.parent.desc')}</p>
              <Link href="/about" className={styles.audienceLink}>
                Tìm hiểu thêm →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: FEATURED — Use-case Showcase
          Mục tiêu: Showcase các template tốt nhất, tạo desire.
       ═══════════════════════════════════════════════════════════ */}
      <section className={`section-alt ${styles.featured}`}>
        <div className="container">
          <div className="section-header">
            <h2>{t('home.featured.title')}</h2>
            <p>{t('home.featured.subtitle')}</p>
          </div>

          <div className="grid-auto-lg">
            {featured.map((template, i) => (
              <TemplateCard key={template.id} template={template} index={i} />
            ))}
          </div>

          <div className={styles.sectionCta}>
            <Link href="/templates" className={styles.btnOutline}>
              Xem tất cả {templateCount} trò chơi →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: CATEGORY EXPLORER — Taxonomy / Browse Entry
          Khác với Featured: đây là entry point theo chủ đề, không phải showcase.
       ═══════════════════════════════════════════════════════════ */}
      <section className={`section ${styles.categorySection}`}>
        <div className="container">
          <div className="section-header">
            <h2>{t('home.cat.title')}</h2>
            <p>{t('home.cat.subtitle')}</p>
          </div>

          <div className={styles.catGrid}>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/templates?category=${cat.id}`}
                className={styles.catCard}
              >
                <span className={styles.catIcon}>{cat.emoji}</span>
                <span className={styles.catName}>{t(cat.labelKey as any)}</span>
                <span className={styles.catCount}>{counts[cat.id] || 0} {t('home.cat.count')}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6: HOW IT WORKS — 3-Step Process
       ═══════════════════════════════════════════════════════════ */}
      <section className={`section-alt ${styles.howItWorks}`}>
        <div className="container">
          <div className="section-header">
            <h2>{t('home.how.title')}</h2>
            <p>{t('home.how.subtitle')}</p>
          </div>

          <div className="grid-3">
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>{t('home.how.step1')}</h3>
              <p className={styles.stepDesc}>
                {t('home.how.step1.desc')}
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>{t('home.how.step2')}</h3>
              <p className={styles.stepDesc}>
                {t('home.how.step2.desc')}
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>{t('home.how.step3')}</h3>
              <p className={styles.stepDesc}>
                {t('home.how.step3.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7: TEACHER CONFIDENCE — Built for Educators
       ═══════════════════════════════════════════════════════════ */}
      <section className={`section ${styles.confidence}`}>
        <div className="container">
          <div className={styles.confidenceInner}>
            <div className={styles.confidenceText}>
              <h2>Được xây dựng<br />cho giáo viên</h2>
              <p>
                Không chỉ là trò chơi. Đây là công cụ giảng dạy chuyên nghiệp 
                với đầy đủ tính năng mà giáo viên cần.
              </p>
              <Link href="/login" className={styles.btnPrimary}>
                Đăng nhập giáo viên
              </Link>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <strong>Multiplayer</strong>
                  <span>Tối đa 30 người chơi đồng thời</span>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div>
                  <strong>Tự động lưu</strong>
                  <span>Nội dung được lưu liên tục</span>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </div>
                <div>
                  <strong>Đọc tự động</strong>
                  <span>Text-to-Speech đa ngôn ngữ</span>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <strong>Bóc tách tự động</strong>
                  <span>Dán văn bản, AI tạo câu hỏi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8: FINAL CTA — Conversion Close
       ═══════════════════════════════════════════════════════════ */}
      <section className={styles.finalCta}>
        <div className="container-narrow text-center">
          <h2 className={styles.finalCtaTitle}>
            {t('home.cta.title')}
          </h2>
          <p className={styles.finalCtaDesc}>
            {t('home.cta.subtitle')}
          </p>
          <div className={styles.finalCtaActions}>
            <Link href="/templates" className={styles.btnPrimaryLg}>
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
