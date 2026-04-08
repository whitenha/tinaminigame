'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './notebook.module.css';

export default function VietBaiIndex() {
  const router = useRouter();
  const { isTeacher, loading } = useAuth();
  
  useEffect(() => {
    if (loading) return;
    
    // Create a unique local ID for this session
    // For u0 it's just a local session. For u1 it might eventually become a DB row id
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const authType = isTeacher ? 'u1' : 'u0';
    
    // Redirect to the dynamic route
    router.replace(`/tools/viet-bai/${authType}/${newId}`);
  }, [loading, isTeacher, router]);

  return (
    <div className={styles.container} style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <h2>Đang chuẩn bị trang viết...</h2>
        <p>Vui lòng đợi giây lát</p>
      </div>
    </div>
  );
}
