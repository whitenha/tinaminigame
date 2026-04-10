'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import joinStyles from '@/app/[id]/JoinRoom.module.css';

const AVATARS = [
  '/avatars/avatar_1.png', '/avatars/avatar_2.png', 
  '/avatars/avatar_3.png', '/avatars/avatar_4.png', 
  '/avatars/avatar_5.png', '/avatars/avatar_6.png', 
  '/avatars/avatar_7.png', '/avatars/avatar_8.png'
];

export default function GlobalJoinRoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Randomize avatar on client mount
  useEffect(() => {
    setPlayerAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  }, []);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('Vui lòng nhập mã phòng!');
      return;
    }
    if (!playerName.trim()) {
      setError('Vui lòng nhập biệt danh!');
      return;
    }

    const upperCode = roomCode.trim().toUpperCase();

    setLoading(true);
    setError('');
    
    // Safety check
    if (typeof window !== 'undefined' && localStorage.getItem(`tina_banned_room_${upperCode}`)) {
      setError('Bạn đã bị cấm khỏi phòng này!');
      setLoading(false);
      return;
    }

    try {
      const { data: room, error: roomError } = await supabase
        .from('mg_rooms')
        .select('status')
        .eq('id', upperCode)
        .maybeSingle();

      if (roomError || !room) {
        setError('Mã phòng không tồn tại hoặc đã kết thúc!');
        setLoading(false);
        return;
      }

      if (room.status === 'finished') {
        setError('Chơi này đã kết thúc!');
        setLoading(false);
        return;
      }

      // Check for duplicate name (case-insensitive) before redirecting
      const { data: playersWithSameName } = await supabase
        .from('mg_room_players')
        .select('id')
        .eq('room_id', upperCode)
        .ilike('player_name', playerName.trim());

      if (playersWithSameName && playersWithSameName.length > 0) {
        // Check if this is a reconnection (same device)
        const savedPlayerId = localStorage.getItem(`tina_player_session_${upperCode}`);
        const isReconnection = playersWithSameName.some(p => p.id === savedPlayerId);
        
        if (!isReconnection) {
          setError(`Tên "${playerName.trim()}" đã có người sử dụng trong phòng! Vui lòng chọn tên khác.`);
          setLoading(false);
          return;
        }
      }

      router.push(`/${upperCode}?name=${encodeURIComponent(playerName.trim())}&avatar=${encodeURIComponent(playerAvatar)}`);
    } catch(err) {
      setError('Lỗi máy chủ, vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className={joinStyles.joinPage}>
      <div className={joinStyles.cyberGrid}></div>
      <div className={joinStyles.joinCard}>
        <form onSubmit={handleJoinRoom}>
          <div className={joinStyles.sectionTitle}>1. NHẬP MÃ PHÒNG</div>
          <div className={joinStyles.nameInputWrapper}>
            <input
              type="text"
              placeholder="VD: BF23NT"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className={joinStyles.nameInput}
              style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 900, textAlign: 'center' }}
              autoComplete="off"
            />
          </div>

          <div className={joinStyles.sectionTitle} style={{marginTop: 24}}>2. CHỌN NHÂN VẬT</div>
          <div className={joinStyles.avatarGrid}>
            {AVATARS.map((avatar, idx) => (
              <div 
                key={idx}
                className={`${joinStyles.avatarBtn} ${playerAvatar === avatar ? joinStyles.avatarActive : ''}`}
                onClick={() => setPlayerAvatar(avatar)}
              >
                <img src={avatar} alt={`Avatar ${idx+1}`} className={joinStyles.avatarImage} />
              </div>
            ))}
          </div>

          <div className={joinStyles.sectionTitle} style={{marginTop: 24}}>3. NHẬP BIỆT DANH</div>
          <div className={joinStyles.nameInputWrapper}>
            <input
              type="text"
              placeholder="Tên của bạn là gì?"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className={joinStyles.nameInput}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <button 
            type="submit" 
            className={joinStyles.joinBtn}
            disabled={!playerName.trim() || !roomCode.trim() || loading}
          >
            {loading ? 'Đang kiểm tra...' : '🚀 VÀO PHÒNG NGAY'}
          </button>
        </form>
      </div>

      {/* ── Error Modal Overlay ──────────────────────────── */}
      {error && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.2s ease',
        }}>
          <style>{`
            @keyframes shakeWarning {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
              20%, 40%, 60%, 80% { transform: translateX(6px); }
            }
          `}</style>
          <div style={{
            background: 'linear-gradient(135deg, #2a2214, #3d3119)',
            border: '2px solid rgba(255, 193, 7, 0.4)',
            borderRadius: 24, padding: '36px 28px', maxWidth: 380, width: '100%',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'shakeWarning 0.5s ease-in-out'
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: '#FFC107', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
              Không thể vào phòng!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
              {error}
            </p>
            <button
              onClick={() => { setError(''); setLoading(false); }}
              style={{
                background: 'linear-gradient(135deg, #FFC107, #FFD54F)',
                color: '#1a1a2e', border: 'none', borderRadius: 14,
                padding: '14px 0', width: '100%', fontSize: 16, fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 6px 20px rgba(255, 193, 7, 0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.4)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.3)'; }}
            >
              ✅ Đã hiểu, để tôi thử lại
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
