'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon/Icon';
import styles from './login.module.css';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, isTeacher } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (isTeacher) {
      router.push('/dashboard');
    }
  }, [isTeacher, router]);

  if (isTeacher) {
    return null; // Prevent flash during redirect
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Note: Google OAuth redirects automatically
    } catch (err: any) {
      setError(err.message || t('login.error'));
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      
      {/* ── LEFT COLUMN: HERO ─────────────────────────────────── */}
      <div className={styles.leftCol}>
        {/* Cinematic Background Glows */}
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.glowBottom} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.brand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Tina MiniGame
          </div>
          
          <h1 className={styles.heroTitle} dangerouslySetInnerHTML={{ __html: t('login.hero.title') }} />
          <p className={styles.heroSubtitle}>
            {t('login.hero.subtitle')}
          </p>

          <ul className={styles.valueList} aria-label="Lợi ích chính">
            <li className={styles.valueItem}>
              <svg className={styles.checkIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
              {t('login.hero.feature1')}
            </li>
            <li className={styles.valueItem}>
              <svg className={styles.checkIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
              {t('login.hero.feature2')}
            </li>
            <li className={styles.valueItem}>
              <svg className={styles.checkIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
              {t('login.hero.feature3')}
            </li>
          </ul>
        </div>
      </div>

      {/* ── RIGHT COLUMN: LOGIN PANEL ─────────────────────────── */}
      <div className={styles.rightCol}>
        <main className={styles.panel} aria-labelledby="login-title">
          
          <span className={styles.eyebrow}>{t('login.panel.eyebrow')}</span>
          <h2 id="login-title" className={styles.panelTitle}>{t('login.panel.title')}</h2>
          <p className={styles.panelSubtitle}>{t('login.panel.subtitle')}</p>

          {error && (
            <div className={styles.errorMessage} role="alert">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              {error}
            </div>
          )}

          <button 
            type="button" 
            onClick={handleGoogleLogin}
            className={styles.googleButton}
            disabled={loading}
            aria-label="Tiếp tục truy cập với tài khoản Google"
            aria-busy={loading}
          >
            {loading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? t('login.button.loading') : t('login.button.text')}
          </button>

          <aside className={styles.studentBox} role="note" aria-label="Hướng dẫn tham gia nhanh">
            <div className={styles.studentIcon} aria-hidden="true">
              <Icon name="lightbulb" size={24} color="var(--color-primary)" />
            </div>
            <div className={styles.studentContent}>
              <h3 className={styles.studentTitle}>{t('login.student.title')}</h3>
              <p className={styles.studentText}>
                {t('login.student.desc1')} <a href="/play" className={styles.studentLink}>{t('login.student.link')}</a> {t('login.student.desc2')}
              </p>
            </div>
          </aside>

        </main>
      </div>

    </div>
  );
}
