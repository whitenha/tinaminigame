'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/Icon/Icon';
import styles from './Settings.module.css';

const AVATARS = [
  '/avatars/avatar_1.png', '/avatars/avatar_2.png',
  '/avatars/avatar_3.png', '/avatars/avatar_4.png',
  '/avatars/avatar_5.png', '/avatars/avatar_6.png',
  '/avatars/avatar_7.png', '/avatars/avatar_8.png'
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useLanguage();
  const { user, isTeacher, updateUserMetadata } = useAuth();

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(user?.user_metadata?.full_name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLocale: 'en' | 'vi') => {
    setLocale(newLocale);
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim() || editNameValue === user?.user_metadata?.full_name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    await updateUserMetadata({ full_name: editNameValue.trim() });
    setIsSavingName(false);
    setIsEditingName(false);
  };

  const handleSelectPresetAvatar = async (url: string) => {
    setIsUploadingAvatar(true);
    await updateUserMetadata({ avatar_url: url });
    setIsUploadingAvatar(false);
    setIsAvatarModalOpen(false);
  };

  const handleUploadCustomAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(locale === 'en' ? 'File is too large. Max 2MB.' : 'File quá lớn. Vui lòng chọn ảnh dưới 2MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        await updateUserMetadata({ avatar_url: data.secure_url });
        setIsAvatarModalOpen(false);
      } else {
        alert(locale === 'en' ? 'Failed to upload image.' : 'Lỗi tải ảnh lên.');
      }
    } catch (err) {
      console.error(err);
      alert(locale === 'en' ? 'Network error.' : 'Lỗi kết nối mạng.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const currentName = user?.user_metadata?.full_name || 'Guest User';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Profile Section */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Icon name="users" size={20} />
            {t('settings.profile')}
          </h2>
          
          <div className={styles.profileInfo}>
            <div className={styles.avatarWrapper} onClick={() => setIsAvatarModalOpen(true)}>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {currentName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.avatarHoverOverlay}>
                <Icon name="camera" size={24} color="white" />
              </div>
            </div>
            
            <div className={styles.userInfo}>
              <div className={styles.infoGroup}>
                <label>{locale === 'en' ? 'DISPLAY NAME' : 'TÊN HIỂN THỊ'}</label>
                {isEditingName ? (
                  <div className={styles.nameEditWrap}>
                    <input 
                      type="text" 
                      value={editNameValue} 
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className={styles.nameInput}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    />
                    <button onClick={handleSaveName} disabled={isSavingName} className={styles.saveBtn}>
                      {isSavingName ? '...' : (locale === 'en' ? 'Save' : 'Lưu')}
                    </button>
                    <button onClick={() => setIsEditingName(false)} className={styles.cancelBtn}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.nameDisplayWrap}>
                    <span className={styles.infoValue}>{currentName}</span>
                    <button className={styles.editIconBtn} onClick={() => {
                        setEditNameValue(currentName);
                        setIsEditingName(true);
                    }}>
                      <Icon name="edit" size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoGroup}>
                  <label>{t('settings.email')}</label>
                  <div className={styles.infoValueSecondary}>{user?.email || 'N/A'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <label>{t('settings.role')}</label>
                  <div className={styles.infoBadge}>
                    {isTeacher ? t('settings.teacher') : 'User'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Icon name="globe" size={20} />
            {t('settings.preferences')}
          </h2>

          <div className={styles.preferenceGroup}>
            <div>
              <label className={styles.preferenceLabel}>{t('settings.language')}</label>
              <p className={styles.preferenceDesc}>
                {locale === 'en' 
                  ? 'Choose your preferred language for the interface.'
                  : 'Chọn ngôn ngữ hiển thị ưa thích của bạn cho giao diện.'}
              </p>
            </div>
            <div className={styles.radioGroup}>
              <button 
                className={`${styles.radioBtn} ${locale === 'en' ? styles.radioBtnActive : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                English (EN)
              </button>
              <button 
                className={`${styles.radioBtn} ${locale === 'vi' ? styles.radioBtnActive : ''}`}
                onClick={() => handleLanguageChange('vi')}
              >
                Tiếng Việt (VI)
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Avatar Selection Modal */}
      {mounted && isAvatarModalOpen && createPortal(
        <div className={styles.modalOverlay} onClick={() => !isUploadingAvatar && setIsAvatarModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {locale === 'en' ? 'Choose Avatar' : 'Chọn Ảnh Đại Diện'}
            </h2>
            
            <div className={styles.avatarGrid}>
              {AVATARS.map((url, i) => (
                <div key={i} className={styles.avatarOption} onClick={() => !isUploadingAvatar && handleSelectPresetAvatar(url)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Avatar ${i+1}`} />
                </div>
              ))}
            </div>

            <div className={styles.modalDivider}>
              <span>{locale === 'en' ? 'OR' : 'HOẶC'}</span>
            </div>

            <div className={styles.uploadSection}>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                id="avatar-upload" 
                className={styles.hiddenFile}
                onChange={handleUploadCustomAvatar}
                disabled={isUploadingAvatar}
              />
              <label htmlFor="avatar-upload" className={`${styles.uploadBtn} ${isUploadingAvatar ? styles.uploading : ''}`}>
                <Icon name="upload" size={20} />
                {isUploadingAvatar 
                  ? (locale === 'en' ? 'Uploading...' : 'Đang tải lên...') 
                  : (locale === 'en' ? 'Upload Custom Image' : 'Tải lên ảnh của bạn')
                }
              </label>
            </div>

            <button className={styles.modalCloseBtn} onClick={() => !isUploadingAvatar && setIsAvatarModalOpen(false)}>
              {locale === 'en' ? 'Cancel' : 'Hủy'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
