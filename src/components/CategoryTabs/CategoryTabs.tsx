'use client';

import { getActiveCategories, getCategoryCounts } from '@/data/templates';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './CategoryTabs.module.css';

/**
 * CategoryTabs — Auto-derives categories from template data.
 * Adding a new category in templates.js auto-creates a new tab.
 */
export default function CategoryTabs({ activeCategory, onCategoryChange }: any) {
  const categories = getActiveCategories();
  const counts = getCategoryCounts();
  const { t } = useLanguage();

  return (
    <div className={styles.tabs} role="tablist" aria-label="Template categories">
      {categories.map(cat => (
        <button
          key={cat.id}
          className={`${styles.tab} ${activeCategory === cat.id ? styles.tabActive : ''}`}
          onClick={() => onCategoryChange(cat.id)}
          role="tab"
          aria-selected={activeCategory === cat.id}
        >
          <span>{cat.emoji}</span>
          <span>{t(cat.labelKey as any)}</span>
          <span className={styles.count}>{counts[cat.id] || 0}</span>
        </button>
      ))}
    </div>
  );
}
