'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getTemplateBySlug, TEMPLATES } from '@/data/templates';
import { resolvePlayerType } from '@/lib/gameRegistry';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import all players
const PLAYERS = {
  flashcards: dynamic(() => import('@/games/flashcards/FlashCardsPlayer')),
  speakingcards: dynamic(() => import('@/games/speakingcards/SpeakingCardsPlayer')),
  spinwheel: dynamic(() => import('@/games/spinwheel/SpinWheelPlayer')),
  candyjar: dynamic(() => import('@/games/candyjar/CandyJarPlayer')),
  // fallback for any other tools/games if needed
  quiz: dynamic(() => import('@/games/quiz/QuizPlayer')),
};

export default function StandaloneToolPlayer({ params }: any) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [id, setId] = useState<any>(null);

  useEffect(() => {
    Promise.resolve(params).then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // @ts-ignore
        const instantTemplate = TEMPLATES.find(t => t.slug === id && t.instantLaunch);
        if (instantTemplate) {
          setData({ template_slug: instantTemplate.slug, id: instantTemplate.slug, creator_id: user?.id });
          setItems([]); // empty list to start
          setLoading(false);
          return;
        }

        const { data: act, error: actErr } = await supabase
          .from('mg_activities').select('*').eq('id', id).single();

        if (actErr || !act) {
          setError('Không tìm thấy Công Cụ này.');
          setLoading(false); return;
        }

        setData(act);

        const { data: contentItems } = await supabase
          .from('mg_content_items').select('*').eq('activity_id', act.id)
          .order('position_index', { ascending: true });
          
        if (contentItems) setItems(contentItems);
      } catch (err: any) {
        console.error(err);
        setError('Lỗi kết nối.');
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading || authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1a1a2e', color: 'white', fontFamily: 'var(--font-sans)', flexDirection: 'column' }}>
        <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#ff6b6b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: 16 }}>Đang tải công cụ...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1a1a2e', color: 'white', flexDirection: 'column' }}>
        <span style={{ fontSize: 60, marginBottom: 16 }}>😕</span>
        <p style={{ fontSize: 20 }}>{error}</p>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#0984e3', color: 'white' }}>Về Bàn Làm Việc</button>
      </div>
    );
  }

  if (!data) return null;

  // Determine player type
  const templateSlug = data.template_slug || '';
  const playerType = resolvePlayerType(templateSlug) || 'quiz';
  
  // Find component
  // @ts-ignore
  const PlayerComponent = PLAYERS[playerType];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Floating Toolbar for Teacher */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 9999,
        display: 'flex',
        gap: 8,
      }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
        >
          <span>🏠</span> Bảng Điều Khiển
        </button>
        {user && user.id === data.creator_id && (
          <button 
            onClick={() => router.push(`/create/${data.template_slug}?edit=${data.id}`)}
            style={{
              background: 'rgba(255,255,255,0.9)',
              color: 'black',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>✏️</span> Chỉnh Sửa
          </button>
        )}
      </div>

      {/* Render Player Component */}
      {PlayerComponent ? (
        <PlayerComponent 
          items={items} 
          activity={data} 
          playerName={user ? (user.user_metadata?.full_name || 'Giáo viên') : 'Người chơi'} 
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'white', background: '#333' }}>
          Lỗi: Không tìm thấy giao diện trình chiếu cho công cụ này ({playerType}).
        </div>
      )}
    </div>
  );
}
