'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Supabase JS client automatically parses the `#access_token` in the URL
    // and updates the session in AuthContext. Once loading is done, we redirect.
    if (!loading) {
      if (user) {
        router.push('/dashboard'); // Go to creator dashboard
      } else {
        router.push('/login'); // Fallback if parsing failed
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-0)',
      color: 'var(--color-primary)',
      fontFamily: 'var(--font-display)',
      fontWeight: '700',
      fontSize: 'var(--text-lg)',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid var(--border-default)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      Đang xử lý đăng nhập...
    </div>
  );
}
