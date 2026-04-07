import Link from 'next/link';
import { TEMPLATES, CATEGORIES } from '@/data/templates';
import styles from './Hero.module.css';

export default function Hero() {
  const templateCount = TEMPLATES.length;
  const categoryCount = CATEGORIES.filter(c => c.id !== 'all').length;
  const emojis = ['🎯', '🧩', '🎲', '📝', '🏆', '🎪', '🔤', '🧠', '🎮'];

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.content}>
          <div className={styles.badge}>
            🎓 Dành cho học sinh K-5
          </div>
          <h1 className={styles.title}>
            Học mà chơi,
            <br />
            <span className={styles.titleHighlight}>Chơi mà học!</span>
          </h1>
          <p className={styles.subtitle}>
            {templateCount}+ trò chơi tương tác giúp bài học trở nên sống động. 
            Tạo hoạt động trong vài phút!
          </p>
          <div className={styles.actions}>
            <Link href="/templates" className={styles.btnPrimary}>
              🚀 Khám phá Templates
            </Link>
            <Link href="/about" className={styles.btnSecondary}>
              💡 Tìm hiểu thêm
            </Link>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{templateCount}+</div>
              <div className={styles.statLabel}>Templates</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>{categoryCount}</div>
              <div className={styles.statLabel}>Danh mục</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>K-5</div>
              <div className={styles.statLabel}>Cấp lớp</div>
            </div>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.emojis}>
            {emojis.map((emoji, i) => (
              <div key={i} className={styles.emojiCard} style={{ animationDelay: `${i * 0.2}s` }}>
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
