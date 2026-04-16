'use client';

import { Suspense } from 'react';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import CategoryTabs from '@/components/CategoryTabs/CategoryTabs';
import SearchBar from '@/components/SearchBar/SearchBar';
import { TEMPLATES, searchTemplates } from '@/data/templates';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './templates.module.css';

function TemplatesContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('recommended');

  const handleSearch = useCallback((query: any) => {
    setSearch(query);
  }, []);

  const handleCategoryChange = useCallback((cat: any) => {
    setCategory(cat);
  }, []);

  const filteredTemplates = useMemo(() => {
    let result = TEMPLATES.filter(t => !t.isTool);

    if (search) {
      // Re-implement search locally or filter the returned result
      const q = search.toLowerCase().trim();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.nameVi.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    if (category !== 'all') {
      result = result.filter(t => t.category === category);
    }

    if (tier !== 'all') {
      result = result.filter(t => t.tier === tier);
    }

    if (sort === 'alphabetical') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'difficulty') {
      result = [...result].sort((a, b) => a.difficulty - b.difficulty);
    }

    return result;
  }, [search, category, tier, sort]);

  return (
    <>
      <div className={styles.stickyToolbar}>
        <div className={styles.stickyToolbarInner}>
          <div className={styles.toolbarSearch}>
            <SearchBar onSearch={handleSearch} placeholder={t('templates.search')} />
          </div>



          <div className={styles.toolbarFilters}>
            <CustomSelect
              value={tier}
              onChange={setTier}
              options={[
                { value: 'all', label: t('templates.tier.all') },
                { value: 'basic', label: 'Basic' },
                { value: 'plus', label: 'Plus' },
                { value: 'pro', label: 'Pro' },
                { value: 'ultra', label: 'Ultra' }
              ]}
            />
          </div>
        </div>
      </div>

      <p className={styles.resultCount}>
        {t('templates.show')} {filteredTemplates.length} / {TEMPLATES.filter(temp => !temp.isTool).length} templates
      </p>

      {filteredTemplates.length > 0 ? (
        <div className={styles.grid}>
          {filteredTemplates.map((template, i) => (
            <TemplateCard key={template.id} template={template} index={i} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyEmoji}></span>
          <p className={styles.emptyText}>{t('templates.empty')}</p>
        </div>
      )}
    </>
  );
}

export default function TemplatesPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>}>
          <TemplatesContent />
        </Suspense>
      </div>
    </div>
  );
}

function CustomSelect({ value, onChange, options }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value) || options[0];

  return (
    <div className={styles.customSelectContainer} ref={containerRef}>
      <button 
        type="button" 
        className={`${styles.customSelectBtn} ${isOpen ? styles.customSelectBtnActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.customSelectLabel}>{selectedOption.label}</span>
        <span className={styles.customSelectChevron} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={styles.customSelectDropdown}>
          {options.map((opt: any) => (
            <button
              key={opt.value}
              className={`${styles.customSelectOption} ${value === opt.value ? styles.customSelectOptionActive : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
              {value === opt.value && (
                <span className={styles.checkIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
