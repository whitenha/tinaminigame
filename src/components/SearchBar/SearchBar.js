'use client';

import { useState, useCallback } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar({ onSearch, placeholder = 'Tìm template...' }) {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setValue(val);
    onSearch(val);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>🔍</span>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search templates"
      />
      {value && (
        <button className={styles.clear} onClick={handleClear} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  );
}
