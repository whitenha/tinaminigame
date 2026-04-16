import { useRef, useEffect } from 'react';
import styles from './TypeAnswerEditor.module.css';

function AutoScalingTextarea({ value, onChange, defaultSize, minSize, className, placeholder, rows }: any) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = `${defaultSize}px`;
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

export default function TypeAnswerEditor({ item, onChange }: any) {
  if (!item) return null;

  useEffect(() => {
    if (!item.options) return;
    const opts = item.options;
    // Auto-trim if there are multiple consecutive empty options at the end
    // Keep exactly 1 empty option at the end if the user hasn't filled them out.
    if (opts.length > 2 && opts[opts.length - 1] === '' && opts[opts.length - 2] === '') {
      let keepCount = opts.length;
      while (keepCount > 2 && opts[keepCount - 1] === '' && opts[keepCount - 2] === '') {
        keepCount--;
      }
      onChange({ ...item, options: opts.slice(0, keepCount) });
    }
  }, [item.options]);

  const updateQuestion = (e: any) => {
    onChange({ ...item, question: (e.target as any).value });
  };

  const updateCorrectAnswer = (e: any) => {
    const newOptions = [...(item.options || ['', ''])];
    newOptions[0] = (e.target as any).value;
    onChange({ ...item, options: newOptions });
  };

  const correctAnswer = item.options?.[0] || '';
  // Ensure we at least show one alt answer line if list is shorter than 2
  const altAnswers = (item.options?.length > 1 ? item.options : ['', '']).slice(1);

  const updateAltAnswer = (index: any, value: any) => {
    const newOptions = [...(item.options || ['', ''])];
    newOptions[index + 1] = value;
    onChange({ ...item, options: newOptions });
  };

  const addAltAnswer = () => {
    const newOptions = [...(item.options || ['', ''])];
    // Only push if the last option isn't already empty (prevents spamming blank lines)
    if (newOptions[newOptions.length - 1] !== '') {
      newOptions.push('');
      onChange({ ...item, options: newOptions });
    }
  };

  const removeAltAnswer = (index: any) => {
    const newOptions = [...(item.options || ['', ''])];
    newOptions.splice(index + 1, 1);
    // If they delete all alt answers, automatically provide 1 empty one
    if (newOptions.length === 1) {
      newOptions.push('');
    }
    onChange({ ...item, options: newOptions });
  };

  const altCount = altAnswers.filter((a: any) => a && a.trim()).length;

  return (
    <div className={styles.editor}>

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

      {/* ── CORRECT ANSWER ── */}
      <div className={styles.answersSection}>
        <div className={styles.sectionLabel}>
          <span>✅ ĐÁP ÁN ĐÚNG</span>
        </div>
        <div className={styles.correctCard}>
          <div className={styles.correctStrip}>
            <span className={styles.correctIcon}>✓</span>
          </div>
          <div className={styles.correctContent}>
            <span className={styles.correctBadge}>Câu trả lời chính xác</span>
            <input
              className={styles.correctInput}
              placeholder="Nhập đáp án đúng..."
              value={correctAnswer}
              onChange={updateCorrectAnswer}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* ── ALTERNATIVE ANSWERS ── */}
      <div className={styles.altSection}>
        <div className={styles.sectionLabel}>
          <span>📝 CÁC CÂU TRẢ LỜI CHẤP NHẬN ĐƯỢC</span>
          <span className={styles.altCount}>{altCount} thêm</span>
        </div>
        <p className={styles.altHint}>
          Thêm các cách viết / đáp án khác mà bạn cũng chấp nhận là đúng.
        </p>

        <div className={styles.altList}>
          {altAnswers.map((ans: any, idx: any) => (
            <div key={idx} className={styles.altRow}>
              <span className={styles.altNum}>{idx + 1}</span>
              <input
                className={styles.altInput}
                placeholder={`Đáp án thay thế ${idx + 1}...`}
                value={ans || ''}
                onChange={(e) => updateAltAnswer(idx, (e.target as any).value)}
                spellCheck={false}
              />
              <button
                className={styles.altRemoveBtn}
                onClick={() => removeAltAnswer(idx)}
                title="Xóa"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button className={styles.addAltBtn} onClick={addAltAnswer}>
          + Thêm câu trả lời
        </button>
      </div>
    </div>
  );
}
