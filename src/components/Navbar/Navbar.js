'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isTeacher, signOut, loading } = useAuth();

  const links = [
    { href: '/', label: 'Trang chủ', emoji: '🏠' },
    { href: '/templates', label: 'Games', emoji: '🎮' },
    { href: '/tools', label: 'Tools', emoji: '🛠️' },
    { href: '/about', label: 'Giới thiệu', emoji: '💡' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎲</span>
          <span className={styles.logoText}>Tina MiniGame</span>
        </Link>

        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        {/* Backdrop for Mobile Menu */}
        {mobileOpen && (
          <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        <div className={`${styles.navLinks} ${mobileOpen ? styles.mobileOpen : ''}`}>
          <div className={styles.dragIndicator} onClick={() => setMobileOpen(false)}></div>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.emoji} {link.label}
            </Link>
          ))}
          
          {/* Action Buttons based on Auth State */}
          {!loading && (
            isTeacher ? (
              <div className={styles.authGroup}>
                <Link
                  href="/dashboard"
                  className={styles.ctaButton}
                  onClick={() => setMobileOpen(false)}
                >
                  🚀 Bảng Điều Khiển
                </Link>
                <button
                  className={styles.navLink}
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  🚪 Đăng xuất
                </button>
              </div>
            ) : (
              <div className={styles.authGroup}>
                <Link
                  href="/templates"
                  className={styles.ctaButton}
                  onClick={() => setMobileOpen(false)}
                >
                  🎮 Chơi Thử Ngay
                </Link>
                <Link
                  href="/login"
                  className={styles.navLink}
                  onClick={() => setMobileOpen(false)}
                  style={{ border: '2px solid var(--color-purple)', borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem' }}
                >
                  👩‍🏫 GV Đăng nhập
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
