import { useRef, useLayoutEffect, useEffect } from 'react';
import styles from './MCQEditor.module.css';

const OPTION_THEMES = [
  { icon: 'A', className: 'optA', label: 'A' },
  { icon: 'B', className: 'optB', label: 'B' },
  { icon: 'C', className: 'optC', label: 'C' },
  { icon: 'D', className: 'optD', label: 'D' },
];

function AutoScalingTextarea({ value, onChange, defaultSize, minSize, className, placeholder, rows }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Reset to max size to measure scroll height
    el.style.fontSize = `${defaultSize}px`;
    
    // Shrink if needed
    let currentSize = defaultSize;
    while (el.scrollHeight > el.clientHeight && currentSize > minSize) {
      currentSize--;
      el.style.fontSize = `${currentSize}px`;
    }
  }, [value, defaultSize, minSize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

export default function MCQEditor({ item, onChange }) {
  if (!item) return null;

  const updateQuestion = (e) => {
    onChange({ ...item, question: e.target.value });
  };

  const updateOption = (index, value) => {
    const newOptions = [...item.options];
    newOptions[index] = value;
    onChange({ ...item, options: newOptions });
  };

  // Track which options have content for visual feedback
  const filledCount = item.options.filter(o => o && o.trim()).length;

  return (
    <div className={`${styles.editor} stack w-full`}>
      
      {/* ── QUESTION HERO ── */}
      <div className={styles.questionCard}>
        <AutoScalingTextarea
          className={styles.questionInput}
          placeholder="Nhập câu hỏi của bạn tại đây..."
          value={item.question || ''}
          onChange={updateQuestion}
          defaultSize={26}
          minSize={14}
          rows={5}
        />
      </div>

      {/* ── ANSWER CARDS GRID ── */}
      <div className="stack w-full">
        <div className={styles.answersLabel}>
          <span>🎯 CÁC ĐÁP ÁN</span>
          <span className={styles.answersProgress}>
            <span className={styles.progressDot} data-filled={filledCount >= 1}></span>
            <span className={styles.progressDot} data-filled={filledCount >= 2}></span>
            <span className={styles.progressDotOpt} data-filled={filledCount >= 3}></span>
            <span className={styles.progressDotOpt} data-filled={filledCount >= 4}></span>
            <span className={styles.progressText}>{filledCount}/4</span>
          </span>
        </div>

        <div className="grid-auto w-full">
          {OPTION_THEMES.map((theme, idx) => {
            const isCorrect = idx === 0;
            const isOptional = idx >= 2;
            return (
              <div 
                key={idx} 
                className={`${styles.optionCard} ${styles[theme.className]} ${isCorrect ? styles.correctCard : ''}`}
              >
                {/* Color strip left side */}
                <div className={styles.optionStrip}>
                  <span className={styles.optionShape}>{theme.icon}</span>
                </div>

                {/* Content */}
                <div className={styles.optionContent}>
                  <div className={styles.optionMeta}>
                    {isCorrect && <span className={styles.correctBadge}>✓ Đáp án đúng</span>}
                    {isOptional && <span className={styles.optionalBadge}>Tùy chọn</span>}
                  </div>
                  <AutoScalingTextarea
                    className={styles.optionInput}
                    placeholder={isCorrect ? 'Nhập đáp án đúng...' : `Đáp án ${theme.label}...`}
                    value={item.options[idx] || ''}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    defaultSize={16}
                    minSize={12}
                    rows={3}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
