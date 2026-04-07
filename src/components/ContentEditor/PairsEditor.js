import styles from './PairsEditor.module.css';

export default function PairsEditor({ item, onChange }) {
  if (!item) return null;

  const updateTerm = (e) => {
    onChange({ ...item, term: e.target.value });
  };

  const updateDefinition = (e) => {
    onChange({ ...item, definition: e.target.value });
  };

  return (
    <div className={styles.singleEditor}>
      
      {/* 1. Hero Term Area (Left Side of Card) */}
      <div className={styles.heroTermBox}>
        <div className={styles.boxLabel}>A. Thẻ Bên Trái (Từ vựng/Khái niệm)</div>
        <textarea
          className={styles.termInput}
          placeholder="Nhập khái niệm, từ vựng hoặc vế trước..."
          value={item.term || ''}
          onChange={updateTerm}
          rows={3}
        />
      </div>

      <div className={styles.connectionIcon}>
        🔗 Liệt kết với
      </div>

      {/* 2. Definition Area (Right Side of Card) */}
      <div className={styles.definitionBox}>
        <div className={styles.boxLabel}>B. Thẻ Bên Phải (Định nghĩa/Kết quả)</div>
        <textarea
          className={styles.definitionInput}
          placeholder="Nhập định nghĩa, lời giải hoặc vế sau..."
          value={item.definition || ''}
          onChange={updateDefinition}
          rows={3}
        />
      </div>
      
    </div>
  );
}
