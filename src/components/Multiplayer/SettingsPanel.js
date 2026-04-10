'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './SettingsPanel.module.css';

/* ── Collapsible Group ───────────────────────────────────────── */
function SettingsGroup({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.groupHeader}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.groupTitle}>{title}</span>
        <svg
          className={`${styles.groupChevron} ${isOpen ? styles.groupChevronOpen : ''}`}
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className={styles.groupBody}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Toggle Item ─────────────────────────────────────────────── */
function ToggleItem({ name, description, checked, onChange, badge, isPrimary }) {
  return (
    <label className={`${styles.toggleRow} ${isPrimary ? styles.toggleHighlight : ''}`}>
      <div className={styles.toggleText}>
        <span className={styles.toggleName}>
          {name}
          {badge && <span className={styles.badge}>{badge}</span>}
        </span>
        {description && <span className={styles.toggleDesc}>{description}</span>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={styles.toggle}
        role="switch"
        aria-label={name}
      />
    </label>
  );
}

/* ── Slider Item ─────────────────────────────────────────────── */
function SliderItem({ label, value, onChange, ariaLabel }) {
  return (
    <div className={styles.sliderRow}>
      <label className={styles.sliderLabel}>{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className={styles.slider}
        aria-label={ariaLabel || label}
      />
      <span className={styles.sliderValue}>{value}</span>
    </div>
  );
}

/* ── Main SettingsPanel ──────────────────────────────────────── */
export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  updateSetting,
  onVoiceSliderChange,
  onEffectSliderChange,
  // Team mode
  teamMode,
  numTeams,
  onNumTeamsChange,
  onReshuffleTeams,
  // Share screen
  onShareScreenToggle,
  // Responsive: tells us if we're in sidebar mode vs overlay mode
  isSidebarMode = false,
  topActions, // NEW: For passing desktop command actions
}) {
  const panelRef = useRef(null);

  // Lock body scroll when panel is open in overlay mode
  useEffect(() => {
    if (!isSidebarMode && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen, isSidebarMode]);

  // Focus trap: focus panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  // In sidebar mode, always render content (no overlay)
  // In overlay mode, only render when open
  if (!isSidebarMode && !isOpen) return null;

  const panelContent = (
    <div
      ref={panelRef}
      className={`${styles.panel} ${isSidebarMode ? styles.panelSidebar : styles.panelOverlay}`}
      tabIndex={-1}
      role="dialog"
      aria-label="Cài đặt trò chơi"
    >
      {/* Header — only in overlay mode */}
      {!isSidebarMode && (
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Cài đặt</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng cài đặt"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar mode header */}
      {isSidebarMode && (
        <h2 className={styles.sidebarTitle}>Cài đặt</h2>
      )}

      <div className={styles.panelScroll}>
        {/* Command Rail Actions (Desktop Only) */}
        {topActions && (
          <div className={styles.railActions}>
            {topActions}
          </div>
        )}

        {/* ── Sound Group ── */}
        <SettingsGroup title="Âm thanh" defaultOpen={true}>
          <SliderItem
            label="Nhạc nền"
            value={settings.musicVolume}
            onChange={(e) => updateSetting('musicVolume', parseInt(e.target.value))}
          />
          <SliderItem
            label="Giọng đọc"
            value={settings.voiceVolume}
            onChange={onVoiceSliderChange}
          />
          <SliderItem
            label="Hiệu ứng"
            value={settings.effectsVolume}
            onChange={onEffectSliderChange}
          />
        </SettingsGroup>

        {/* ── Gameplay Group ── */}
        <SettingsGroup title="Trò chơi" defaultOpen={true}>
          <ToggleItem
            name="Trình chiếu màn hình"
            description="Tắt đi nếu bạn muốn chơi cùng trên máy này"
            checked={settings.shareScreen}
            onChange={(e) => onShareScreenToggle(e.target.checked)}
            isPrimary={true}
          />

          <ToggleItem
            name="Chế độ đội"
            description="Người chơi chia đội thi đấu"
            checked={settings.teamMode}
            onChange={(e) => updateSetting('teamMode', e.target.checked)}
            badge="Mới"
            isPrimary={true}
          />

          {settings.teamMode && (
            <div className={styles.teamConfig}>
              <div className={styles.teamConfigRow}>
                <label className={styles.teamConfigLabel}>Số lượng đội:</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={numTeams}
                  onChange={onNumTeamsChange}
                  className={styles.teamInput}
                  aria-label="Số lượng đội"
                />
              </div>
              <button
                type="button"
                className={styles.reshuffleBtn}
                onClick={onReshuffleTeams}
              >
                🎲 Sắp xếp lại đội hình
              </button>
            </div>
          )}

          <ToggleItem
            name="Ẩn bảng xếp hạng"
            description="Ẩn bảng xếp hạng trong lúc chơi"
            checked={settings.hideLeaderboard}
            onChange={(e) => updateSetting('hideLeaderboard', e.target.checked)}
          />

          <ToggleItem
            name="Tắt âm người chơi"
            description="Tắt mọi âm thanh trên máy học sinh"
            checked={settings.mutePlayers}
            onChange={(e) => updateSetting('mutePlayers', e.target.checked)}
          />

          <ToggleItem
            name="Tối ưu hiệu năng"
            description="Tắt pháo hoa, hoạt ảnh nền"
            checked={settings.optimizePerformance}
            onChange={(e) => updateSetting('optimizePerformance', e.target.checked)}
          />
        </SettingsGroup>

        {/* ── Safety Group ── */}
        <SettingsGroup title="An toàn" defaultOpen={false}>
          <ToggleItem
            name="Lọc tên phản cảm"
            description="Hệ thống tự động lọc tên không phù hợp"
            checked={settings.safePlayerNames}
            onChange={(e) => updateSetting('safePlayerNames', e.target.checked)}
          />

          <ToggleItem
            name="Cấm người bị đuổi"
            description="Người bị đuổi không thể tham gia lại"
            checked={settings.banKicked}
            onChange={(e) => updateSetting('banKicked', e.target.checked)}
          />
          
          <ToggleItem
            name="Yêu cầu xác thực tài khoản"
            description="Người chơi phải đăng nhập để tham gia"
            checked={settings.requireAuth}
            onChange={(e) => updateSetting('requireAuth', e.target.checked)}
            isPrimary={true}
          />
        </SettingsGroup>
      </div>
    </div>
  );

  // In sidebar mode, return panel directly
  if (isSidebarMode) return panelContent;

  // In overlay mode, wrap with backdrop
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {panelContent}
      </div>
    </div>
  );
}
