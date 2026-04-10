'use client';

import { Suspense } from 'react';
import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import TemplateCard from '@/components/TemplateCard/TemplateCard';
import CategoryTabs from '@/components/CategoryTabs/CategoryTabs';
import SearchBar from '@/components/SearchBar/SearchBar';
import { TEMPLATES, searchTemplates } from '@/data/templates';
import styles from './templates.module.css';

function TemplatesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('recommended');

  const handleSearch = useCallback((query) => {
    setSearch(query);
  }, []);

  const handleCategoryChange = useCallback((cat) => {
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
      <div className={styles.controls}>
        <SearchBar onSearch={handleSearch} placeholder="🔍 Tìm template..." />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.tierToggle}>
            {['all', 'standard', 'pro'].map(t => (
              <button
                key={t}
                className={`${styles.tierBtn} ${tier === t ? styles.tierBtnActive : ''}`}
                onClick={() => setTier(t)}
              >
                {t === 'all' ? '🎮 Tất cả' : t === 'standard' ? '📦 Standard' : '👑 Pro'}
              </button>
            ))}
          </div>

          <select
            className={styles.sortSelect}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">📌 Đề xuất</option>
            <option value="alphabetical">🔤 A-Z</option>
            <option value="difficulty">⭐ Độ khó</option>
          </select>
        </div>
      </div>

      <CategoryTabs activeCategory={category} onCategoryChange={handleCategoryChange} />

      <p className={styles.resultCount}>
        Hiển thị {filteredTemplates.length} / {TEMPLATES.filter(t => !t.isTool).length} templates
      </p>

      {filteredTemplates.length > 0 ? (
        <div className={styles.grid}>
          {filteredTemplates.map((template, i) => (
            <TemplateCard key={template.id} template={template} index={i} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyEmoji}>🔍</span>
          <p className={styles.emptyText}>Không tìm thấy template nào</p>
        </div>
      )}
    </>
  );
}

export default function TemplatesPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>🎮 Tất cả Templates</h1>
          <p className={styles.subtitle}>Chọn template để tạo hoạt động tương tác cho lớp học</p>
        </div>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</div>}>
          <TemplatesContent />
        </Suspense>
      </div>
    </div>
  );
}
