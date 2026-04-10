'use client';

import { useState, useEffect, useRef } from 'react';
import AvatarDisplay from './AvatarDisplay';
import styles from './Multiplayer.module.css';

export default function WaitingRoom({ roomId, players, isHost, onStart, shareCode, playerId, myPlayer, mp }) {
  // Filter out the generic host, but include them if they joined as a player (changed name)
  const studentPlayers = (players || []).filter(p => !['Host Teacher', 'Giáo viên'].includes(p.player_name));
  const onlinePlayers = studentPlayers.filter(p => p.is_online !== false);
  const onlineCount = onlinePlayers.length;
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);
  const prevOnlineCountRef = useRef(onlineCount);

  // ── Join/Leave Sound Effects ──────────────────────────────
  const effectsVolRef = useRef(50);

  useEffect(() => {
    const prevCount = prevOnlineCountRef.current;
    prevOnlineCountRef.current = onlineCount;

    // Skip initial render or if count hasn't changed
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
        
        // Base max volume is 0.15, scaled by the effects volume setting
        const volume = 0.15 * (effectsVolRef.current / 100);
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {}
    };

    if (onlineCount > prevCount) {
      // Player joined — cheerful ascending chime
      playTone(523, 0.12); // C5
      setTimeout(() => playTone(659, 0.12), 80); // E5
      setTimeout(() => playTone(784, 0.2), 160); // G5
    } else if (onlineCount < prevCount) {
      // Player left — descending tone
      playTone(440, 0.15); // A4
      setTimeout(() => playTone(330, 0.25, 'triangle'), 100); // E4
    }
  }, [onlineCount]);

  // ── Settings State ─────────────────────────────────────────
  const [settings, setSettings] = useState({
    // Sound
    musicVolume: 50,
    voiceVolume: 50,
    effectsVolume: 50,
    // Gameplay
    teamMode: false,
    hideLeaderboard: false,
    mutePlayers: false,
    optimizePerformance: false,
    // Safety
    safePlayerNames: true,
    banKicked: false,
    // Host Mode
    shareScreen: false
  });

  // Sync effects volume ref
  useEffect(() => {
    effectsVolRef.current = settings.effectsVolume;
  }, [settings.effectsVolume]);

  const [showHostJoin, setShowHostJoin] = useState(false);
  const [showCancelHostPrompt, setShowCancelHostPrompt] = useState(false);
  const [hostJoinName, setHostJoinName] = useState(myPlayer?.player_name === 'Host Teacher' ? '' : (myPlayer?.player_name || ''));
  const [hostJoinAvatar, setHostJoinAvatar] = useState(myPlayer?.avatar_emoji || '🎮');
  const [numTeams, setNumTeams] = useState(2);
  const [teamAssignments, setTeamAssignments] = useState({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPlayerForKick, setSelectedPlayerForKick] = useState(null);

  // Keep volume synced with musicVolume setting and auto-play
  useEffect(() => {
    if (audioRef.current) {
      if (isHost) {
        audioRef.current.volume = settings.musicVolume / 100;
      } else {
        const savedMusic = localStorage.getItem('tina_musicVol');
        if (savedMusic !== null) {
          audioRef.current.volume = parseInt(savedMusic, 10) / 100;
        } else {
          audioRef.current.volume = 0.5; // Default 50% for players
        }
      }
      audioRef.current.play().catch(() => {
        // Auto-play might be blocked by browser policy before first interaction
      });
    }
  }, [settings.musicVolume, isHost]);

  // Listen to live updates from the player's gear icon
  useEffect(() => {
    if (!isHost) {
      const handleMusicChange = (e) => {
        if (audioRef.current && e.detail !== undefined) {
          audioRef.current.volume = e.detail / 100;
        }
      };
      window.addEventListener('tina_music_volume_changed', handleMusicChange);
      return () => window.removeEventListener('tina_music_volume_changed', handleMusicChange);
    }
  }, [isHost]);

  // Lock global scrolling on mount
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Persist audio settings immediately to local storage and sync to manager
    if (key === 'musicVolume' || key === 'voiceVolume' || key === 'effectsVolume') {
      try {
        localStorage.setItem(`tina_${key.replace('Volume', 'Vol')}`, value);
        
        // Dynamically update the SoundManager for instant feedback across all screens
        import('@/lib/sounds').then(({ getSoundManager }) => {
          const sm = getSoundManager();
          if (key === 'musicVolume') sm.setMusicVolume(value);
          else if (key === 'effectsVolume') sm.setEffectsVolume(value);
        });
      } catch (err) {}
    }
  };

  // ── Audio Preview for Sliders ───────────────────────────────
  const previewTimeoutRef = useRef(null);
  
  const playPreviewVoice = (val) => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance("Tina Minigame");
        
        // Find US English voice
        const voices = window.speechSynthesis.getVoices();
        const usVoice = voices.find(v => v.lang === 'en-US');
        if (usVoice) msg.voice = usVoice;
        
        msg.lang = 'en-US';
        msg.volume = val / 100;
        window.speechSynthesis.speak(msg);
      }
    }, 300); // 300ms debounce
  };

  const handleVoiceSliderChange = (e) => {
    const val = parseInt(e.target.value);
    updateSetting('voiceVolume', val);
    playPreviewVoice(val);
  };

  const handleEffectSliderChange = (e) => {
    const val = parseInt(e.target.value);
    updateSetting('effectsVolume', val);
    
    // Play a "ding" sound for effects preview
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        
        // Scale to 0-0.3 range for preview ding
        const maxVol = 0.3 * (val / 100);
        gain.gain.setValueAtTime(maxVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }, 150);
  };

  useEffect(() => {
    if (!settings.teamMode) return;
    
    setTeamAssignments(prev => {
      let changed = false;
      const newAssignments = { ...prev };

      // Make sure we only have teams 0 to numTeams - 1
      const validAssignments = {};
      let needsReshuffle = false;
      
      Object.entries(newAssignments).forEach(([pId, tId]) => {
        if (tId >= numTeams) {
          needsReshuffle = true;
        } else {
          validAssignments[pId] = tId;
        }
      });

      // If team size changed, distribute unassigned students round-robin
      let nextTeam = 0;
      studentPlayers.forEach(p => {
        if (validAssignments[p.id] === undefined) {
           validAssignments[p.id] = nextTeam % numTeams;
           nextTeam++;
           changed = true;
        }
      });
      
      return changed || needsReshuffle ? validAssignments : prev;
    });
  }, [studentPlayers, settings.teamMode, numTeams]);

  const handleReshuffleTeams = () => {
    const shuffled = [...studentPlayers].sort(() => Math.random() - 0.5);
    const newAssignments = {};
    shuffled.forEach((p, index) => {
       newAssignments[p.id] = index % numTeams;
    });
    setTeamAssignments(newAssignments);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  // Safe handler to pass settings up on Start
  const handleStart = () => {
    if (onStart) onStart(settings);
  };

  return (
    <div className={styles.waitingPageSplit}>
      <audio ref={audioRef} src="/sounds/The_Final_Handover.mp3" loop />
      
      {/* ── Left Panel: Main Wait Area ── */}
      <div className={styles.mainPanel}>
        {/* CYBERPUNK BACKGROUND EFFECTS */}
        <div className={styles.cyberGrid}></div>
        <div className={styles.cyberSparkles}></div>

        <div className={styles.topBarWait}>
          <div className={styles.joinAt}>
            <span>Tham gia tại:</span>
            <div className={styles.tinaLogoBox}>TinaMinigame</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
            {typeof window !== 'undefined' && (
              <div 
                onClick={() => setShowQRModal(true)}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  backdropFilter: 'blur(10px)',
                  padding: 8, 
                  borderRadius: 20, 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                title="Phóng to mã QR"
              >
                <div style={{ background: 'white', padding: 4, borderRadius: 12 }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/play/${roomId}`)}`} 
                    alt="QR Code" 
                    style={{ width: 80, height: 80, display: 'block' }} 
                  />
                </div>
              </div>
            )}
            
            <div className={styles.pinCodeBox} onClick={handleCopyLink} title="Click để copy link gửi học sinh">
              <span className={styles.pinLabel}>Mã PIN:</span>
              <span className={styles.pinText}>{roomId}</span>
              <div className={styles.copyAction}>
                {copied ? '✅ Đã Copy Link' : '🔗 Nhấn để copy Link'}
              </div>
            </div>
          </div>
        </div>

        {onlinePlayers.length === 0 && (
          <div className={styles.centerWaitMsg} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
            <p style={{ fontSize: 48, fontWeight: 800, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-display)', letterSpacing: 1, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              Đang chờ người tham gia<span className={styles.loadingDot} style={{ animationDelay: '0s' }}>.</span><span className={styles.loadingDot} style={{ animationDelay: '0.3s' }}>.</span><span className={styles.loadingDot} style={{ animationDelay: '0.6s' }}>.</span>
            </p>
          </div>
        )}

        <div className={styles.playerGrid}>
          {!settings.teamMode ? (
            onlinePlayers.map((player, i) => (
              <div
                key={player.id}
                className={styles.playerCard}
                style={{ animationDelay: `${i * 0.05}s`, cursor: isHost && player.id !== playerId ? 'pointer' : 'default' }}
                onClick={() => { if (isHost && player.id !== playerId) setSelectedPlayerForKick(player); }}
              >
                <div className={styles.playerAvatarWrapper}>
                  <AvatarDisplay avatar={player.avatar_emoji} className={styles.playerAvatar} />
                </div>
                <span className={styles.playerName}>{player.player_name}</span>
              </div>
            ))
          ) : (
            // TEAM GRID
            Object.entries(
              onlinePlayers.reduce((acc, p) => {
                const t = teamAssignments[p.id] !== undefined ? teamAssignments[p.id] : 'Đang xếp...';
                if (!acc[t]) acc[t] = [];
                acc[t].push(p);
                return acc;
              }, {})
            ).map(([tIdx, members]) => (
              <div key={tIdx} style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 24, border: '2px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220, animation: 'playerJoin 0.5s ease both' }}>
                <div style={{ textAlign: 'center', color: '#f368e0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-display)' }}>
                  {tIdx === 'Đang xếp...' ? tIdx : `Đội ${parseInt(tIdx) + 1}`}
                </div>
                {members.map((player) => (
                  <div 
                    key={player.id} 
                    className={styles.playerCard} 
                    style={{ margin: 0, padding: '8px 16px 8px 8px', transform: 'none', background: 'rgba(255,255,255,0.1)', animation: 'none', cursor: isHost && player.id !== playerId ? 'pointer' : 'default' }}
                    onClick={() => { if (isHost && player.id !== playerId) setSelectedPlayerForKick(player); }}
                  >
                    <div className={styles.playerAvatarWrapper} style={{ width: 44, height: 44 }}>
                      <AvatarDisplay avatar={player.avatar_emoji} className={styles.playerAvatar} style={{ fontSize: 24 }} />
                    </div>
                    <span className={styles.playerName} style={{ fontSize: 16 }}>{player.player_name}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className={styles.hostControlsBottom}>
          {isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                className={styles.startGameBtnBigger}
                onClick={handleStart}
                disabled={settings.teamMode ? onlinePlayers.length < numTeams : onlinePlayers.length < 1}
              >
                🚀 Bắt Đầu Game
              </button>
              
              {!settings.shareScreen && (!myPlayer || myPlayer.player_name === 'Host Teacher') && (
                <button 
                  className={styles.hostJoinBtn}
                  onClick={() => setShowHostJoin(true)}
                  title="Đặt tên để chơi ngay trên thiết bị này"
                >
                  🎮 Báo danh thi đấu
                </button>
              )}
            </div>
          ) : (
            <p className={styles.waitingMsg}>⏳ Vui lòng chờ Giáo Viên bắt đầu...</p>
          )}
        </div>
      </div>

      {/* ── Right Panel: Settings Sidebar ── */}
      {isHost && (
        <div className={styles.settingsSidebar}>
          
          <div className={styles.settingsGroup}>
            <h3 className={styles.settingsTitle}>Sound</h3>
            
            <div className={styles.sliderRow}>
              <label>Music</label>
              <input type="range" min="0" max="100" value={settings.musicVolume} onChange={(e) => updateSetting('musicVolume', parseInt(e.target.value))} className={styles.customSlider} />
            </div>
            
            <div className={styles.sliderRow}>
              <label>Voice</label>
              <input type="range" min="0" max="100" value={settings.voiceVolume} onChange={handleVoiceSliderChange} className={styles.customSlider} />
            </div>
            
            <div className={styles.sliderRow}>
              <label>Effects</label>
              <input type="range" min="0" max="100" value={settings.effectsVolume} onChange={handleEffectSliderChange} className={styles.customSlider} />
            </div>
          </div>

          <div className={styles.settingsGroup}>
            <h3 className={styles.settingsTitle}>Gameplay</h3>
            
            <label className={styles.toggleRow} style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Trình chiếu màn hình</span>
                <span className={styles.toggleDesc}>Tắt đi nếu bạn muốn chơi cùng trên máy này</span>
              </div>
              <input 
                type="checkbox" 
                checked={settings.shareScreen} 
                onChange={(e) => {
                  if (e.target.checked && myPlayer && myPlayer.player_name !== 'Host Teacher') {
                    setShowCancelHostPrompt(true);
                  } else {
                    updateSetting('shareScreen', e.target.checked);
                  }
                }} 
                className={styles.customToggle} 
              />
            </label>

            <label className={styles.toggleRow} style={{ marginBottom: settings.teamMode ? 8 : 16 }}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Team mode <span className={styles.badgeNew}>NEW!</span></span>
                <span className={styles.toggleDesc}>Người chơi chia đội thi đấu</span>
              </div>
              <input type="checkbox" checked={settings.teamMode} onChange={(e) => updateSetting('teamMode', e.target.checked)} className={styles.customToggle} />
            </label>
            
            {settings.teamMode && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Số lượng Đội:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input 
                      type="number"
                      min="2"
                      max="10"
                      value={numTeams} 
                      onChange={(e) => setNumTeams(Math.max(2, parseInt(e.target.value) || 2))}
                      style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 8, outline: 'none', fontWeight: 600, width: 70, textAlign: 'center' }}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleReshuffleTeams}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', outline: 'none', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                >
                  🎲 Sắp Xếp Lại Đội Hình
                </button>
              </div>
            )}

            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Hide leaderboard</span>
                <span className={styles.toggleDesc}>Ẩn bảng xếp hạng trong lúc chơi</span>
              </div>
              <input type="checkbox" checked={settings.hideLeaderboard} onChange={(e) => updateSetting('hideLeaderboard', e.target.checked)} className={styles.customToggle} />
            </label>
            
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Mute sound on players</span>
                <span className={styles.toggleDesc}>Tắt mọi âm thanh trên máy học sinh</span>
              </div>
              <input type="checkbox" checked={settings.mutePlayers} onChange={(e) => updateSetting('mutePlayers', e.target.checked)} className={styles.customToggle} />
            </label>
            
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Optimize performance</span>
                <span className={styles.toggleDesc}>Tắt pháo hoa, hoạt ảnh nền</span>
              </div>
              <input type="checkbox" checked={settings.optimizePerformance} onChange={(e) => updateSetting('optimizePerformance', e.target.checked)} className={styles.customToggle} />
            </label>
          </div>
          
          <div className={styles.settingsGroup}>
            <h3 className={styles.settingsTitle}>Safety</h3>
            
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Only safe player names</span>
                <span className={styles.toggleDesc}>Hệ thống tự động lọc tên phản cảm</span>
              </div>
              <input type="checkbox" checked={settings.safePlayerNames} onChange={(e) => updateSetting('safePlayerNames', e.target.checked)} className={styles.customToggle} />
            </label>
            
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleName}>Ban kicked players</span>
                <span className={styles.toggleDesc}>Người bị kick không thể join lại</span>
              </div>
              <input type="checkbox" checked={settings.banKicked} onChange={(e) => updateSetting('banKicked', e.target.checked)} className={styles.customToggle} />
            </label>
          </div>

        </div>
      )}

      {/* ── Host Join Modal ── */}
      {showHostJoin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1b4b', border: '2px solid rgba(255,255,255,0.2)', padding: 32, borderRadius: 24, width: 400, textAlign: 'center' }}>
            <h2 style={{ color: 'white', marginBottom: 24, fontFamily: 'var(--font-display)' }}>Báo Danh Thi Đấu</h2>
            <div 
              style={{ width: 80, height: 80, cursor: 'pointer', marginBottom: 16, userSelect: 'none', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }} 
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
              <AvatarDisplay avatar={hostJoinAvatar} className={styles.playerAvatar} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>Click avatar để đổi</p>
            <input 
              type="text" 
              value={hostJoinName} 
              onChange={e => setHostJoinName(e.target.value)} 
              placeholder="Nhập tên của bạn..."
              autoFocus
              style={{ 
                width: '100%', padding: '16px 20px', borderRadius: 14, 
                border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', 
                color: 'white', fontSize: 18, fontWeight: 700, outline: 'none', 
                fontFamily: 'var(--font-display)', marginBottom: 20 
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowHostJoin(false)}
                style={{ flex: 1, padding: 14, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16 }}
              >
                Hủy
              </button>
              <button 
                onClick={async () => {
                  if (!hostJoinName.trim() || !playerId) return;
                  
                  if (mp && mp.updatePlayerProfile) {
                    await mp.updatePlayerProfile(hostJoinName, hostJoinAvatar);
                  } else {
                    // Fallback just in case
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.from('mg_room_players').update({ player_name: hostJoinName, avatar_emoji: hostJoinAvatar }).eq('id', playerId);
                  }
                  
                  setShowHostJoin(false);
                }}
                disabled={!hostJoinName.trim()}
                style={{ flex: 1, padding: 14, background: hostJoinName.trim() ? 'linear-gradient(135deg, #6C5CE7, #a29bfe)' : 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16 }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Cancel Playing Host Modal ── */}
      {showCancelHostPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1b4b', border: '2px solid rgba(255,255,255,0.2)', padding: 32, borderRadius: 24, width: 420, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontFamily: 'var(--font-display)' }}>Xác Nhận Trình Chiếu</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 32, lineHeight: 1.5 }}>
              Bật chế độ Trình chiếu sẽ hủy tư cách người chơi hiện tại của bạn. Bạn có muốn tiếp tục?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowCancelHostPrompt(false)}
                style={{ flex: 1, padding: 14, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16 }}
              >
                Quay Lại
              </button>
              <button 
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
                style={{ flex: 1, padding: 14, background: 'linear-gradient(135deg, #ff4757, #ff6b81)', color: 'white', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16 }}
              >
                Tiếp Tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kick/Ban Player Modal ── (independent of QR modal) */}
      {selectedPlayerForKick && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }} onClick={() => setSelectedPlayerForKick(null)}>
          <div style={{
            background: 'linear-gradient(135deg, #1e1e3a, #2a2a4a)',
            border: '2px solid rgba(255,255,255,0.15)',
            borderRadius: 24, padding: '32px 28px', maxWidth: 380, width: '90%',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'playerJoin 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <AvatarDisplay avatar={selectedPlayerForKick.avatar_emoji} className={styles.playerAvatar} />
            </div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              {selectedPlayerForKick.player_name}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
              Bạn muốn xử lý người chơi này?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  mp.hostKickPlayer(selectedPlayerForKick.id, false);
                  setSelectedPlayerForKick(null);
                }}
                style={{
                  background: 'linear-gradient(135deg, #f39c12, #f1c40f)',
                  color: '#1a1a2e', border: 'none', borderRadius: 14,
                  padding: '14px 20px', fontSize: 16, fontWeight: 800,
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                👞 Đuổi khỏi phòng (Kick)
              </button>
              <button
                onClick={() => {
                  mp.hostKickPlayer(selectedPlayerForKick.id, true);
                  setSelectedPlayerForKick(null);
                }}
                style={{
                  background: 'linear-gradient(135deg, #e74c3c, #ff6b6b)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '14px 20px', fontSize: 16, fontWeight: 800,
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                ⛔ Cấm vĩnh viễn (Ban)
              </button>
              <button
                onClick={() => setSelectedPlayerForKick(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14,
                  padding: '12px 20px', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', marginTop: 4, transition: 'all 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
