import { useRef, useLayoutEffect, useEffect } from 'react';
import styles from './MCQEditor.module.css';

const OPTION_THEMES = [
  { icon: 'A', className: 'optA', label: 'A' },
  { icon: 'B', className: 'optB', label: 'B' },
  { icon: 'C', className: 'optC', label: 'C' },
  { icon: 'D', className: 'optD', label: 'D' },
];

function AutoScalingTextarea({ value, onChange, defaultSize, minSize, className, placeholder, rows, alignH, alignV }: any) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Reset padding to measure properly
    el.style.paddingTop = '';
    
    // Reset to max size to measure scroll height
    el.style.fontSize = `${defaultSize}px`;
    
    // Shrink if needed (if container restricts height)
    let currentSize = defaultSize;
    while (el.scrollHeight > el.clientHeight && currentSize > minSize) {
      currentSize--;
      el.style.fontSize = `${currentSize}px`;
    }
    
    // Handle vertical alignment AFTER font has settled
    if (alignV === 'center') {
      const basePadding = parseFloat(getComputedStyle(el).paddingTop) || 0;
      
      // Compute actual text block height by temporarily ignoring CSS height limits
      const originalMinHeight = el.style.minHeight;
      const originalHeight = el.style.height;
      
      el.style.minHeight = '0px';
      el.style.height = '0px';
      const textHeight = el.scrollHeight;
      
      // Restore CSS limits
      el.style.minHeight = originalMinHeight;
      el.style.height = originalHeight;
      
      // Now get the actual layout height (which depends on CSS min-height or height: 100%)
      const layoutHeight = el.clientHeight;
      const remaining = layoutHeight - textHeight;
      
      if (remaining > 0) {
         el.style.paddingTop = `${basePadding + remaining / 2}px`;
      }
    }
  }, [value, defaultSize, minSize, alignV]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      rows={rows}
      style={{ textAlign: alignH === 'center' ? 'center' : 'left' }}
      spellCheck={false}
    />
  );
}

export default function MCQEditor({ item, onChange }: any) {
  if (!item) return null;

  const updateQuestion = (e: any) => {
    onChange({ ...item, question: (e.target as any).value });
  };

  const updateOption = (index: any, value: any) => {
    const newOptions = [...item.options];
    newOptions[index] = value;
    onChange({ ...item, options: newOptions });
  };

  // Track which options have content for visual feedback
  const filledCount = item.options.filter((o: any) => o && o.trim()).length;

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
          alignH={item.questionAlignH || 'left'}
          alignV={item.questionAlignV || 'top'}
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

        <div className={styles.optionsGridContainer}>
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
                    onChange={(e: any) => updateOption(idx, (e.target as any).value)}
                    defaultSize={16}
                    minSize={12}
                    rows={3}
                    alignH={item.answerAlignH || 'left'}
                    alignV={item.answerAlignV || 'top'}
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
