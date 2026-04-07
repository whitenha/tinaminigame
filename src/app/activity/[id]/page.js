'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTemplateBySlug } from '@/data/templates';
import { supabase } from '@/lib/supabase';
import styles from './activity.module.css';

export default function ActivityPage({ params }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activity, setActivity] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [resolvedId, setResolvedId] = useState(null);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      setResolvedId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!resolvedId || authLoading) return;

    const fetchActivity = async () => {
      setLoading(true);
      const { data: act, error: actError } = await supabase
        .from('mg_activities')
        .select('*')
        .eq('id', resolvedId)
        .single();

      if (actError || !act) {
        console.error('Activity not found:', actError);
        setLoading(false);
        return;
      }

      setActivity(act);

      const { data: items, error: itemsError } = await supabase
        .from('mg_content_items')
        .select('*')
        .eq('activity_id', act.id)
        .order('position_index', { ascending: true });

      if (!itemsError && items) {
        setContentItems(items);
      }
      setLoading(false);
    };

    fetchActivity();
  }, [resolvedId, authLoading]);

  if (loading || authLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải trò chơi...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorIcon}>🎮</div>
        <h2>Không tìm thấy trò chơi</h2>
        <p>Trò chơi này không tồn tại hoặc bạn không có quyền truy cập.</p>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Quay lại Dashboard
        </button>
      </div>
    );
  }

  const template = getTemplateBySlug(activity.template_slug) || {};
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play/${activity.share_code}`
    : `/play/${activity.share_code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backArrow} onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </button>
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.badge} style={{ background: template.color || '#6C5CE7' }}>
            {template.nameVi || 'Trò chơi'}
          </span>
          <h1 className={styles.actTitle}>{activity.title}</h1>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.editBtn} onClick={() => router.push(`/create/${activity.template_slug}`)}>
            ✏️ Chỉnh sửa
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Left: Game Preview */}
        <section className={styles.previewSection}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span className={styles.previewLabel}>🎮 Xem Trước Trò Chơi</span>
              <button 
                className={styles.playFullBtn}
                onClick={() => window.open(`/play/${activity.share_code}`, '_blank')}
              >
                ▶ Chơi Toàn Màn Hình
              </button>
            </div>

            <div className={styles.gameFrame}>
              {/* Game Preview - Mini version */}
              <div className={styles.gamePreviewContent}>
                {contentItems.length > 0 ? (
                  <div className={styles.previewSlide}>
                    <div className={styles.previewQuestionNum}>
                      Câu 1 / {contentItems.length}
                    </div>
                    <h2 className={styles.previewQuestion}>
                      {contentItems[0].term || 'Câu hỏi chưa có nội dung'}
                    </h2>
                    {contentItems[0].image_url && (
                      <img src={contentItems[0].image_url} alt="" className={styles.previewImage} />
                    )}
                    <div className={styles.previewOptions}>
                      {(contentItems[0].options || []).map((opt, i) => {
                        if (!opt) return null;
                        const displayText = typeof opt === 'string' ? opt : (opt.text || '');
                        if (!displayText.trim()) return null;
                        
                        return (
                          <div 
                            key={i} 
                            className={`${styles.previewOption} ${styles[`optColor${i}`]}`}
                          >
                            <span className={styles.optLetter}>{String.fromCharCode(65 + i)}</span>
                            <span>{displayText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyPreview}>
                    <p>Chưa có câu hỏi nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question list summary */}
          <div className={styles.questionSummary}>
            <h3 className={styles.summaryTitle}>📋 Danh Sách Câu Hỏi ({contentItems.length})</h3>
            <div className={styles.questionList}>
              {contentItems.map((item, idx) => (
                <div key={idx} className={styles.questionRow}>
                  <span className={styles.qNum}>{idx + 1}</span>
                  <span className={styles.qText}>{item.term || '(Trống)'}</span>
                  <span className={styles.qTime}>{item.extra_data?.time_limit || 20}s</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Share Panel */}
        <aside className={styles.sharePanel}>
          {/* Share code card */}
          <div className={styles.shareCard}>
            <div className={styles.shareIcon}>🔗</div>
            <h2 className={styles.shareTitle}>Chia Sẻ Trò Chơi</h2>
            <p className={styles.shareSubtitle}>Gửi link hoặc mã code cho học sinh để bắt đầu chơi!</p>

            {/* Share Code */}
            <div className={styles.codeBox}>
              <span className={styles.codeLabel}>Mã Trò Chơi</span>
              <div className={styles.codeValue}>{activity.share_code}</div>
            </div>

            {/* Share URL */}
            <div className={styles.urlBox}>
              <input 
                type="text" 
                className={styles.urlInput} 
                value={shareUrl} 
                readOnly 
                onClick={(e) => e.target.select()}
              />
              <button 
                className={`${styles.copyBtn} ${copied ? styles.copySuccess : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ Đã sao chép!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* QR Code Card */}
          <div className={styles.qrCard}>
            <div className={styles.qrIcon}>📱</div>
            <h3 className={styles.qrTitle}>Quét Mã QR</h3>
            <p className={styles.qrSubtitle}>Học sinh quét trên điện thoại để vào game ngay</p>
            <div className={styles.qrFrame}>
              {/* Using Google Charts API for QR - no package needed */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code"
                className={styles.qrImage}
                width={200}
                height={200}
              />
            </div>
          </div>

          {/* Stats Card */}
          <div className={styles.statsCard}>
            <h3 className={styles.statsTitle}>📊 Thống Kê</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statNum}>{contentItems.length}</span>
                <span className={styles.statLabel}>Câu hỏi</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum}>0</span>
                <span className={styles.statLabel}>Lượt chơi</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum}>--</span>
                <span className={styles.statLabel}>Điểm TB</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum}>{new Date(activity.created_at).toLocaleDateString('vi-VN')}</span>
                <span className={styles.statLabel}>Ngày tạo</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
