'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTemplateBySlug } from '@/data/templates';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isTeacher, loading } = useAuth();
  const router = useRouter();
  
  // Data State
  const [activities, setActivities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Folder State
  const [currentFolder, setCurrentFolder] = useState(null);
  const [emptyFolders, setEmptyFolders] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModalFor, setShowMoveModalFor] = useState(null); // act.id

  useEffect(() => {
    if (!loading && !isTeacher) {
      router.push('/login');
    }
  }, [loading, isTeacher, router]);

  useEffect(() => {
    if (user) {
      fetchMyActivities();
      // Load empty folders from localStorage
      const saved = localStorage.getItem(`folders_${user.id}`);
      if (saved) setEmptyFolders(JSON.parse(saved));
    }
  }, [user]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyLink = async (act) => {
    try {
      const checkTool = act.template_slug === 'viet-bai';
      
      let linkToCopy = `${window.location.origin}/${act.id}`;
      if (checkTool) {
        linkToCopy = `${window.location.origin}/tools/viet-bai/u1/${act.share_code}`;
      }
      
      await navigator.clipboard.writeText(linkToCopy);
      showToast('Đã sao chép đường link!');
      setOpenMenuId(null);
    } catch (err) {
      alert('Không thể sao chép link. Vui lòng thử lại.');
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setTimeout(() => {
      setOpenMenuId(prev => prev === id ? null : id);
    }, 10);
  };

  // --- Folder Logic ---
  // Get all unique folders
  const allFolders = useMemo(() => {
    const set = new Set();
    activities.forEach(a => {
      if (a.settings?.folder_id) set.add(a.settings.folder_id);
    });
    emptyFolders.forEach(f => set.add(f));
    return Array.from(set).sort();
  }, [activities, emptyFolders]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const fName = newFolderName.trim();
    if (!allFolders.includes(fName)) {
      const updated = [...emptyFolders, fName];
      setEmptyFolders(updated);
      localStorage.setItem(`folders_${user.id}`, JSON.stringify(updated));
    }
    setNewFolderName('');
    setShowFolderModal(false);
    showToast('Đã tạo thư mục mới!');
  };

  const executeMove = async (folderName) => {
    if (!showMoveModalFor) return;
    const actId = showMoveModalFor;
    const act = activities.find(a => a.id === actId);
    if (!act) return;

    try {
      const newSettings = { ...(act.settings || {}), folder_id: folderName === 'ROOT' ? null : folderName };
      const { error } = await supabase
        .from('mg_activities')
        .update({ settings: newSettings })
        .eq('id', actId);

      if (error) throw error;
      
      setActivities(prev => prev.map(a => a.id === actId ? { ...a, settings: newSettings } : a));
      setShowMoveModalFor(null);
      showToast('Đã chuyển di chuyển thành công!');
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi di chuyển.');
    }
  };

  // --- Filter Logic ---
  const games = activities.filter(a => a.template_slug !== 'viet-bai');
  const tools = activities.filter(a => a.template_slug === 'viet-bai');

  let filteredActivities = activities;
  if (activeTab === 'games') filteredActivities = games;
  if (activeTab === 'tools') filteredActivities = tools;

  if (searchQuery) {
    filteredActivities = filteredActivities.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  // Filter by Folder
  const displayedFolders = currentFolder === null && !searchQuery ? allFolders : [];
  const displayedFiles = filteredActivities.filter(a => {
    if (searchQuery) return true; // Show all matches if searching
    const f = a.settings?.folder_id || null;
    return f === currentFolder;
  });

  if (loading || dataLoading) {
    return <div className={styles.loadingContainer}>Đang tải Bàn làm việc...</div>;
  }

  if (!isTeacher) return null;

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      <div className={`${styles.toast} ${toastMessage ? styles.toastVisible : ''}`}>
        ✅ {toastMessage}
      </div>


      <section className={styles.main}>
        {/* Toolbar & Search */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Tìm kiếm trò chơi rèn luyện..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className={styles.controls}>
            <select 
              className={styles.filterSelect}
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              <option value="all">Tất Cả Loại</option>
              <option value="games">🎮 Trò Chơi</option>
              <option value="tools">🛠️ Công Cụ</option>
            </select>

            <div className={styles.viewToggle}>
              <button 
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
                title="Dạng lưới"
              >
                ⊞
              </button>
              <button 
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              >
                ≣
              </button>
            </div>

            {currentFolder === null && !searchQuery && (
              <button className={styles.createFolderBtn} onClick={() => setShowFolderModal(true)}>
                + Thư mục mới
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        {!searchQuery && (
          <div className={styles.breadcrumbs}>
            <button className={styles.breadcrumbBtn} onClick={() => setCurrentFolder(null)}>
              🗂️ Bàn làm việc
            </button>
            {currentFolder && (
              <>
                <span style={{ color: '#94a3b8' }}>/</span>
                <span className={styles.breadcrumbActive}>📁 {currentFolder}</span>
              </>
            )}
          </div>
        )}

        {/* Render Grid or List */}
        <div className={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
          
          {/* FOLDERS (Only root) */}
          {displayedFolders.map(folder => (
            <div 
              key={folder} 
              className={viewMode === 'grid' ? styles.gridItem : styles.listItem}
              onClick={() => setCurrentFolder(folder)}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className={styles.gridItemIcon}>📁</div>
                  <div className={styles.gridItemName}>{folder}</div>
                  <div className={styles.gridItemMeta}>
                    {activities.filter(a => a.settings?.folder_id === folder).length} mục
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.listItemIcon}>📁</div>
                  <div className={styles.listItemContent}>
                    <div className={styles.listItemName}>{folder}</div>
                    <div className={styles.listItemMeta}>
                      {activities.filter(a => a.settings?.folder_id === folder).length} mục
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* FILES (Activities) */}
          {displayedFiles.map(act => {
            const checkTool = act.template_slug === 'viet-bai';
            const template = getTemplateBySlug(act.template_slug);
            const icon = checkTool ? '📝' : (template?.isTool ? '🛠️' : '🎮');

            const handleFileClick = () => {
              if (checkTool) router.push(`/tools/viet-bai/u1/${act.share_code}`);
              else router.push(`/${act.id}`);
            };

            return (
              <div 
                key={act.id} 
                className={viewMode === 'grid' ? styles.gridItem : styles.listItem}
                onClick={handleFileClick}
              >
                {/* Badge Overlay for Grid */}
                {viewMode === 'grid' && (
                  <div className={styles.gridBadge} style={{ backgroundColor: template?.color || '#3b82f6' }}>
                    {template?.nameVi || 'Khác'}
                  </div>
                )}

                {/* File Render */}
                {viewMode === 'grid' ? (
                  <>
                    <div className={styles.gridItemIcon}>{icon}</div>
                    <div className={styles.gridItemName}>{act.title}</div>
                    <div className={styles.gridItemMeta}>
                      {new Date(act.created_at).toLocaleDateString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.listItemIcon} style={{ fontSize: '32px' }}>{icon}</div>
                    <div className={styles.listItemContent}>
                      <div className={styles.listItemName}>{act.title}</div>
                      <div className={styles.listItemMeta}>
                        <span className={styles.cardBadge} style={{ backgroundColor: template?.color || '#3b82f6' }}>
                           {template?.nameVi || 'Khác'}
                        </span>
                        <span>{new Date(act.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Dropdown Menu (Three Dots) - Works in Both modes */}
                <div className={styles.itemRight}>
                  <button className={styles.menuBtn} onClick={(e) => toggleMenu(e, act.id)}>
                    ⋮
                  </button>
                  {openMenuId === act.id && (
                    <div className={styles.dropdownMenu} onClick={e => e.stopPropagation()}>
                       <div 
                         className={styles.dropdownItem} 
                         onClick={() => {
                           if (checkTool) router.push(`/tools/viet-bai/u1/${act.share_code}`);
                           else router.push(`/${act.id}`);
                           setOpenMenuId(null);
                         }}
                       >
                         ▶️ Mở / Chơi
                       </div>
                       <Link href={`/create/${act.template_slug}?edit=${act.id}`} className={styles.dropdownItem}>
                         ✏️ Chỉnh sửa
                       </Link>
                       <div 
                         className={styles.dropdownItem} 
                         onClick={() => handleCopyLink(act)}
                       >
                         🔗 Sao chép link
                       </div>
                       <div 
                         className={styles.dropdownItem} 
                         onClick={() => {
                           setShowMoveModalFor(act.id);
                           setOpenMenuId(null);
                         }}
                       >
                         🗂️ Chuyển thư mục
                       </div>
                       <div className={`${styles.dropdownItem} ${styles.dropdownItemDelete}`} onClick={() => handleDelete(act.id)}>
                         🗑️ Xóa bản lưu
                       </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
        </div>

        {/* Empty State */}
        {displayedFolders.length === 0 && displayedFiles.length === 0 && (
          <div className={styles.emptyState}>
            <p style={{ fontSize: '60px', marginBottom: '16px' }}>📭</p>
            <p>Thư mục này chưa có dữ liệu nào.</p>
            {currentFolder === null && (
              <Link href="/templates" className={styles.primaryLink}>
                Khám phá Kho Templates
              </Link>
            )}
          </div>
        )}
      </section>

      {/* --- CREATE FOLDER MODAL --- */}
      {showFolderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFolderModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Tạo thư mục mới</h3>
            <input 
              type="text" 
              className={styles.modalInput} 
              placeholder="VD: Khối Tiếng Anh Lớp 5"
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className={styles.modalActions}>
              <button className={styles.modalBtnSecondary} onClick={() => setShowFolderModal(false)}>Hủy</button>
              <button className={styles.modalBtnPrimary} onClick={handleCreateFolder}>Tạo</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOVE FILE MODAL --- */}
      {showMoveModalFor && (
        <div className={styles.modalOverlay} onClick={() => setShowMoveModalFor(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Chuyển đến...</h3>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              <div 
                style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}
                onClick={() => executeMove('ROOT')}
              >
                <span>🗂️</span> <b>Bàn làm việc (Gốc)</b>
              </div>
              {allFolders.map(folder => (
                <div 
                  key={folder}
                  style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}
                  onClick={() => executeMove(folder)}
                >
                  <span>📁</span> {folder}
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnSecondary} onClick={() => setShowMoveModalFor(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
