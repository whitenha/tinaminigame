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
  const [activeTab, setActiveTab] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

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

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa bản lưu này không? Hành động này không thể hoàn tác.')) {
      try {
        const { error } = await supabase
          .from('mg_activities')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setActivities(activities.filter(a => a.id !== id));
        showToast('Đã xóa thành công!');
      } catch (err) {
        console.error('Error deleting activity:', err);
        alert('Lỗi khi xóa bài viết.');
      }
    }
  };

  const getShareLink = (code) => {
    return `${window.location.origin}/play/${code}`;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const toggleMenu = (id) => {
    setOpenMenuId(prev => prev === id ? null : id);
  };

  if (loading || dataLoading) {
    return <div className={styles.loadingContainer}>Đang tải Bàn làm việc...</div>;
  }

  if (!isTeacher) return null;

  // Tách Tools và Games
  const games = activities.filter(a => a.template_slug !== 'viet-bai');
  const tools = activities.filter(a => a.template_slug === 'viet-bai');

  let displayedActivities = activities;
  if (activeTab === 'games') displayedActivities = games;
  if (activeTab === 'tools') displayedActivities = tools;

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      <div className={`${styles.toast} ${toastMessage ? styles.toastVisible : ''}`}>
        ✅ {toastMessage}
      </div>

      {/* Stats Banner */}
      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{activities.length}</span>
          <span className={styles.statLabel}>Tổng tài sản</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{games.length}</span>
          <span className={styles.statLabel}>Trò Chơi</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{tools.length}</span>
          <span className={styles.statLabel}>Bản Nháp Vở</span>
        </div>
      </div>

      <section className={styles.main}>
        {/* Animated Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất Cả
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'games' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('games')}
            >
              🎮 Trò Chơi
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'tools' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              🛠️ Công Cụ
            </button>
          </div>
        </div>
        
        {displayedActivities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Không có dữ liệu khóa học nào ở mục này.</p>
            <Link href="/templates" className={styles.primaryLink}>
              Khám phá Kho Templates
            </Link>
          </div>
        ) : (
          <div className={styles.listContainer}>
            {displayedActivities.map((act) => {
              const checkTool = act.template_slug === 'viet-bai';
              const template = getTemplateBySlug(act.template_slug);
              
              return (
                <div 
                  key={act.id} 
                  className={styles.listItem}
                  style={{ zIndex: openMenuId === act.id ? 50 : 1 }}
                >
                  <div className={styles.itemLeft}>
                    <div className={styles.itemInfo}>
                      <h3 className={styles.itemTitle}>
                        {act.title}
                      </h3>
                      <div className={styles.itemMeta}>
                        <span 
                          className={styles.cardBadge} 
                          style={{ backgroundColor: template?.color || (checkTool ? '#3b82f6' : '#94a3b8') }}
                        >
                          {template?.nameVi || (checkTool ? 'Vở Luyện Viết' : 'Trò Chơi')}
                        </span>
                        <span className={styles.cardDate}>
                          🕒 {new Date(act.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.itemRight} data-dropdown="true">
                    <button 
                      className={styles.menuBtn} 
                      onClick={() => toggleMenu(act.id)}
                    >
                      ⋮
                    </button>

                    {openMenuId === act.id && (
                      <>
                        <div 
                          className={styles.menuOverlay}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        />
                        <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        {!checkTool && (
                          <button 
                            className={styles.dropdownItem}
                            onClick={() => {
                              navigator.clipboard.writeText(getShareLink(act.share_code));
                              showToast('Đã copy link học sinh!');
                            }}
                          >
                            🔗 Copy Link Nhỏ
                          </button>
                        )}
                        
                        {checkTool ? (
                          <Link href={`/tools/viet-bai/u1/${act.share_code}`} className={styles.dropdownItem}>
                            ✏️ Mở Vở Tiếp Tục
                          </Link>
                        ) : (
                          <>
                            <Link href={`/dashboard/results/${act.id}`} className={styles.dropdownItem}>
                              📊 Xem Kết Quả
                            </Link>
                            <Link href={`/create/${act.template_slug}?edit=${act.id}`} className={styles.dropdownItem}>
                              ⚙️ Cài Đặt Game
                            </Link>
                          </>
                        )}
                        
                        <button 
                          className={`${styles.dropdownItem} ${styles.dropdownItemDelete}`}
                          onClick={() => handleDelete(act.id)}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                      </>
                    )}
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
