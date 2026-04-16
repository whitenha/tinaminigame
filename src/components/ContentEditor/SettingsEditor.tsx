'use client';

import { useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import Icon from '@/components/Icon/Icon';
import styles from './SettingsEditor.module.css';

export default function SettingsEditor({ 
  title, setTitle, 
  coverImage, setCoverImage, 
  applyTimeToAll,
  readQuestion, setReadQuestion,
  readOptions, setReadOptions,
  shuffleQuestions, setShuffleQuestions
}: any) {
  const [globalTime, setGlobalTime] = useState(20);
  return (
    <div className={styles.editor}>

      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon}><Icon name="gamepad" size={32} color="#fff" /></div>
          <h2 className={styles.heroTitle}>Thiết lập Trò Chơi</h2>
          <p className={styles.heroSubtitle}>Chọn tên hấp dẫn và ảnh bìa bắt mắt để thu hút học sinh!</p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className={styles.cardsGrid}>

        {/* Card 1: Title */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Icon name="pencil" size={20} color="#e84393" /></span>
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
              onChange={(e) => setTitle((e.target as any).value)}
              maxLength={80}
            />
            <span className={styles.charCount}>{title.length}/80</span>
          </div>
          <p className={styles.hint} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="lightbulb" size={14} /> Mẹo: Tên game ngắn gọn, hấp dẫn sẽ giúp học sinh dễ tìm kiếm và thích thú hơn!</p>
        </div>

        {/* Card 2: Cover Image */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Icon name="camera" size={20} color="#00cec9" /></span>
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
                      // @ts-ignore
                      if (result.info && result.info.secure_url) {
                        // @ts-ignore
                        setCoverImage(result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button className={styles.coverAction} onClick={() => open()} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="refresh-cw" size={14} /> Đổi ảnh</button>
                    )}
                  </CldUploadWidget>
                  <button 
                    className={`${styles.coverAction} ${styles.coverActionDanger}`}
                    onClick={() => setCoverImage(null)}
                    style={{display: 'flex', alignItems: 'center', gap: '6px'}}
                  >
                    <Icon name="trash" size={14} /> Xóa
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
                    // @ts-ignore
                    if (result.info && result.info.secure_url) {
                      // @ts-ignore
                      setCoverImage(result.info.secure_url);
                    }
                  }}
                >
                  {({ open }) => (
                    <button className={styles.uploadBtn} onClick={() => open()} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <Icon name="folder" size={16} /> Chọn ảnh từ máy
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
            <span className={styles.cardIcon}><Icon name="clock" size={20} color="#fdcb6e" /></span>
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
                onClick={() => {
                  setGlobalTime(t);
                  if (applyTimeToAll) applyTimeToAll(t);
                }}
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
            style={{ display: 'none' }} /* Ẩn đi vì đã tự động áp dụng */
          >
            ✓ Cập nhật cho tất cả câu hỏi
          </button>
          <p className={styles.hint} style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{flexShrink: 0}}><Icon name="lightbulb" size={14} /></span> <span>Mẹo: Bạn vẫn có thể tinh chỉnh thời gian của từng câu hỏi riêng lẻ ở Menu 3 chấm (⋮) trên thẻ câu hỏi phía dưới.</span>
          </p>
        </div>

        {/* Card 4: Audio TTS Setting */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Icon name="volume-2" size={20} color="#6C5CE7" /></span>
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

        {/* Card 5: Gameplay Settings */}
        <div className={styles.settingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Icon name="shuffle" size={20} color="#00b894" /></span>
            <div>
              <h3 className={styles.cardTitle}>Luật Chơi Trắc Nghiệm</h3>
              <p className={styles.cardSubtitle}>Tùy chỉnh các luật chơi mặc định cho bộ đề</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <strong>Đảo Vị Trí Câu Hỏi</strong>
                <span>Xáo trộn ngẫu nhiên thứ tự các câu hỏi mỗi lần chơi</span>
              </div>
              <div className={`${styles.toggleSwitch} ${shuffleQuestions ? styles.toggleOn : ''}`} onClick={() => setShuffleQuestions(!shuffleQuestions)}>
                <div className={styles.toggleKnob}></div>
              </div>
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
