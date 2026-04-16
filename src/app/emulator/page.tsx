'use client';

import { useState } from 'react';
import styles from './page.module.css';
export default function PhoneEmulator() {
  const [urlInput, setUrlInput] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [isLandscape, setIsLandscape] = useState(false);
  const [deviceType, setDeviceType] = useState('phone'); // 'phone', 'tablet', 'desktop'
  
  const handleLoad = (e: any) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    // Check if it's just a PIN or a full URL
    let finalUrl = urlInput.trim();
    if (/^[A-Z0-9]{6}$/i.test(finalUrl)) {
       finalUrl = window.location.origin + '/' + finalUrl.toUpperCase();
    } else if (!finalUrl.startsWith('http') && !finalUrl.startsWith('/')) {
      if (finalUrl.includes('.')) {
        finalUrl = 'http://' + finalUrl;
      } else {
        finalUrl = window.location.origin + '/' + finalUrl;
      }
    }
    
    setIframeSrc(finalUrl);
  };

  const clearEmulator = () => {
    setIframeSrc('');
    setUrlInput('');
  };

  const toggleOrientation = () => {
    setIsLandscape(!isLandscape);
  };

  // Dimensions for devices
  const sizes = {
    phone: { w: 393, h: 852 },
    tablet: { w: 820, h: 1180 },
    desktop: { w: 1280, h: 800 } // Typical 13-inch web viewport
  };

  // @ts-ignore
  const currentSize = sizes[deviceType];
  // Desktop is always landscape effectively for width > height, but we apply the w/h.
  // We can let Desktop be fixed and not affected by isLandscape, or we can just apply it.
  const isActuallyLandscape = deviceType === 'desktop' ? true : isLandscape;

  const frameStyle = {
    width: isActuallyLandscape ? `${currentSize.h}px` : `${currentSize.w}px`,
    height: isActuallyLandscape ? `${currentSize.w}px` : `${currentSize.h}px`,
  };

  const getFrameClass = () => {
    if (deviceType === 'tablet') return styles.frameTablet;
    if (deviceType === 'desktop') return styles.frameDesktop;
    return styles.framePhone;
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Trình Giả Lập Thiết Bị</h1>
          <p className={styles.subtitle}>Kiểm tra hiển thị trò chơi trên nhiều kích thước màn hình khác nhau</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsRow}>
            <div className={styles.deviceToggle}>
              <button 
                className={`${styles.deviceBtn} ${deviceType === 'phone' ? styles.deviceBtnActive : ''}`}
                onClick={() => setDeviceType('phone')}
              >
                📱 Điện thoại
              </button>
              <button 
                className={`${styles.deviceBtn} ${deviceType === 'tablet' ? styles.deviceBtnActive : ''}`}
                onClick={() => setDeviceType('tablet')}
              >
                📟 iPad
              </button>
              <button 
                className={`${styles.deviceBtn} ${deviceType === 'desktop' ? styles.deviceBtnActive : ''}`}
                onClick={() => setDeviceType('desktop')}
              >
                💻 Máy tính
              </button>
            </div>
            {deviceType !== 'desktop' && (
              <button onClick={toggleOrientation} className={`${styles.btn} ${isLandscape ? styles.btnActive : ''}`}>
                🔄 {isLandscape ? 'Đổi sang màn dọc' : 'Đổi sang màn ngang'}
              </button>
            )}
          </div>

          <form onSubmit={handleLoad} className={styles.controlsRow} style={{ width: '100%', marginTop: '8px' }}>
            <div className={styles.inputWrapper}>
              <input 
                type="text" 
                className={styles.urlInput}
                placeholder="Nhập mã phòng (PIN) hoặc dán link trò chơi..." 
                value={urlInput}
                onChange={(e) => setUrlInput((e.target as any).value)}
              />
            </div>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              ▶ Bắt đầu
            </button>
            <button type="button" onClick={clearEmulator} className={styles.btn}>
              ✖ Xóa
            </button>
          </form>
        </div>

        <div className={styles.workspace}>
          <div className={`${styles.deviceFrame} ${getFrameClass()}`} style={frameStyle}>
            {deviceType === 'phone' && (
              <div className={isActuallyLandscape ? styles.notchLeft : styles.notchTop}></div>
            )}
            
            {deviceType === 'desktop' && (
              <div className={styles.macButtons}>
                <div className={`${styles.macButton} ${styles.macButtonRed}`}></div>
                <div className={`${styles.macButton} ${styles.macButtonYellow}`}></div>
                <div className={`${styles.macButton} ${styles.macButtonGreen}`}></div>
              </div>
            )}

            <div className={styles.phoneScreen}>
              {iframeSrc ? (
                <iframe 
                  src={iframeSrc} 
                  className={styles.iframe}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  title="Device Emulator"
                />
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    {deviceType === 'phone' ? '📱' : deviceType === 'tablet' ? '📟' : '💻'}
                  </div>
                  <div className={styles.emptyText}>
                    Màn hình giả lập chưa hoạt động.<br/>
                    Hãy nhập mã PIN ở trên và nhấn <strong>Bắt đầu</strong>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
