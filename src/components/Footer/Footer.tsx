'use client';

import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';
import Icon from '@/components/Icon/Icon';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <span className={styles.brandIcon}>
              <Icon name="gamepad" size={20} color="#fff" />
            </span>
            Tina MiniGame
          </div>
          <p className={styles.brandDesc}>
            {t('footer.desc')}
          </p>
        </div>

        <div className={styles.column}>
          <h3>{t('footer.explore')}</h3>
          <Link href="/templates">{t('footer.allGames')}</Link>
          <Link href="/templates?category=quiz">{t('footer.quiz')}</Link>
          <Link href="/templates?category=action">{t('footer.action')}</Link>
          <Link href="/templates?category=word">{t('footer.word')}</Link>
        </div>

        <div className={styles.column}>
          <h3>{t('footer.account')}</h3>
          <Link href="/login">{t('nav.login')}</Link>
          <Link href="/about">{t('nav.about')}</Link>
          <Link href="/dashboard">{t('nav.dashboard')}</Link>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>{t('footer.copyright')}</span>
        <span>{t('footer.slogan')}</span>
      </div>
    </footer>
  );
}
