'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { startMusic, stopMusic, playSound } from '@/lib/sounds';
import AvatarDisplay from './AvatarDisplay';
import SettingsPanel from './SettingsPanel';
import SakuraPetals from './SakuraPetals';
import styles from './WaitingRoom.module.css';

/* ── Responsive helper: detect sidebar vs overlay mode ───────── */
function useIsSidebarMode() {
  const [isSidebar, setIsSidebar] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsSidebar(mq.matches);
    const handler = (e) => setIsSidebar(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isSidebar;
}

export default function WaitingRoom({ roomId, players, isHost, onStart, shareCode, playerId, myPlayer, mp }) {
  /* ── Derived data ─────────────────────────────────────────── */
  const studentPlayers = (players || []).filter(p => !['Host Teacher', 'Giáo viên'].includes(p.player_name));
  const onlinePlayers = studentPlayers.filter(p => p.is_online !== false);
  const onlineCount = onlinePlayers.length;

  /* ── State ────────────────────────────────────────────────── */
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHostJoin, setShowHostJoin] = useState(false);
  const [showCancelHostPrompt, setShowCancelHostPrompt] = useState(false);
  const [hostJoinName, setHostJoinName] = useState(
    myPlayer?.player_name === 'Host Teacher' ? '' : (myPlayer?.player_name || '')
  );
  const [hostJoinAvatar, setHostJoinAvatar] = useState(myPlayer?.avatar_emoji || '🎮');
  const [numTeams, setNumTeams] = useState(2);
  const [teamAssignments, setTeamAssignments] = useState({});
  const [selectedPlayerForKick, setSelectedPlayerForKick] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [settings, setSettings] = useState({
    musicVolume: 50,
    voiceVolume: 50,
    effectsVolume: 50,
    teamMode: false,
    hideLeaderboard: false,
    mutePlayers: false,
    optimizePerformance: false,
    safePlayerNames: true,
    banKicked: false,
    shareScreen: false,
  });

  /* ── Refs ──────────────────────────────────────────────────── */
  const audioRef = useRef(null);
  const prevOnlineCountRef = useRef(onlineCount);
  const effectsVolRef = useRef(50);
  const previewTimeoutRef = useRef(null);
  const isSidebarMode = useIsSidebarMode();

  /* ── Join/Leave Sound Effects ──────────────────────────────── */
  useEffect(() => {
    const prevCount = prevOnlineCountRef.current;
    prevOnlineCountRef.current = onlineCount;
    if (prevCount === 0 && onlineCount > 0) return;
    if (prevCount === onlineCount) return;

    const playTone = (freq, duration, type = 'sine') => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        const volume = 0.15 * (effectsVolRef.current / 100);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {}
    };

    if (onlineCount > prevCount) {
      playTone(523, 0.12);
      setTimeout(() => playTone(659, 0.12), 80);
      setTimeout(() => playTone(784, 0.2), 160);
    } else if (onlineCount < prevCount) {
      playTone(440, 0.15);
      setTimeout(() => playTone(330, 0.25, 'triangle'), 100);
    }
  }, [onlineCount]);

  /* ── Document Title ────────────────────────────────────────── */
  useEffect(() => {
    if (isHost) document.title = `(${onlineCount}) Phòng chờ — Tina MiniGame`;
    return () => { document.title = 'Tina MiniGame — Học mà chơi, Chơi mà học!'; };
  }, [onlineCount, isHost]);

  /* ── Player Join Feedback ──────────────────────────────────── */
  const [newPlayerIds, setNewPlayerIds] = useState(new Set());
  const prevPlayerIdsRef = useRef(new Set());
  const [isCountBumping, setIsCountBumping] = useState(false);

  useEffect(() => {
    const currentIds = new Set(onlinePlayers.map(p => p.id));
    const prevIds = prevPlayerIdsRef.current;
    const justJoined = [...currentIds].filter(id => !prevIds.has(id));
    prevPlayerIdsRef.current = currentIds;
    
    if (justJoined.length > 0 && prevIds.size > 0) {
      setNewPlayerIds(new Set(justJoined));
      const glowTimer = setTimeout(() => setNewPlayerIds(new Set()), 1000);
      
      setIsCountBumping(true);
      const bumpTimer = setTimeout(() => setIsCountBumping(false), 300);
      
      return () => {
        clearTimeout(glowTimer);
        clearTimeout(bumpTimer);
      };
    }
  }, [onlinePlayers]);


  /* ── Settings updater ──────────────────────────────────────── */
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'musicVolume' || key === 'voiceVolume' || key === 'effectsVolume') {
      try {
        localStorage.setItem(`tina_${key.replace('Volume', 'Vol')}`, value);
        import('@/lib/sounds').then(({ getSoundManager }) => {
          const sm = getSoundManager();
          if (key === 'musicVolume') sm.setMusicVolume(value);
          else if (key === 'effectsVolume') sm.setEffectsVolume(value);
        });
      } catch {}
    }
  };

  /* ── Sync refs ─────────────────────────────────────────────── */
  useEffect(() => { effectsVolRef.current = settings.effectsVolume; }, [settings.effectsVolume]);

  /* ── Audio ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (audioRef.current) {
      if (isHost) {
        audioRef.current.volume = settings.musicVolume / 100;
      } else {
        const saved = localStorage.getItem('tina_musicVol');
        audioRef.current.volume = saved !== null ? parseInt(saved, 10) / 100 : 0.5;
      }
      audioRef.current.play().catch(() => {});
    }
  }, [settings.musicVolume, isHost]);

  useEffect(() => {
    if (!isHost) {
      const handler = (e) => {
        if (audioRef.current && e.detail !== undefined) audioRef.current.volume = e.detail / 100;
      };
      window.addEventListener('tina_music_volume_changed', handler);
      return () => window.removeEventListener('tina_music_volume_changed', handler);
    }
  }, [isHost]);

  /* ── Lock body scroll ──────────────────────────────────────── */
  useEffect(() => {
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, []);

  /* ── Audio previews ────────────────────────────────────────── */
  const handleVoiceSliderChange = (e) => {
    const val = parseInt(e.target.value);
    updateSetting('voiceVolume', val);
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance("Tina Minigame");
        const voices = window.speechSynthesis.getVoices();
        const usVoice = voices.find(v => v.lang === 'en-US');
        if (usVoice) msg.voice = usVoice;
        msg.lang = 'en-US';
        msg.volume = val / 100;
        window.speechSynthesis.speak(msg);
      }
    }, 300);
  };

  const handleEffectSliderChange = (e) => {
    const val = parseInt(e.target.value);
    updateSetting('effectsVolume', val);
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        const maxVol = 0.3 * (val / 100);
        gain.gain.setValueAtTime(maxVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }, 150);
  };

  /* ── Team management ───────────────────────────────────────── */
  useEffect(() => {
    if (!settings.teamMode) return;
    setTeamAssignments(prev => {
      let changed = false;
      const valid = {};
      Object.entries(prev).forEach(([pId, tId]) => {
        if (tId < numTeams) valid[pId] = tId;
      });
      let nextTeam = 0;
      studentPlayers.forEach(p => {
        if (valid[p.id] === undefined) {
          valid[p.id] = nextTeam % numTeams;
          nextTeam++;
          changed = true;
        }
      });
      return changed || Object.keys(valid).length !== Object.keys(prev).length ? valid : prev;
    });
  }, [studentPlayers, settings.teamMode, numTeams]);

  const handleReshuffleTeams = () => {
    const shuffled = [...studentPlayers].sort(() => Math.random() - 0.5);
    const newAssign = {};
    shuffled.forEach((p, i) => { newAssign[p.id] = i % numTeams; });
    setTeamAssignments(newAssign);
  };

  /* ── Share screen toggle (with cancel-host prompt) ─────────── */
  const handleShareScreenToggle = (checked) => {
    if (checked && myPlayer && myPlayer.player_name !== 'Host Teacher') {
      setShowCancelHostPrompt(true);
    } else {
      updateSetting('shareScreen', checked);
    }
  };

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleCopyLink = async () => {
    const link = `${window.location.origin}/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleStart = () => {
    setIsStarting(true);
    if (onStart) onStart(settings);
    setTimeout(() => setIsStarting(false), 5000); // Fallback to reset
  };

  /* ════════════════════════════════════════════════════════════
   * RENDER
   * Organized into: RoomHeader → PlayerGrid → HostControls → Modals
   * ════════════════════════════════════════════════════════════ */
  // --- UI Components ---
  const hostActionButtons = (
    <>
      <button
        type="button"
        className={styles.startBtn}
        onClick={handleStart}
        disabled={isStarting || (settings.teamMode ? onlinePlayers.length < numTeams : onlinePlayers.length < 1)}
        aria-label={isStarting ? "Đang bắt đầu trò chơi..." : "Bắt đầu trò chơi"}
      >
        {isStarting ? '⏳ Đang bắt đầu...' : '🚀 Bắt đầu'}
      </button>

      <button
        type="button"
        className={styles.hostJoinBtn}
        onClick={() => setShowHostJoin(true)}
        aria-label="Tham gia với tư cách người chơi"
      >
        Tham gia
      </button>
    </>
  );

  return (
    <div className={`${styles.page} ${isHost ? styles.pageHost : ''}`} role="main">
      <div className={styles.srOnly} aria-live="polite">
        {onlinePlayers.length > 0 ? `Đã có ${onlinePlayers.length} người chơi tham gia` : 'Phòng chờ đang trống, chưa có người chơi nào'}
      </div>

      {/* ── CONNECTION DOT ─────────────────────────────────────── */}
      <div 
        className={`${styles.connDot} ${mp?.status === 'connected' ? styles.connDotOk : styles.connDotReconnecting}`} 
        title={mp?.status === 'connected' ? 'Đã kết nối' : 'Đang kết nối lại...'} 
        aria-label={mp?.status === 'connected' ? 'Đã kết nối' : 'Đang kết nối lại'}
      />

      <audio ref={audioRef} src="/sounds/The_Final_Handover.mp3" loop />

      {/* ── SAKURA PETAL AMBIENT EFFECT ──────────────────── */}
      {isHost && !settings.optimizePerformance && (
        <SakuraPetals
          isSettingsOpen={isSettingsOpen}
          isSidebarMode={isSidebarMode}
          playerCount={onlineCount}
        />
      )}

      {/* ── MAIN PANEL ───────────────────────────────────────── */}
      <div className={styles.main}>

        {/* ── SECTION: Room Header ─────────────────────────── */}
        <div className={styles.roomHeader}>
          <div className={styles.joinCard}>
            <span className={styles.joinLabel}>Tham gia tại:</span>
            <span className={styles.joinUrl}>TinaMinigame</span>
          </div>

          <div className={styles.pinQrRow}>
            {typeof window !== 'undefined' && (
              <div 
                className={styles.qrBox} 
                onClick={() => setShowQRModal(true)} 
                title="Phóng to mã QR"
                role="button"
                tabIndex={0}
                aria-label="Mã QR, nhấn để phóng to"
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/${roomId}`)}`}
                  alt="QR Code"
                  className={styles.qrImg}
                />
              </div>
            )}

            <div 
              className={styles.pinBox} 
              onClick={handleCopyLink} 
              title="Nhấn để copy link gửi học sinh"
              role="button"
              tabIndex={0}
              aria-label={`Mã PIN: ${roomId}, nhấn để copy link`}
            >
              <span className={styles.pinLabel}>Mã PIN:</span>
              <span className={styles.pinCode}>{roomId}</span>
              <span className={styles.pinCopy}>
                {copied ? '✅ Đã copy link' : '🔗 Nhấn để copy'}
              </span>
            </div>
          </div>
        </div>

        {/* ── SECTION: Empty State ─────────────────────────── */}
        {onlinePlayers.length === 0 && (
          <div className={styles.emptyState}>
            <svg className={styles.emptySvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <h3 className={styles.emptyTitle}>Phòng chờ đã sẵn sàng</h3>
            <p className={styles.emptyDesc}>
              Chia sẻ mã PIN hoặc mở mã QR để học sinh quét và tham gia phòng chơi.
            </p>
            <span className={styles.emptyPill}>
              0 người chơi
            </span>
          </div>
        )}

        {/* ── SECTION: Player Grid ─────────────────────────── */}
        {onlinePlayers.length > 0 && (
          <div className={styles.playerZone}>
            <div className={styles.playersHeader}>
              <h3 className={styles.playersTitle}>Người chơi</h3>
              <span className={`${styles.playersCount} ${isCountBumping ? styles.playersCountBump : ''}`}>{onlinePlayers.length}</span>
            </div>
            
            <div className={styles.playerGrid}>
              {!settings.teamMode ? (
                /* Normal mode */
                <AnimatePresence mode="popLayout">
                  {onlinePlayers.map((player, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', bounce: 0.4, duration: 0.6, delay: i * 0.05 }}
                      key={player.id}
                      className={`${styles.playerCard} ${isHost && player.id !== playerId ? styles.playerCardClickable : ''} ${newPlayerIds.has(player.id) ? styles.playerCardNew : ''}`}
                      role={isHost && player.id !== playerId ? "button" : undefined}
                      tabIndex={isHost && player.id !== playerId ? 0 : undefined}
                      aria-label={`Người chơi ${player.player_name}`}
                      onClick={() => { if (isHost && player.id !== playerId) setSelectedPlayerForKick(player); }}
                    >
                      <div className={styles.avatarWrap}>
                        <AvatarDisplay avatar={player.avatar_emoji} className={styles.avatarImg} />
                        <div className={styles.onlineDot} title="Đang online" />
                      </div>
                      <span className={styles.playerName}>{player.player_name}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                /* Team mode */
                <AnimatePresence mode="popLayout">
                  {Object.entries(
                    onlinePlayers.reduce((acc, p) => {
                      const t = teamAssignments[p.id] !== undefined ? teamAssignments[p.id] : 'unassigned';
                      if (!acc[t]) acc[t] = [];
                      acc[t].push(p);
                      return acc;
                    }, {})
                  ).map(([tIdx, members]) => (
                    <motion.div layout key={tIdx} className={styles.teamGroup}>
                      <div className={styles.teamLabel}>
                        {tIdx === 'unassigned' ? 'Đang xếp...' : `Đội ${parseInt(tIdx) + 1}`}
                      </div>
                      <AnimatePresence>
                        {members.map((player) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: 'spring', bounce: 0.4 }}
                            key={player.id}
                            className={`${styles.teamPlayerCard} ${isHost && player.id !== playerId ? styles.playerCardClickable : ''} ${newPlayerIds.has(player.id) ? styles.playerCardNew : ''}`}
                            role={isHost && player.id !== playerId ? "button" : undefined}
                            tabIndex={isHost && player.id !== playerId ? 0 : undefined}
                            aria-label={`Người chơi ${player.player_name}`}
                            onClick={() => { if (isHost && player.id !== playerId) setSelectedPlayerForKick(player); }}
                          >
                            <div className={styles.teamAvatarWrap}>
                              <AvatarDisplay avatar={player.avatar_emoji} className={styles.avatarImg} />
                              <div className={styles.onlineDot} title="Đang online" />
                            </div>
                            <span className={styles.teamPlayerName}>{player.player_name}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION: Host Controls (sticky on mobile) ────── */}
        {!isSidebarMode && (
          <div className={styles.hostControls}>
            {isHost ? (
              <>
                <button
                  type="button"
                  className={styles.settingsToggle}
                  onClick={() => setIsSettingsOpen(true)}
                  aria-label="Mở cài đặt"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                </button>
                <div className={styles.actionRow}>
                  {hostActionButtons}
                </div>
              </>
            ) : (
              <p className={styles.waitingMsg}>⏳ Vui lòng chờ giáo viên bắt đầu...</p>
            )}
          </div>
        )}
      </div>

      {/* ── SETTINGS PANEL ───────────────────────────────────── */}
      {isHost && (
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          updateSetting={updateSetting}
          onVoiceSliderChange={handleVoiceSliderChange}
          onEffectSliderChange={handleEffectSliderChange}
          teamMode={settings.teamMode}
          numTeams={numTeams}
          onNumTeamsChange={(e) => setNumTeams(Math.max(2, parseInt(e.target.value) || 2))}
          onReshuffleTeams={handleReshuffleTeams}
          onShareScreenToggle={handleShareScreenToggle}
          isSidebarMode={isSidebarMode}
          topActions={isSidebarMode ? hostActionButtons : null}
        />
      )}

      {/* ════════════════════════════════════════════════════════
       * MODALS
       * ════════════════════════════════════════════════════════ */}

      {/* ── Host Join Modal ──────────────────────────────────── */}
      {showHostJoin && (
        <div className={styles.modalOverlay} onClick={() => setShowHostJoin(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Báo danh thi đấu</h2>

            <div
              className={styles.avatarPicker}
              onClick={() => {
                const AVATARS = [
                  '/avatars/avatar_1.png', '/avatars/avatar_2.png',
                  '/avatars/avatar_3.png', '/avatars/avatar_4.png',
                  '/avatars/avatar_5.png', '/avatars/avatar_6.png',
                  '/avatars/avatar_7.png', '/avatars/avatar_8.png'
                ];
                setHostJoinAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
              }}
              title="Click để đổi avatar"
            >
              <AvatarDisplay avatar={hostJoinAvatar} className={styles.avatarImg} />
            </div>
            <p className={styles.avatarHint}>Nhấn avatar để đổi</p>

            <input
              type="text"
              value={hostJoinName}
              onChange={e => setHostJoinName(e.target.value)}
              placeholder="Nhập tên của bạn..."
              autoFocus
              className={styles.nameInputField}
            />

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnSecondary} onClick={() => setShowHostJoin(false)}>
                Hủy
              </button>
              <button
                type="button"
                className={styles.modalBtnPrimary}
                disabled={!hostJoinName.trim()}
                onClick={async () => {
                  if (!hostJoinName.trim() || !playerId) return;
                  if (mp && mp.updatePlayerProfile) {
                    await mp.updatePlayerProfile(hostJoinName, hostJoinAvatar);
                  } else {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.from('mg_room_players').update({ player_name: hostJoinName, avatar_emoji: hostJoinAvatar }).eq('id', playerId);
                  }
                  setShowHostJoin(false);
                }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Playing Host Modal ────────────────────────── */}
      {showCancelHostPrompt && (
        <div className={styles.modalOverlay} onClick={() => setShowCancelHostPrompt(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Xác nhận trình chiếu</h2>
            <p className={styles.modalText}>
              Bật chế độ trình chiếu sẽ hủy tư cách người chơi hiện tại của bạn. Bạn có muốn tiếp tục?
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnSecondary} onClick={() => setShowCancelHostPrompt(false)}>
                Quay lại
              </button>
              <button
                type="button"
                className={styles.modalBtnDanger}
                onClick={async () => {
                  if (mp && mp.updatePlayerProfile) {
                    await mp.updatePlayerProfile('Host Teacher', '😀');
                  } else {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.from('mg_room_players').update({ player_name: 'Host Teacher', avatar_emoji: '😀' }).eq('id', playerId);
                  }
                  updateSetting('shareScreen', true);
                  setShowCancelHostPrompt(false);
                }}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kick/Ban Player Modal ────────────────────────────── */}
      {selectedPlayerForKick && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPlayerForKick(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.avatarPicker}>
              <AvatarDisplay avatar={selectedPlayerForKick.avatar_emoji} className={styles.avatarImg} />
            </div>
            <h2 className={styles.modalTitle}>{selectedPlayerForKick.player_name}</h2>
            <p className={styles.modalText}>Bạn muốn xử lý người chơi này?</p>

            <div className={styles.kickActions}>
              <button
                type="button"
                className={styles.modalBtnWarning}
                onClick={() => { mp.hostKickPlayer(selectedPlayerForKick.id, false); setSelectedPlayerForKick(null); }}
              >
                👞 Đuổi khỏi phòng
              </button>
              <button
                type="button"
                className={styles.modalBtnDanger}
                onClick={() => { mp.hostKickPlayer(selectedPlayerForKick.id, true); setSelectedPlayerForKick(null); }}
              >
                ⛔ Cấm vĩnh viễn
              </button>
              <button
                type="button"
                className={styles.modalBtnSecondary}
                onClick={() => setSelectedPlayerForKick(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Enlarge Modal ─────────────────────────────────── */}
      {showQRModal && typeof window !== 'undefined' && (
        <div className={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.qrModalContent}>
              <h2 className={styles.modalTitle}>Quét mã QR để tham gia</h2>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/${roomId}`)}`}
                alt="QR Code phóng to"
                className={styles.qrModalImg}
              />
              <span className={styles.qrModalPin}>Mã: {roomId}</span>
              <button type="button" className={styles.modalBtnSecondary} onClick={() => setShowQRModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
