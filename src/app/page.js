import Link from 'next/link';
import Hero from '@/components/Hero/Hero';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import { getFeaturedTemplates, getActiveCategories, getCategoryCounts } from '@/data/templates';
import styles from './home.module.css';

export default function HomePage() {
  const featured = getFeaturedTemplates(8);
  const categories = getActiveCategories().filter(c => c.id !== 'all');
  const counts = getCategoryCounts();

  return (
    <>
      <Hero />

      {/* Category Quick Links */}
      <section className={styles.categories}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEmoji}>📂</span>
            <h2 className={styles.sectionTitle}>Danh mục trò chơi</h2>
            <p className={styles.sectionDesc}>Chọn loại trò chơi bạn muốn tạo</p>
          </div>
          <div className={styles.catGrid}>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/templates?category=${cat.id}`}
                className={styles.catCard}
              >
                <span className={styles.catEmoji}>{cat.emoji}</span>
                <div className={styles.catName}>{cat.label}</div>
                <div className={styles.catCount}>{counts[cat.id] || 0} templates</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Templates */}
      <section className={styles.featured}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEmoji}>⭐</span>
            <h2 className={styles.sectionTitle}>Templates phổ biến</h2>
            <p className={styles.sectionDesc}>Những trò chơi được yêu thích nhất</p>
          </div>
          <div className={styles.grid}>
            {featured.map((template, i) => (
              <TemplateCard key={template.id} template={template} index={i} />
            ))}
          </div>
          <div className={styles.viewAll}>
            <Link href="/templates" className={styles.viewAllBtn}>
              🎮 Xem tất cả {getCategoryCounts().all} templates →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
