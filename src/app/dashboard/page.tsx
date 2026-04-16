'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTemplateBySlug } from '@/data/templates';
import { useLanguage } from '@/i18n/LanguageContext';
import Icon from '@/components/Icon/Icon';
import styles from './dashboard.module.css';

interface ActivityData {
  id: string | number;
  template_slug: string;
  creator_id?: string;
  created_at: string;
  title: string;
  share_code?: string;
  settings?: {
    folder_id?: string | null;
    [key: string]: any;
  };
}

export default function DashboardPage() {
  const { user, isTeacher, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  // Data State
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Folder State
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModalFor, setShowMoveModalFor] = useState<string | number | null>(null);

  useEffect(() => {
    if (!loading && !isTeacher) {
      router.push('/login');
    }
  }, [loading, isTeacher, router]);

  useEffect(() => {
    if (user) {
      fetchMyActivities();
      const saved = localStorage.getItem(`folders_${user.id}`);
      if (saved) setEmptyFolders(JSON.parse(saved));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchMyActivities = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('mg_activities')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Bạn có chắc chắn muốn xóa bản lưu này không? Hành động này không thể hoàn tác.')) {
      try {
        const { error } = await supabase
          .from('mg_activities')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setActivities(activities.filter(a => a.id !== id));
        showToast(t('dashboard.toast.deleted'));
      } catch (err: any) {
        console.error('Error deleting activity:', err);
        alert('Lỗi khi xóa bài viết.');
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyLink = async (act: ActivityData) => {
    try {
      const checkTool = act.template_slug === 'viet-bai';
      let linkToCopy = `${window.location.origin}/${act.id}`;
      if (checkTool) {
        linkToCopy = `${window.location.origin}/tools/viet-bai/u1/${act.share_code}`;
      }
      
      await navigator.clipboard.writeText(linkToCopy);
      showToast(t('dashboard.toast.copied'));
      setOpenMenuId(null);
    } catch (err: any) {
      alert('Không thể sao chép link. Vui lòng thử lại.');
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setTimeout(() => {
      setOpenMenuId(prev => prev === id ? null : id);
    }, 10);
  };

  const allFolders = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(a => {
      if (a.settings?.folder_id) set.add(a.settings.folder_id);
    });
    emptyFolders.forEach(f => set.add(f));
    return Array.from(set).sort();
  }, [activities, emptyFolders]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !user) return;
    const fName = newFolderName.trim();
    if (!allFolders.includes(fName)) {
      const updated = [...emptyFolders, fName];
      setEmptyFolders(updated);
      localStorage.setItem(`folders_${user.id}`, JSON.stringify(updated));
    }
    setNewFolderName('');
    setShowFolderModal(false);
    showToast(t('dashboard.toast.created'));
  };

  const executeMove = async (folderName: string) => {
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
      showToast(t('dashboard.toast.moved'));
    } catch (e: any) {
      console.error(e);
      alert('Có lỗi khi chuyển thư mục.');
    }
  };

  const games = activities.filter(a => a.template_slug !== 'viet-bai');
  const tools = activities.filter(a => a.template_slug === 'viet-bai');

  let filteredActivities = activities;
  if (activeTab === 'games') filteredActivities = games;
  if (activeTab === 'tools') filteredActivities = tools;

  if (searchQuery) {
    filteredActivities = filteredActivities.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  const displayedFolders = currentFolder === null && !searchQuery ? allFolders : [];
  const displayedFiles = filteredActivities.filter(a => {
    if (searchQuery) return true;
    const f = a.settings?.folder_id || null;
    return f === currentFolder;
  });

  if (loading || dataLoading) {
    return <div className={styles.loadingContainer}>{t('loading')}</div>;
  }

  if (!isTeacher) return null;

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      <div className={`${styles.toast} ${toastMessage ? styles.toastVisible : ''}`}>
        <Icon name="check" size={16} /> {toastMessage}
      </div>

      <section className={styles.main}>
        {/* Toolbar & Search */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><Icon name="search" size={20} /></span>
            <input 
              type="text" 
              placeholder={t('dashboard.search')} 
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
              <option value="all">{t('dashboard.filter.all')}</option>
              <option value="games">{t('dashboard.filter.games')}</option>
              <option value="tools">{t('dashboard.filter.tools')}</option>
            </select>

            <div className={styles.viewToggle}>
              <button 
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
                title="Dạng lưới"
              >
                <Icon name="grid" size={18} />
              </button>
              <button 
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              >
                <Icon name="list" size={18} />
              </button>
            </div>

            {currentFolder === null && !searchQuery && (
              <button className={styles.createFolderBtn} onClick={() => setShowFolderModal(true)}>
                <Icon name="plus" size={16} /> {t('dashboard.newFolder')}
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        {!searchQuery && (
          <div className={styles.breadcrumbs}>
            <button className={styles.breadcrumbBtn} onClick={() => setCurrentFolder(null)}>
              <Icon name="folder" size={18} color="#6C5CE7" /> Bàn làm việc
            </button>
            {currentFolder && (
              <>
                <span className={styles.breadcrumbDivider}>/</span>
                <span className={styles.breadcrumbActive}>
                  <Icon name="folder" size={18} color="#64748b" /> {currentFolder}
                </span>
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
                  <div className={styles.gridItemIcon}><Icon name="folder" size={32} color="#6C5CE7" /></div>
                  <div className={styles.gridItemName}>{folder}</div>
                  <div className={styles.gridItemMeta}>
                    {activities.filter(a => a.settings?.folder_id === folder).length} {t('dashboard.items')}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.listItemIcon}><Icon name="folder" size={24} color="#6C5CE7" /></div>
                  <div className={styles.listItemContent}>
                    <div className={styles.listItemName}>{folder}</div>
                    <div className={styles.listItemMeta}>
                      {activities.filter(a => a.settings?.folder_id === folder).length} {t('dashboard.items')}
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
            const iconName = checkTool ? 'edit' : (template?.isTool ? 'tool' : 'gamepad');

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
                    <div className={styles.gridItemIcon}>
                      <Icon name={iconName} size={32} color={template?.color || '#3b82f6'} />
                    </div>
                    <div className={styles.gridItemName}>{act.title}</div>
                    <div className={styles.gridItemMeta}>
                      {new Date(act.created_at).toLocaleDateString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.listItemIcon}>
                      <Icon name={iconName} size={24} color={template?.color || '#3b82f6'} />
                    </div>
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
                    <Icon name="dots-vertical" size={18} />
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
                         <Icon name="play" size={16} color="#4F46E5" /> {t('dashboard.menu.play')}
                       </div>
                       <Link href={`/create/${act.template_slug}?edit=${act.id}`} className={styles.dropdownItem}>
                         <Icon name="edit" size={16} /> {t('dashboard.menu.edit')}
                       </Link>
                       <div 
                         className={styles.dropdownItem} 
                         onClick={() => handleCopyLink(act)}
                       >
                         <Icon name="link" size={16} /> {t('dashboard.menu.copy')}
                       </div>
                       <div 
                         className={styles.dropdownItem} 
                         onClick={() => {
                           setShowMoveModalFor(act.id);
                           setOpenMenuId(null);
                         }}
                       >
                         <Icon name="folder" size={16} /> {t('dashboard.menu.move')}
                       </div>
                       <div className={`${styles.dropdownItem} ${styles.dropdownItemDelete}`} onClick={() => handleDelete(act.id)}>
                         <Icon name="trash" size={16} color="#E11D48" /> {t('dashboard.menu.delete')}
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
            <div className={styles.emptyIcon}>
              <Icon name="folder" size={64} color="#94A3B8" />
            </div>
            <p>{t('dashboard.empty.title')}</p>
            {currentFolder === null && (
              <Link href="/templates" className={styles.primaryLink}>
                {t('dashboard.empty.explore')}
              </Link>
            )}
          </div>
        )}
      </section>

      {/* --- CREATE FOLDER MODAL --- */}
      {showFolderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFolderModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('dashboard.modal.folder.title')}</h3>
            <input 
              type="text" 
              className={styles.modalInput} 
              placeholder={t('dashboard.modal.folder.placeholder')}
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className={styles.modalActions}>
              <button className={styles.modalBtnSecondary} onClick={() => setShowFolderModal(false)}>{t('cancel')}</button>
              <button className={styles.modalBtnPrimary} onClick={handleCreateFolder}>{t('createRef')}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOVE FILE MODAL --- */}
      {showMoveModalFor && (
        <div className={styles.modalOverlay} onClick={() => setShowMoveModalFor(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('dashboard.modal.move.title')}</h3>
            <div className={styles.folderList}>
              <div 
                className={styles.folderListItem}
                onClick={() => executeMove('ROOT')}
              >
                <Icon name="folder" size={20} color="#6C5CE7" /> <b>{t('dashboard.modal.move.root')}</b>
              </div>
              {allFolders.map(folder => (
                <div 
                  key={folder}
                  className={styles.folderListItem}
                  onClick={() => executeMove(folder)}
                >
                  <Icon name="folder" size={20} color="#64748b" /> {folder}
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnSecondary} onClick={() => setShowMoveModalFor(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
