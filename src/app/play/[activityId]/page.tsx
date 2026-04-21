'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMultiplayerRoom } from '@/lib/useMultiplayerRoom';
import useRoomStore from '@/lib/multiplayer/roomStore';
import { ActiveMultiplayerRoom } from '@/components/Multiplayer';
import styles from '@/components/Multiplayer/MultiplayerRoom.module.css';

export default function HostRoomPage({ params }: any) {
  const [urlParam, setUrlParam] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const hasCreatedRoomRef = useRef(false);

  // Aggressively clear any lingering room state from memory on mount
  useEffect(() => {
    // @ts-ignore
    useRoomStore.getState().resetStore();
  }, []);

  // ── Multiplayer hook (use real UUID, not URL param) ────────
  const mp = useMultiplayerRoom(activity?.id || null);

  // Resolve params
  useEffect(() => {
    Promise.resolve(params).then(p => {
      setUrlParam(p.activityId);
    });
  }, [params]);

  // Fetch activity
  useEffect(() => {
    if (!urlParam) return;
    const fetchGame = async () => {
      setLoading(true);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlParam);

      const { data: act, error: actError } = await supabase
        .from('mg_activities')
        .select('*')
        .eq(isUUID ? 'id' : 'share_code', urlParam)
        .single();
      
      if (actError || !act) { 
        setError('Không tìm thấy trò chơi.'); 
        setLoading(false); 
        return; 
      }
      setActivity(act);

      const { data: contentItems } = await supabase
        .from('mg_content_items').select('*').eq('activity_id', act.id)
        .order('position_index', { ascending: true });
      if (contentItems) setItems(contentItems);
      
      setLoading(false);
    };
    fetchGame();
  }, [urlParam]);

  // Create room automatically as Host
  useEffect(() => {
    if (loading || !activity || hasCreatedRoomRef.current) return;
    
    let extraSettings = {};
    if (activity.settings?.shuffle_questions && items.length > 0) {
      const shuffledMap = items.map((_, i) => i);
      for (let i = shuffledMap.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledMap[i], shuffledMap[j]] = [shuffledMap[j], shuffledMap[i]];
      }
      // @ts-ignore
      extraSettings.shuffledMap = shuffledMap;
    }
    
    hasCreatedRoomRef.current = true;
    // Auto create room as "Host"
    mp.createRoom('Host Teacher', extraSettings);
  }, [loading, activity, items, mp.createRoom]);

  if (loading || (!mp.roomId && !error)) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tạo phòng chơi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <span className={styles.errorEmoji}>😕</span>
        <p>{error}</p>
      </div>
    );
  }

  if (mp.error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
        color: 'white',
        fontFamily: 'var(--font-sans)',
        padding: 24,
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 24,
          padding: '48px 32px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🔌</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: '#ff6b6b' }}>
            Mất Kết Nối
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, lineHeight: 1.5 }}>
            {mp.error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: 'linear-gradient(135deg, #0984E3, #74b9ff)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: 16,
              fontWeight: 800,
              fontSize: 18,
              cursor: 'pointer',
              width: '100%',
              boxShadow: '0 8px 16px rgba(9, 132, 227, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(9, 132, 227, 0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(9, 132, 227, 0.3)'; }}
          >
            🔄 Tải lại trang (Thử lại)
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActiveMultiplayerRoom 
      mp={mp} 
      items={items} 
      activity={activity} 
      playerName="Host Teacher" 
    />
  );
}

// Trigger recompile
