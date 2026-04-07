import { useRef, useEffect } from 'react';
import styles from './GroupMultiColumnEditor.module.css';

function AutoScalingTextarea({ id, value, onChange, onKeyDown, defaultSize, className, placeholder, rows }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto'; // Reset to calculate new height
    el.style.height = `${el.scrollHeight}px`; // Auto expand height
  }, [value]);

  return (
    <textarea
      id={id}
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      placeholder={placeholder}
      rows={rows}
      style={{ fontSize: `${defaultSize}px`, overflow: 'hidden' }}
    />
  );
}

export default function GroupMultiColumnEditor({ items, onChange }) {
  if (!items) return null;

  // Add column
  const addColumn = () => {
    if (items.length >= 8) return;
    const newItems = [...items, { 
      term: '', 
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: true },
        { text: '', isCorrect: true },
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      image_url: null 
    }];
    onChange(newItems);
  };

  // Remove column
  const removeColumn = (idx) => {
    if (items.length <= 1) {
      alert("Phải có ít nhất 1 nhóm!");
      return;
    }
    const newItems = items.filter((_, i) => i !== idx);
    onChange(newItems);
  };

  // Update column term
  const updateTerm = (colIdx, val) => {
    const newItems = [...items];
    newItems[colIdx] = { ...newItems[colIdx], term: val };
    onChange(newItems);
  };

  // Ensure options array format (migration from old flat string array if needed)
  const getNormalizedOptions = (colIdx) => {
    const it = items[colIdx];
    let opts = it.options || [];
    
    // If it's old flat format (array of strings)
    if (opts.length > 0 && typeof opts[0] === 'string') {
      const formatted = opts.map((txt, i) => ({
        text: txt,
        isCorrect: i < 4 // Assume first 4 are correct in old format
      }));
      // Pad to 6
      while (formatted.length < 6) {
        formatted.push({ text: '', isCorrect: formatted.length < 4 });
      }
      return formatted;
    }
    
    // If empty or already objects, make sure we have at least 4 correct, 2 wrong if brand new
    if (opts.length === 0) {
      return [
        { text: '', isCorrect: true }, { text: '', isCorrect: true },
        { text: '', isCorrect: true }, { text: '', isCorrect: true },
        { text: '', isCorrect: false }, { text: '', isCorrect: false }
      ];
    }
    return opts;
  };

  const updateOptionText = (colIdx, optIdx, val) => {
    const newItems = [...items];
    const opts = getNormalizedOptions(colIdx);
    opts[optIdx] = { ...opts[optIdx], text: val };
    newItems[colIdx] = { ...newItems[colIdx], options: opts };
    onChange(newItems);
  };

  const addOption = (colIdx, isCorrect) => {
    const newItems = [...items];
    const opts = getNormalizedOptions(colIdx);
    opts.push({ text: '', isCorrect });
    newItems[colIdx] = { ...newItems[colIdx], options: opts };
    onChange(newItems);
  };

  const removeOption = (colIdx, optIdx) => {
    const newItems = [...items];
    const opts = getNormalizedOptions(colIdx);
    opts.splice(optIdx, 1);
    newItems[colIdx] = { ...newItems[colIdx], options: opts };
    onChange(newItems);
  };

  const handleOptionKeyDown = (e, colIdx, currentOptIdx, isCorrect) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const opts = getNormalizedOptions(colIdx);
      
      let nextOptIdx = -1;
      for (let i = currentOptIdx + 1; i < opts.length; i++) {
         if (opts[i].isCorrect === isCorrect) {
            nextOptIdx = i;
            break;
         }
      }

      if (nextOptIdx !== -1) {
         const el = document.getElementById(`input-${colIdx}-${nextOptIdx}`);
         if (el) el.focus();
      } else {
         addOption(colIdx, isCorrect);
         const newOptIdx = opts.length;
         setTimeout(() => {
            const el = document.getElementById(`input-${colIdx}-${newOptIdx}`);
            if (el) el.focus();
         }, 50);
      }
    }
  };

  return (
    <div className={styles.boardContainer}>
      <div className={styles.boardScroll}>
        {items.map((col, colIdx) => {
          const opts = getNormalizedOptions(colIdx);
          const correctOpts = opts.filter(o => o.isCorrect);
          const wrongOpts = opts.filter(o => !o.isCorrect);

          return (
            <div key={colIdx} className={styles.columnCard}>
              {/* COLUMN HEADER */}
              <div className={styles.columnHeader}>
                <AutoScalingTextarea
                  className={styles.termInput}
                  placeholder="Nhập tên nhóm..."
                  value={col.term || ''}
                  onChange={(e) => updateTerm(colIdx, e.target.value)}
                  defaultSize={16}
                  rows={1}
                />
                <button className={styles.deleteColBtn} onClick={() => removeColumn(colIdx)} title="Xoá cột">🗑️</button>
              </div>

              {/* COLUMN CONTENT (Scrollable vertically) */}
              <div className={styles.columnBody}>
                
                {/* CORRECT SECTION */}
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitle}>
                    <span className={styles.iconCorrect}>✓</span> Đáp án đúng
                  </div>
                  <button className={styles.addOptBtn} onClick={() => addOption(colIdx, true)} title="Thêm Đáp Án Đúng">+</button>
                </div>
                
                <div className={styles.optionsList}>
                  {opts.map((opt, optIdx) => {
                    if (!opt.isCorrect) return null;
                    return (
                      <div key={`opt-${optIdx}`} className={`${styles.optionItem} ${styles.optItemCorrect}`}>
                         <AutoScalingTextarea
                            id={`input-${colIdx}-${optIdx}`}
                            className={styles.optionInput}
                            placeholder="Nhập từ đúng..."
                            value={opt.text}
                            onChange={(e) => updateOptionText(colIdx, optIdx, e.target.value)}
                            onKeyDown={(e) => handleOptionKeyDown(e, colIdx, optIdx, true)}
                            defaultSize={14}
                            rows={1}
                         />
                         <button className={styles.delOptBtn} onClick={() => removeOption(colIdx, optIdx)}>✕</button>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.sectionDivider}></div>

                {/* WRONG SECTION (DISTRACTORS) */}
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitle}>
                    <span className={styles.iconWrong}>✕</span> Thẻ lừa (Sai)
                  </div>
                  <button className={styles.addOptBtn} onClick={() => addOption(colIdx, false)} title="Thêm Thẻ Sai">+</button>
                </div>
                
                <div className={styles.optionsList}>
                  {opts.map((opt, optIdx) => {
                    if (opt.isCorrect) return null;
                    return (
                      <div key={`opt-${optIdx}`} className={`${styles.optionItem} ${styles.optItemWrong}`}>
                         <AutoScalingTextarea
                            id={`input-${colIdx}-${optIdx}`}
                            className={styles.optionInput}
                            placeholder="Nhập từ sai..."
                            value={opt.text}
                            onChange={(e) => updateOptionText(colIdx, optIdx, e.target.value)}
                            onKeyDown={(e) => handleOptionKeyDown(e, colIdx, optIdx, false)}
                            defaultSize={14}
                            rows={1}
                         />
                         <button className={styles.delOptBtn} onClick={() => removeOption(colIdx, optIdx)}>✕</button>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          );
        })}

        {/* ADD COLUMN BUTTON */}
        {items.length < 8 && (
          <button className={styles.addColumnBtn} onClick={addColumn}>
            <div className={styles.addIcon}>+</div>
            <div>Thêm nhóm ({items.length}/8)</div>
          </button>
        )}
      </div>
    </div>
  );
}
