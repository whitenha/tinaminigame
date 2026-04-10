'use client';

import React from 'react';
import styles from './PairsGroupEditor.module.css';

/**
 * PairsGroupEditor — Editor for Match Up and Matching Pairs
 * Allows adding multiple pairs into one slide (round).
 */
export default function PairsGroupEditor({ item, onChange }) {
  if (!item) return null;

  // Initialize pairs if missing (backwards compatibility)
  const pairs = item.pairs || [];

  const updatePair = (index, field, value) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange({ ...item, pairs: newPairs });
  };

  const addPair = () => {
    onChange({ ...item, pairs: [...pairs, { term: '', definition: '' }] });
  };

  const removePair = (index) => {
    if (pairs.length <= 1) {
      alert("Cần ít nhất 1 cặp để tạo vòng chơi!");
      return;
    }
    const newPairs = pairs.filter((_, i) => i !== index);
    onChange({ ...item, pairs: newPairs });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <div className={styles.label}>Nội dung Vòng chơi này:</div>
        <button className={styles.addBtn} onClick={addPair}>+ Thêm Cặp</button>
      </div>

      <div className={styles.pairsList}>
        {pairs.map((pair, idx) => (
          <div key={idx} className={styles.pairRow}>
            <div className={styles.indexNum}>{idx + 1}</div>
            
            <div className={styles.inputGroup}>
              <label>A. Thẻ bên trái (Từ vựng/Khái niệm)</label>
              <textarea
                className={styles.input}
                placeholder="Ví dụ: Hello"
                value={pair.term || ''}
                onChange={(e) => updatePair(idx, 'term', e.target.value)}
                rows={2}
              />
            </div>

            <div className={styles.linkIcon}>🔗</div>

            <div className={styles.inputGroup}>
              <label>B. Thẻ bên phải (Định nghĩa/Kết quả)</label>
              <textarea
                className={styles.input}
                placeholder="Ví dụ: Xin chào"
                value={pair.definition || ''}
                onChange={(e) => updatePair(idx, 'definition', e.target.value)}
                rows={2}
              />
            </div>

            <button className={styles.delBtn} onClick={() => removePair(idx)} title="Xóa cặp này">
              🗑️
            </button>
          </div>
        ))}
      </div>
      
      {pairs.length === 0 && (
         <div style={{textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.5)'}}>
            Nhấn Thêm Cặp bên trên để bắt đầu tạo nội dung.
         </div>
      )}
    </div>
  );
}
