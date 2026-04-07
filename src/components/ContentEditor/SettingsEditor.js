'use client';

import { useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import styles from './SettingsEditor.module.css';

export default function SettingsEditor({ 
  title, setTitle, 
  coverImage, setCoverImage, 
  applyTimeToAll,
  readQuestion, setReadQuestion,
  readOptions, setReadOptions
}) {
  const [globalTime, setGlobalTime] = useState(20);
  return (
    <div className={styles.editor}>

      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon}>🎮</div>
          <h2 className={styles.heroTitle}>Thiết lập Trò Chơi</h2>
          <p className={styles.heroSubtitle}>Chọn tên hấp dẫn và ảnh bìa bắt mắt để thu hút học sinh!</p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className={styles.cardsGrid}>

        {/* Card 1: Title */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>✏️</span>
            <div>
              <h3 className={styles.cardTitle}>Tên Trò Chơi</h3>
              <p className={styles.cardSubtitle}>Bắt buộc • Hiển thị trên trang chủ</p>
            </div>
          </div>

          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.titleInput}
              placeholder="VD: Ôn tập Từ vựng Tiếng Anh Unit 1..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
            <span className={styles.charCount}>{title.length}/80</span>
          </div>
          <p className={styles.hint}>💡 Mẹo: Tên game ngắn gọn, hấp dẫn sẽ giúp học sinh dễ tìm kiếm và thích thú hơn!</p>
        </div>

        {/* Card 2: Cover Image */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🖼️</span>
            <div>
              <h3 className={styles.cardTitle}>Ảnh Bìa</h3>
              <p className={styles.cardSubtitle}>Tùy chọn • Kích thước khuyến nghị 16:9</p>
            </div>
          </div>
          
          <div className={styles.coverZone}>
            {coverImage ? (
              <div className={styles.coverPreview}>
                <img src={coverImage} alt="Cover" className={styles.coverImage} />
                <div className={styles.coverOverlay}>
                  <CldUploadWidget 
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'tina_minigame'}
                    options={{ cropping: true, showSkipCropButton: false, multiple: false }}
                    onSuccess={(result) => {
                      if (result.info && result.info.secure_url) {
                        setCoverImage(result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button className={styles.coverAction} onClick={() => open()}>🔄 Đổi ảnh</button>
                    )}
                  </CldUploadWidget>
                  <button 
                    className={`${styles.coverAction} ${styles.coverActionDanger}`}
                    onClick={() => setCoverImage(null)}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.coverEmpty}>
                <div className={styles.coverEmptyIcon}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="4" y="8" width="40" height="32" rx="6" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3"/>
                    <circle cx="16" cy="20" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M4 32l12-10 8 6 8-6 12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className={styles.coverEmptyText}>Kéo thả ảnh vào đây hoặc</p>
                
                <CldUploadWidget 
                  uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'tina_minigame'}
                  options={{ cropping: true, showSkipCropButton: false, multiple: false }}
                  onSuccess={(result) => {
                    if (result.info && result.info.secure_url) {
                      setCoverImage(result.info.secure_url);
                    }
                  }}
                >
                  {({ open }) => (
                    <button className={styles.uploadBtn} onClick={() => open()}>
                      📁 Chọn ảnh từ máy
                    </button>
                  )}
                </CldUploadWidget>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Settings Cards Row 2 */}
      <div className={styles.cardsGrid} style={{ marginTop: '24px' }}>
        
        {/* Card 3: Global Time Setting */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>⏱️</span>
            <div>
              <h3 className={styles.cardTitle}>Thời Gian Đếm Ngược Mặc Định</h3>
              <p className={styles.cardSubtitle}>Áp dụng nhanh một mức thời gian cho TẤT CẢ các câu hỏi.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', margin: '16px 0' }}>
            {[10, 20, 30, 45, 60].map(t => (
              <button 
                key={t}
                className={`${styles.timeBtn} ${globalTime === t ? styles.timeActive : ''}`}
                onClick={() => setGlobalTime(t)}
              >
                {t} giây
              </button>
            ))}
          </div>
          
          <button 
            className={styles.applyAllBtn}
            onClick={() => {
              if (applyTimeToAll) applyTimeToAll(globalTime);
            }}
          >
            ✓ Cập nhật cho tất cả câu hỏi
          </button>
          <p className={styles.hint} style={{ marginTop: '12px' }}>
            💡 Mẹo: Bạn vẫn có thể tinh chỉnh thời gian của từng câu hỏi riêng lẻ ở Menu 3 chấm (⋮) trên thẻ câu hỏi phía dưới.
          </p>
        </div>

        {/* Card 4: Audio TTS Setting */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🔊</span>
            <div>
              <h3 className={styles.cardTitle}>Giọng Đọc Chuyển Ngữ (Tiếng Việt/Anh)</h3>
              <p className={styles.cardSubtitle}>Hệ thống sẽ tự nhận diện ngôn ngữ và đọc to nội dung khi bật.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <strong>Đọc To Câu Hỏi</strong>
                <span>Tự động đọc nội dung câu hỏi cho học sinh</span>
              </div>
              <div className={`${styles.toggleSwitch} ${readQuestion ? styles.toggleOn : ''}`} onClick={() => setReadQuestion(!readQuestion)}>
                <div className={styles.toggleKnob}></div>
              </div>
            </label>

            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <strong>Đọc To Đáp Án</strong>
                <span>Tự động đọc các phương án A, B, C, D</span>
              </div>
              <div className={`${styles.toggleSwitch} ${readOptions ? styles.toggleOn : ''}`} onClick={() => setReadOptions(!readOptions)}>
                <div className={styles.toggleKnob}></div>
              </div>
            </label>
          </div>

        </div>

      </div>
    </div>
  );
}
