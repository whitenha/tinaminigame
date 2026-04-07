'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTemplateBySlug } from '@/data/templates';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isTeacher, loading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isTeacher) {
      router.push('/login');
    }
  }, [loading, isTeacher, router]);

  useEffect(() => {
    if (user) {
      fetchMyActivities();
    }
  }, [user]);

  const fetchMyActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('mg_activities')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const getShareLink = (code) => {
    return `${window.location.origin}/play/${code}`;
  };

  if (loading || dataLoading) {
    return <div className={styles.loadingContainer}>Đang tải dữ liệu...</div>;
  }

  if (!isTeacher) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Bảng Điều Khiển Giáo Viên</h1>
          <p className={styles.subtitle}>Chào mừng, {user.email}</p>
        </div>
        <Link href="/templates" className={styles.createButton}>
          ✨ Tạo trò chơi mới
        </Link>
      </header>

      <section className={styles.main}>
        <h2 className={styles.sectionTitle}>Các trò chơi của tôi ({activities.length})</h2>
        
        {activities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Bạn chưa tạo trò chơi nào.</p>
            <Link href="/templates" className={styles.primaryLink}>
              Khám phá Kho Templates
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {activities.map((act) => {
              const template = getTemplateBySlug(act.template_slug);
              return (
                <div key={act.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span 
                      className={styles.cardBadge} 
                      style={{ backgroundColor: template?.color || '#ccc' }}
                    >
                      {template?.nameVi || 'Game'}
                    </span>
                    <span className={styles.cardDate}>
                      {new Date(act.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>{act.title}</h3>
                  <div className={styles.cardActions}>
                    <div className={styles.shareBox}>
                      <span className={styles.shareLabel}>Link chơi sinh viên:</span>
                      <input 
                        type="text" 
                        readOnly 
                        value={getShareLink(act.share_code)} 
                        className={styles.shareInput}
                        onClick={(e) => {
                          e.target.select();
                          navigator.clipboard.writeText(e.target.value);
                          alert('Đã copy link!');
                        }}
                      />
                    </div>
                    <div className={styles.buttonGroup}>
                      <Link href={`/dashboard/results/${act.id}`} className={styles.actionBtn}>
                        📊 Xem kết quả
                      </Link>
                      <Link href={`/create/${act.template_slug}?edit=${act.id}`} className={styles.actionBtnSecondary}>
                        ✏️ Sửa
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
