import { useRef, useLayoutEffect, useEffect } from 'react';
import styles from './GroupEditor.module.css';

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

export default function GroupEditor({ item, onChange }: any) {
  if (!item) return null;

  // Initialize options safely to support 4 correct + 2 wrong
  const options = Array.isArray(item.options) ? [...item.options] : [];
  while (options.length < 6) options.push('');

  const updateTerm = (e: any) => {
    onChange({ ...item, term: (e.target as any).value });
  };

  const updateOption = (index: any, value: any) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange({ ...item, options: newOptions });
  };

  return (
    <div className={styles.editor}>
      
      {/* ── COLUMN NAME ── */}
      <div className={styles.termCard}>
        <div className={styles.cardHeader}>TÊN NHÓM CỘT</div>
        <AutoScalingTextarea
          className={styles.termInput}
          placeholder="Nhập tên nhóm (VD: Động vật, Thực vật...)"
          value={item.term || ''}
          onChange={updateTerm}
          defaultSize={26}
          minSize={14}
          rows={3}
        />
      </div>

      <div className={styles.optionsWrap}>
        {/* ── CORRECT ANSWERS (0-3) ── */}
        <div className={styles.correctSection}>
          <div className={styles.sectionHeader}>✅ Các thẻ thuộc nhóm này (Đúng)</div>
          <div className={styles.optionsGrid}>
            {[0, 1, 2, 3].map(idx => (
              <div key={`correct-${idx}`} className={styles.optionCardCorrect}>
                <AutoScalingTextarea
                  className={styles.optionInput}
                  placeholder={`Nhập thẻ đúng ${idx + 1}`}
                  value={options[idx] || ''}
                  onChange={(e: any) => updateOption(idx, (e.target as any).value)}
                  defaultSize={16}
                  minSize={12}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── WRONG ANSWERS (4-5) ── */}
        <div className={styles.wrongSection}>
          <div className={styles.sectionHeader}>❌ Thẻ gây nhiễu (Sai)</div>
          <p className={styles.subtext}>Những thẻ này sẽ nhảy vào bộ trộn nhưng KHÔNG nằm trong cột này.</p>
          <div className={styles.optionsGrid}>
            {[4, 5].map(idx => (
              <div key={`wrong-${idx}`} className={styles.optionCardWrong}>
                <AutoScalingTextarea
                  className={styles.optionInput}
                  placeholder={`Nhập thẻ sai ${idx - 3}`}
                  value={options[idx] || ''}
                  onChange={(e: any) => updateOption(idx, (e.target as any).value)}
                  defaultSize={16}
                  minSize={12}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
