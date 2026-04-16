'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Dictionary } from '@/i18n/dictionaries/vi';
import Icon from '@/components/Icon/Icon';
import styles from './Navbar.module.css';

interface NavItem {
  href: string;
  labelKey: keyof Dictionary;
  icon: ReactNode;
}

const NAV_LINKS: NavItem[] = [
  { href: '/templates', labelKey: 'nav.games', icon: <Icon name="gamepad" size={20} /> },
  { href: '/tools', labelKey: 'nav.tools', icon: <Icon name="tool" size={20} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isTeacher, signOut, loading, user } = useAuth();
  const { locale, setLocale, t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <Icon name="gamepad" size={24} color="#fff" />
          </span>
          <span className={styles.logoText}>Tina MiniGame</span>
        </Link>

        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <Icon name={mobileOpen ? 'x' : 'menu'} size={24} />
        </button>

        {/* Backdrop for Mobile Menu */}
        {mobileOpen && (
          <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        <div className={`${styles.navLinks} ${mobileOpen ? styles.mobileOpen : ''}`}>
          <div className={styles.dragIndicator} onClick={() => setMobileOpen(false)}></div>
          
          {/* Mobile User Info at the top */}
          {!loading && isTeacher && (
            <>
              <div className={styles.mobileUserInfo}>
                <Icon name="users" size={16} />
                <span className={styles.userName}>{user?.email || 'Teacher'}</span>
              </div>
              
              <Link
                href="/dashboard"
                className={`${styles.navLink} ${styles.mobileOnlyMenuLink}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className={styles.navLinkIcon}><Icon name="dashboard" size={20} /></span>
                {t('nav.dashboard')}
              </Link>
            </>
          )}

          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.navLinkIcon}>{link.icon}</span>
              {t(link.labelKey)}
            </Link>
          ))}
          
          {/* Action Buttons based on Auth State */}
          {!loading && (
            isTeacher ? (
              <>
                <div className={`${styles.userMenu} ${styles.desktopOnly}`} ref={dropdownRef}>
                  <button 
                    className={styles.avatarButton} 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-label="User Menu"
                  >
                    {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={user.user_metadata.avatar_url || user.user_metadata.picture} 
                        alt="User Avatar" 
                        className={styles.avatarImg} 
                      />
                    ) : (
                      <div className={styles.avatarCircle}>
                        {user?.email ? user.email.charAt(0).toUpperCase() : 'T'}
                      </div>
                    )}
                  </button>
                  
                  {dropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.dropdownHeader}>
                         <span className={styles.userName}>{user?.email || 'Teacher'}</span>
                      </div>
                      
                      <Link
                        href="/dashboard"
                        className={styles.dropdownItem}
                        onClick={() => { setDropdownOpen(false); setMobileOpen(false); }}
                      >
                        <Icon name="dashboard" size={16} />
                        {t('nav.dashboard')}
                      </Link>
                      
                      <Link
                        href="/settings"
                        className={styles.dropdownItem}
                        onClick={() => { setDropdownOpen(false); setMobileOpen(false); }}
                      >
                        <Icon name="settings" size={16} />
                        {t('nav.settings')}
                      </Link>
                      
                      <div className={styles.dropdownDivider} />
                      
                      <button
                        className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                        onClick={() => {
                          signOut();
                          setDropdownOpen(false);
                          setMobileOpen(false);
                        }}
                      >
                        <Icon name="logout" size={16} />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile version user links */}
                <div className={styles.mobileUserMenu}>
                  <Link
                    href="/settings"
                    className={styles.navLink}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={styles.navLinkIcon}><Icon name="settings" size={20} /></span>
                    {t('nav.settings')}
                  </Link>
                  <button
                    className={`${styles.navLink} ${styles.mobileLogout}`}
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                  >
                    <span className={styles.navLinkIcon}><Icon name="logout" size={20} /></span>
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.authGroup}>
                <Link
                  href="/play"
                  className={styles.ctaButton}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon name="pin" size={16} />
                  {t('nav.pin')}
                </Link>
                <Link
                  href="/login"
                  className={styles.navLink}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon name="users" size={16} />
                  {t('nav.login')}
                </Link>
                <button 
                  className={styles.langToggle} 
                  onClick={() => {
                    setLocale(locale === 'en' ? 'vi' : 'en');
                    setMobileOpen(false);
                  }}
                  aria-label="Toggle Language"
                >
                  {locale.toUpperCase()}
                </button>
              </div>
            )
          )}

        </div>
      </div>
    </nav>
  );
}
