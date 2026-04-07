import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>🎲 Tina MiniGame</div>
          <p className={styles.brandDesc}>
            Nền tảng học tập tương tác với 40+ trò chơi giáo dục dành cho học sinh K-5. 
            Học mà chơi, chơi mà học!
          </p>
        </div>

        <div className={styles.column}>
          <h3>Khám phá</h3>
          <Link href="/templates">Tất cả Templates</Link>
          <Link href="/templates?category=quiz">Trắc nghiệm</Link>
          <Link href="/templates?category=action">Trò chơi hành động</Link>
          <Link href="/templates?category=word">Từ vựng</Link>
        </div>

        <div className={styles.column}>
          <h3>Liên kết</h3>
          <Link href="/about">Giới thiệu</Link>
          <Link href="/templates">Bắt đầu tạo</Link>
          <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>© 2026 Tina MiniGame. Made with <span className={styles.hearts}>♥</span></span>
        <span>Dành cho học sinh K-5 🎓</span>
      </div>
    </footer>
  );
}
