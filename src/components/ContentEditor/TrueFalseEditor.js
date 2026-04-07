'use client';

import styles from './TrueFalseEditor.module.css';

/**
 * TrueFalseEditor — Editor for True/False statements.
 * Each item is a statement + whether it's true or false.
 */
export default function TrueFalseEditor({ item, onChange }) {
  if (!item) return null;

  const isTrue = (item.options?.[0] || '').toLowerCase() === 'đúng' || (item.options?.[0] || '').toLowerCase() === 'true';

  const updateQuestion = (value) => {
    onChange({ ...item, question: value });
  };

  const updateOption = (index, value) => {
    const newOptions = [...(item.options || ['', '', '', ''])];
    newOptions[index] = value;
    onChange({ ...item, options: newOptions });
  };

  const options = item.options || ['', '', '', ''];

  return (
    <div className={styles.editor}>
      <div className={styles.statementGroup}>
        <label className={styles.label}>📝 Phát biểu / Câu hỏi</label>
        <textarea
          className={styles.textarea}
          placeholder="VD: Trái đất quay quanh mặt trời."
          value={item.question || ''}
          onChange={(e) => updateQuestion(e.target.value)}
          rows={3}
          autoFocus
        />
      </div>

      <div className={styles.answerGroup}>
        <label className={styles.label}>✓✗ Các lựa chọn đáp án (tự động đảo vị trí khi chơi):</label>
        <div className={styles.optionsList}>
          <div className={styles.optionItem}>
            <div className={`${styles.optionIndicator} ${styles.indicatorCorrect}`}>✓ Đúng</div>
            <input
              type="text"
              className={`${styles.input} ${styles.inputCorrect}`}
              placeholder="Nhập đáp án đúng..."
              value={options[0]}
              onChange={(e) => updateOption(0, e.target.value)}
            />
          </div>
          <div className={styles.optionItem}>
            <div className={`${styles.optionIndicator} ${styles.indicatorWrong}`}>✗ Sai</div>
            <input
              type="text"
              className={styles.input}
              placeholder="Nhập đáp án sai 1..."
              value={options[1]}
              onChange={(e) => updateOption(1, e.target.value)}
            />
          </div>
          <div className={styles.optionItem}>
            <div className={`${styles.optionIndicator} ${styles.indicatorWrong}`}>✗ Sai</div>
            <input
              type="text"
              className={styles.input}
              placeholder="Nhập đáp án sai 2 (tùy chọn)..."
              value={options[2]}
              onChange={(e) => updateOption(2, e.target.value)}
            />
          </div>
          <div className={styles.optionItem}>
            <div className={`${styles.optionIndicator} ${styles.indicatorWrong}`}>✗ Sai</div>
            <input
              type="text"
              className={styles.input}
              placeholder="Nhập đáp án sai 3 (tùy chọn)..."
              value={options[3]}
              onChange={(e) => updateOption(3, e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.tip}>
        💡 Mặc định là Đúng/Sai. Bạn có thể thay đổi thành Yes/No, Fact/Cap, hoặc thêm đến 4 đáp án để tăng độ khó!
      </div>
    </div>
  );
}
