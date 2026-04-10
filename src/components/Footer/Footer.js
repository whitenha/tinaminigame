import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>Tina MiniGame</div>
          <p className={styles.brandDesc}>
            Nền tảng học tập tương tác với 40+ trò chơi giáo dục dành cho K–12. 
            Giúp giáo viên tạo hoạt động hấp dẫn trong vài phút.
          </p>
        </div>

        <div className={styles.column}>
          <h3>Khám phá</h3>
          <Link href="/templates">Tất cả trò chơi</Link>
          <Link href="/templates?category=quiz">Trắc nghiệm</Link>
          <Link href="/templates?category=action">Trò chơi hành động</Link>
          <Link href="/templates?category=word">Từ vựng</Link>
        </div>

        <div className={styles.column}>
          <h3>Tài khoản</h3>
          <Link href="/login">Đăng nhập</Link>
          <Link href="/about">Giới thiệu</Link>
          <Link href="/dashboard">Bảng điều khiển</Link>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>© 2026 Tina MiniGame</span>
        <span>Nền tảng giáo dục K–12</span>
      </div>
    </footer>
  );
}
