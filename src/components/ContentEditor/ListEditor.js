'use client';

import styles from './ListEditor.module.css';

/**
 * ListEditor — Simple list item editor for Wheel/Box templates.
 * Each item has a text field (term) and optional description.
 */
export default function ListEditor({ item, onChange }) {
  if (!item) return null;

  const updateField = (field, value) => {
    onChange({ ...item, [field]: value });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.mainInput}>
        <label className={styles.label}>📝 Nội dung mục</label>
        <input
          type="text"
          className={styles.input}
          placeholder="VD: Nguyễn Văn A, Câu hỏi 1, Phần thưởng..."
          value={item.term || ''}
          onChange={(e) => updateField('term', e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.subInput}>
        <label className={styles.label}>💬 Mô tả thêm <span className={styles.optional}>(tùy chọn)</span></label>
        <input
          type="text"
          className={styles.inputSub}
          placeholder="Mô tả, ghi chú, hoặc để trống"
          value={item.definition || ''}
          onChange={(e) => updateField('definition', e.target.value)}
        />
      </div>

      <div className={styles.tip}>
        💡 Mỗi mục sẽ là 1 ô trên vòng quay hoặc 1 hộp. Thêm càng nhiều mục càng vui!
      </div>
    </div>
  );
}
