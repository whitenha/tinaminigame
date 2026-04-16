'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/i18n/LanguageContext';
import Icon from '@/components/Icon/Icon';
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
  const { t } = useLanguage();

  // Randomize avatar on client mount
  useEffect(() => {
    setPlayerAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  }, []);

  const handleJoinRoom = async (e: any) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError(t('play.pin.require'));
      return;
    }
    if (!playerName.trim()) {
      setError(t('play.name.require'));
      return;
    }

    const upperCode = roomCode.trim().toUpperCase();

    setLoading(true);
    setError('');
    
    // Safety check
    if (typeof window !== 'undefined' && localStorage.getItem(`tina_banned_room_${upperCode}`)) {
      setError(t('play.banned'));
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
        setError(t('play.notfound'));
        setLoading(false);
        return;
      }

      if (room.status === 'finished') {
        setError(t('play.finished'));
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
          setError(t('play.duplicate').replace('{name}', playerName.trim()));
          setLoading(false);
          return;
        }
      }

      router.push(`/${upperCode}?name=${encodeURIComponent(playerName.trim())}&avatar=${encodeURIComponent(playerAvatar)}`);
    } catch (err: any) {
      setError(t('play.error'));
      setLoading(false);
    }
  };

  return (
    <div className={joinStyles.joinPage}>
      <div className={joinStyles.cyberGrid}></div>
      <div className={joinStyles.joinCard}>
        <form onSubmit={handleJoinRoom}>
          <div className={joinStyles.sectionTitle}>{t('play.step1')}</div>
          <div className={joinStyles.nameInputWrapper}>
            <input
              type="text"
              placeholder={t('play.step1.placeholder')}
              value={roomCode}
              onChange={(e) => setRoomCode((e.target as any).value.toUpperCase())}
              maxLength={6}
              className={joinStyles.nameInput}
              style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 900, textAlign: 'center' }}
              autoComplete="off"
            />
          </div>

          <div className={joinStyles.sectionTitle} style={{marginTop: 24}}>{t('play.step2')}</div>
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

          <div className={joinStyles.sectionTitle} style={{marginTop: 24}}>{t('play.step3')}</div>
          <div className={joinStyles.nameInputWrapper}>
            <input
              type="text"
              placeholder={t('play.step3.placeholder')}
              value={playerName}
              onChange={(e) => setPlayerName((e.target as any).value)}
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
            {loading ? t('play.btn.loading') : (
              <>
                <Icon name="play" size={24} /> {t('play.btn.join')}
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Error Modal Overlay ──────────────────────────── */}
      {error && (
        <div className={joinStyles.errorOverlay}>
          <div className={joinStyles.errorModal}>
            <div className={joinStyles.errorModalIcon}>
              <Icon name="warning" size={64} color="var(--color-red)" />
            </div>
            <h3 className={joinStyles.errorModalTitle}>
              {t('play.modal.title')}
            </h3>
            <p className={joinStyles.errorModalText}>
              {error}
            </p>
            <button
              onClick={() => { setError(''); setLoading(false); }}
              className={joinStyles.errorModalBtn}
            >
              <Icon name="check" size={20} /> {t('play.modal.btn')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
