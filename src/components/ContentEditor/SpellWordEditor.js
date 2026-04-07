'use client';

import styles from './ListEditor.module.css';

/**
 * SpellWordEditor — Word + Definition editor for Spell the Word.
 * Looks like Unjumble (ListEditor style) but with labels for vocab spelling.
 * Term = the word to spell, Definition = the hint/meaning shown during gameplay.
 */
export default function SpellWordEditor({ item, onChange }) {
  if (!item) return null;

  const updateField = (field, value) => {
    onChange({ ...item, [field]: value });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.mainInput}>
        <label className={styles.label}>🔤 Từ vựng cần đánh vần</label>
        <input
          type="text"
          className={styles.input}
          placeholder="VD: beautiful, environment, knowledge..."
          value={item.term || ''}
          onChange={(e) => updateField('term', e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.subInput}>
        <label className={styles.label}>💡 Nghĩa / Gợi ý <span className={styles.optional}>(hiện cho học sinh khi chơi)</span></label>
        <input
          type="text"
          className={styles.inputSub}
          placeholder="VD: xinh đẹp, môi trường, kiến thức..."
          value={item.definition || ''}
          onChange={(e) => updateField('definition', e.target.value)}
        />
      </div>

      <div className={styles.tip}>
        ✨ Học sinh sẽ xem từ vựng trong vài giây, sau đó phải đánh vần lại từ trí nhớ. Thêm nghĩa/gợi ý để giúp các em nhớ tốt hơn!
      </div>
    </div>
  );
}
