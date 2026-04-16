// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMultiplayerRoom } from '@/lib/useMultiplayerRoom';
import { getTemplateBySlug } from '@/data/templates';
import { getContentFormat, resolvePlayerType } from '@/lib/gameRegistry';
import { ActiveMultiplayerRoom } from '@/components/Multiplayer';
import styles from '@/components/Multiplayer/MultiplayerRoom.module.css';
import joinStyles from './JoinRoom.module.css';
import s from './activity.module.css';
import AudioSettings from '@/components/AudioSettings/AudioSettings';
import dynamic from 'next/dynamic';
import { getActivity, getActivityItems } from '@/app/actions/activityActions';
import { useQueryClient } from '@tanstack/react-query';

// ── Tool Player Components (lazy loaded) ──────────────────
const TOOL_PLAYERS = {
  flashcards: dynamic(() => import('@/games/flashcards/FlashCardsPlayer')),
  speakingcards: dynamic(() => import('@/games/speakingcards/SpeakingCardsPlayer')),
  spinwheel: dynamic(() => import('@/games/spinwheel/SpinWheelPlayer')),
};

// ── Solo Player Components (lazy loaded) ──────────────────
const SOLO_PLAYERS = {
  quiz: dynamic(() => import('@/games/quiz/QuizPlayer')),
  typeanswer: dynamic(() => import('@/games/typeanswer/TypeAnswerPlayer')),
  winorlose: dynamic(() => import('@/games/winorlose/WinOrLosePlayer')),
  hangman: dynamic(() => import('@/games/hangman/HangmanPlayer')),
  minionhangman: dynamic(() => import('@/games/hangman/HangmanPlayer')),
  matchingpairs: dynamic(() => import('@/games/matchingpairs/MatchingPairsPlayer')),
  groupsort: dynamic(() => import('@/games/groupsort/GroupSortPlayer')),
  spelltheword: dynamic(() => import('@/games/spelltheword/SpellTheWordPlayer')),
  mazechase: dynamic(() => import('@/games/mazechase/MazeChasePlayer')),
};

const AVATARS = [
  '/avatars/avatar_1.png', '/avatars/avatar_2.png',
  '/avatars/avatar_3.png', '/avatars/avatar_4.png',
  '/avatars/avatar_5.png', '/avatars/avatar_6.png',
  '/avatars/avatar_7.png', '/avatars/avatar_8.png'
];

// Simple regex checks
const isUUID = (str: any) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
const isPIN = (str: any) => /^[A-Z0-9]{6}$/i.test(str);

// Determine if a template uses "type" input vs options
const isTypeInputTemplate = (slug: any) => {
  const typeTemplates = ['type-the-answer', 'typeanswer', 'flash-cards', 'flashcard'];
  return typeTemplates.includes(slug);
};

export default function SmartRoutePage({ params }: any) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [id, setId] = useState<any>(null);

  // View states
  const [viewMode, setViewMode] = useState<any>(null); // 'activity' | 'join_room' | 'playing'
  const [data, setData] = useState<any>(null); // Activity or Room data
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Join Room specific
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(AVATARS[0]);
  const [joinLocalError, setJoinLocalError] = useState('');

  // Activity page UI state
  const [copied, setCopied] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Multiplayer hook
  const mp = useMultiplayerRoom(viewMode === 'playing' ? data?.activity_id : null);

  const showToast = (msg: any) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    // Random avatar on client mount
    setPlayerAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    Promise.resolve(params).then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (user?.user_metadata) {
      if (user.user_metadata.full_name) {
        setPlayerName(user.user_metadata.full_name);
      }
      if (user.user_metadata.avatar_url) {
        setPlayerAvatar(user.user_metadata.avatar_url);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      // Route 1: It's an Activity UUID
      if (isUUID(id)) {
        const { data: act, error: actErr } = await queryClient.fetchQuery({
          queryKey: ['activity', id],
          queryFn: () => getActivity(id),
          staleTime: 5 * 60 * 1000,
        });

        if (actErr || !act) {
          setError('Không tìm thấy Trò Chơi này.');
          setLoading(false); return;
        }

        setData(act);

        // Check if this is a standalone Tool (not a multiplayer game)
        const tmpl = getTemplateBySlug(act.template_slug);
        if (tmpl?.isTool) {
          setViewMode('tool_player');
        } else {
          setViewMode('activity');
        }

        // Fetch items for preview / play
        const { data: contentItems } = await queryClient.fetchQuery({
          queryKey: ['activityItems', act.id],
          queryFn: () => getActivityItems(act.id),
          staleTime: 5 * 60 * 1000,
        });
        if (contentItems) setItems(contentItems);
      }
      // Route 2: It's a 6-char PIN (Student View)
      else if (isPIN(id)) {
        const { data: room, error: roomErr } = await supabase
          .from('mg_rooms').select('*, mg_activities(*)').eq('id', id.toUpperCase()).single();

        if (roomErr || !room) {
          setError('Mã phòng không tồn tại hoặc đã kết thúc!');
          setLoading(false); return;
        }

        // Check if room is finished (host left)
        if (room.status === 'finished') {
          setError('Phòng chơi này đã kết thúc! Host đã rời phòng.');
          setLoading(false); return;
        }

        // Check if host is still online
        const { data: hostPlayer } = await supabase
          .from('mg_room_players')
          .select('is_online')
          .eq('room_id', id.toUpperCase())
          .eq('is_host', true)
          .single();

        if (!hostPlayer || hostPlayer.is_online === false) {
          // Double-check by marking room as finished
          await supabase
            .from('mg_rooms')
            .update({ status: 'finished' })
            .eq('id', id.toUpperCase());
          setError('Phòng chơi này đã hết hạn! Host không còn trực tuyến.');
          setLoading(false); return;
        }

        setData(room);
        setViewMode('join_room');

        // Fetch items for game
        const { data: contentItems } = await supabase
          .from('mg_content_items').select('*').eq('activity_id', room.activity_id)
          .order('position_index', { ascending: true });
        if (contentItems) setItems(contentItems);
      }
      else {
        setError('Đường dẫn không hợp lệ.');
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  useEffect(() => {
    if (viewMode === 'join_room' && typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlName = sp.get('name');
      const urlAvatar = sp.get('avatar');

      if (urlName && urlAvatar && id) {
        setPlayerName(urlName);
        setPlayerAvatar(urlAvatar);
        window.history.replaceState({}, '', `/${id}`);
        mp.joinRoom(id, urlName.trim(), urlAvatar).then((result) => {
          if (result && !result.success) {
            setJoinLocalError(result.error);
          } else {
            setViewMode('playing');
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, id]);

  const handleJoinRoom = async (e: any) => {
    e.preventDefault();
    if (!playerName.trim() || !playerAvatar) return;

    setJoinLocalError('');
    const result = await mp.joinRoom(id, playerName.trim(), playerAvatar);

    if (result && !result.success) {
      setJoinLocalError(result.error);
    } else {
      setViewMode('playing');
    }
  };

  if (loading || authLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <span className={styles.errorEmoji}>😕</span>
        <p>{error}</p>
        <button onClick={() => router.push('/')} style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Về Trang Chủ</button>
      </div>
    );
  }

  // ── 1. Activity Detail View ───────────────────────────────
  if (viewMode === 'activity') {
    const templateInfo: any = getTemplateBySlug(data.template_slug || '') || {};
    const isOwner = user && data.creator_id === user.id;
    const isTypeInput = isTypeInputTemplate(data.template_slug);
    const sharePageUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/${data.id}` : `/${data.id}`;
    const currentItem = items[previewIdx] || null;
    const GUEST_VISIBLE = 3;

    const handleCopy = async () => {
      try { await navigator.clipboard.writeText(sharePageUrl); }
      catch {
        const ta = document.createElement('textarea'); ta.value = sharePageUrl;
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(true); showToast('Đã sao chép link!');
      setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async () => {
      if (!confirm('Bạn có chắc chắn muốn xóa? Không thể hoàn tác.')) return;
      try {
        await supabase.from('mg_activities').delete().eq('id', data.id);
        router.push('/dashboard');
      } catch { alert('Lỗi khi xóa.'); }
    };

    const handleDuplicate = async () => {
      try {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: newAct, error: actErr } = await supabase
          .from('mg_activities')
          .insert({
            creator_id: user.id,
            title: data.title + ' (Bản sao)',
            template_slug: data.template_slug,
            content_format: data.content_format,
            share_code: newCode,
            is_public: true,
            settings: data.settings || {},
          }).select().single();
        if (actErr) throw actErr;
        if (items.length > 0) {
          const newItems = items.map((item, idx) => ({
            activity_id: newAct.id, position_index: idx,
            term: item.term || '', definition: item.definition || '',
            options: item.options || [], image_url: item.image_url || null,
            audio_url: item.audio_url || null, extra_data: item.extra_data || {},
          }));
          await supabase.from('mg_content_items').insert(newItems);
        }
        showToast('Đã tạo bản sao thành công!');
        setTimeout(() => router.push(`/${newAct.id}`), 800);
      } catch (err: any) { console.error(err); alert('Lỗi khi tạo bản sao.'); }
    };

    const handleHostGame = () => {
    router.push(`/play/${data.id}`);
  };

  const handleSoloGame = () => {
    setViewMode('solo_player');
    
    if (data?.settings?.shuffle_questions) {
      setItems(prevItems => {
        const shuffled = [...prevItems];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      });
    }

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(); /* Safari */
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen(); /* IE11 */
      }
    } catch (err: any) {}
  };

    // Extract all answers for an item
    const getAnswers = (item: any) => {
      const answers = [];
      if (item.options && item.options.length > 0) {
        // For type-answer: options[0] is the correct answer
        // For MCQ: first option is correct answer
        const firstOpt = item.options[0];
        const text = typeof firstOpt === 'string' ? firstOpt : (firstOpt?.text || '');
        if (text.trim()) answers.push(text.trim());
      }
      // Also check definition field for PAIRS/LIST format
      if (item.definition && item.definition.trim()) {
        if (!answers.includes(item.definition.trim())) {
          answers.push(item.definition.trim());
        }
      }
      // Check if there are multiple correct answers in options (for MCQ with isCorrect flags)
      if (item.options && item.options.length > 1) {
        for (let i = 1; i < item.options.length; i++) {
          const opt = item.options[i];
          if (opt && typeof opt === 'object' && opt.isCorrect) {
            const txt = opt.text || '';
            if (txt.trim() && !answers.includes(txt.trim())) answers.push(txt.trim());
          }
        }
      }
      return answers;
    };

    // Preview slide renderer
    const renderSlide = () => {
      if (!currentItem) {
        return (
          <div className={s.carouselSlide}>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700, fontSize: 18 }}>
              Chưa có câu hỏi nào
            </div>
          </div>
        );
      }
      return (
        <div className={s.carouselSlide} key={previewIdx}>
          <div className={s.slideCounter}>
            <span>📝</span> Câu {previewIdx + 1} / {items.length}
          </div>
          <h2 className={s.slideQuestion}>
            {currentItem.term || currentItem.question || '(Trống)'}
          </h2>
          {currentItem.image_url && (
            <img src={currentItem.image_url} alt="" className={s.slideImage} />
          )}
          {isTypeInput ? (
            <div className={s.typeHint}>
              <span className={s.typeHintIcon}>⌨️</span>
              Gõ đáp án vào ô trả lời
            </div>
          ) : (
            (currentItem.options || []).some((o: any) => o) && (
              <div className={s.slideOptions}>
                {(currentItem.options || []).map((opt: any, i: any) => {
                  if (!opt) return null;
                  const text = typeof opt === 'string' ? opt : (opt.text || '');
                  if (!text.trim()) return null;
                  return (
                    <div key={i} className={`${s.slideOpt} ${s[`slideOpt${i}`]}`}>
                      <span className={s.slideOptLetter}>{String.fromCharCode(65 + i)}</span>
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      );
    };

    return (
      <div className={s.page}>
        {/* Toast */}
        <div className={`${s.toast} ${toastMsg ? s.toastVisible : ''}`}>✅ {toastMsg}</div>

        {/* ── Hero Bar: Back + Title + Badge + Actions ── */}
        <div className={s.heroBar}>
          <button className={s.backBtn} onClick={() => router.push(isOwner ? '/dashboard' : '/')}>
            ←
          </button>
          <div className={s.heroInfo}>
            <span className={s.badge} style={{ background: templateInfo.color || '#6C5CE7' }}>
              {templateInfo.nameVi || 'Trò chơi'}
            </span>
            <h1 className={s.actTitle}>{data.title}</h1>
          </div>
          <div className={s.heroActions}>
            {isOwner && (
              <>
                <button className={s.actionBtn} onClick={() => router.push(`/create/${data.template_slug}?edit=${data.id}`)}>
                  <span className={s.actionBtnIcon}>✏️</span> Chỉnh sửa
                </button>
                <div className={s.moreMenu}>
                  <button className={s.moreBtn} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>⋯</button>
                  {menuOpen && (
                    <div className={s.moreDropdown} onClick={(e) => e.stopPropagation()}>
                      <button className={s.menuItem} onClick={handleDuplicate}>
                        <span className={s.menuItemIcon}>📋</span> Tạo bản sao
                      </button>
                      <button className={s.menuItem} onClick={handleCopy}>
                        <span className={s.menuItemIcon}>🔗</span> Sao chép link chia sẻ
                      </button>
                      <div className={s.menuSep} />
                      <button className={`${s.menuItem} ${s.menuDanger}`} onClick={handleDelete}>
                        <span className={s.menuItemIcon}>🗑️</span> Xóa bộ đề
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Main Grid ── */}
        <main className={s.main}>
          {/* ── Preview Carousel ── */}
          <div className={`${s.card} ${s.previewCard}`}>
            <div className={s.carouselWrap}>
              {renderSlide()}
            </div>
            {items.length > 0 && (
              <div className={s.carouselNav}>
                <button
                  className={s.navArrow}
                  disabled={previewIdx === 0}
                  onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))}
                >‹</button>
                <div className={s.navDots}>
                  {items.slice(0, Math.min(items.length, 10)).map((_, i) => (
                    <div
                      key={i}
                      className={`${s.navDot} ${i === previewIdx ? s.navDotActive : ''}`}
                      onClick={() => setPreviewIdx(i)}
                    />
                  ))}
                  {items.length > 10 && (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginLeft: 2 }}>
                      +{items.length - 10}
                    </span>
                  )}
                </div>
                <button
                  className={s.navArrow}
                  disabled={previewIdx >= items.length - 1}
                  onClick={() => setPreviewIdx(Math.min(items.length - 1, previewIdx + 1))}
                >›</button>
              </div>
            )}
          </div>

          {/* ── Right Panel ── */}
          <div className={s.rightPanel}>
            {/* Host Game Card */}
            <div className={`${s.card} ${s.hostCard}`}>
              <div className={s.hostCardIcon}>🚀</div>
              <div className={s.hostCardTitle}>
                {isOwner ? 'Bắt Đầu Gameshow' : 'Tạo Phòng Chơi'}
              </div>
              <div className={s.hostCardDesc}>
                Tổ chức thi đấu trực tiếp cho nhiều người tham gia cùng lúc
              </div>
              <button className={s.hostBtn} onClick={handleHostGame}>
                ▶ Host Game
              </button>
            </div>

            {/* Solo Game Card */}
            <div className={`${s.card} ${s.hostCard}`} style={{ background: 'linear-gradient(135deg, rgba(85, 239, 196, 0.1), rgba(0, 184, 148, 0.15))', borderColor: 'rgba(85, 239, 196, 0.2)' }}>
              <div className={s.hostCardIcon}>🎮</div>
              <div className={s.hostCardTitle} style={{ color: '#55efc4' }}>
                Luyện Tập Tự Do
              </div>
              <div className={s.hostCardDesc}>
                Chơi ngẫu nhiên các câu hỏi để tự ôn luyện kiến thức
              </div>
              <button className={s.hostBtn} onClick={handleSoloGame} style={{ background: 'linear-gradient(45deg, #10ac84, #1dd1a1)' }}>
                ▶ Chơi Một Mình
              </button>
            </div>

            {/* Share (Owner only) */}
            {isOwner && (
              <div className={`${s.card} ${s.shareCard}`}>
                <div className={s.shareRow}>
                  <input
                    className={s.shareInput}
                    value={sharePageUrl}
                    readOnly
                    onClick={(e) => (e.target as any).select()}
                  />
                  <button
                    className={`${s.copyBtn} ${copied ? s.copySuccess : ''}`}
                    onClick={handleCopy}
                  >{copied ? '✓ Copied' : '📋 Copy'}</button>
                </div>
              </div>
            )}

            {/* Info Chips */}
            <div className={`${s.card} ${s.infoCard}`}>
              <div className={s.infoGrid}>
                <div className={s.infoItem}>
                  <div className={`${s.infoItemIcon} ${s.purple}`}>📝</div>
                  <div className={s.infoItemText}>
                    <span className={s.infoItemValue}>{items.length}</span>
                    <span className={s.infoItemLabel}>Câu hỏi</span>
                  </div>
                </div>
                <div className={s.infoItem}>
                  <div className={`${s.infoItemIcon} ${s.teal}`}>{isTypeInput ? '⌨️' : '🔘'}</div>
                  <div className={s.infoItemText}>
                    <span className={s.infoItemValue}>{isTypeInput ? 'Gõ đáp án' : 'Chọn đáp án'}</span>
                    <span className={s.infoItemLabel}>Loại câu hỏi</span>
                  </div>
                </div>
                <div className={`${s.infoItem} ${s.infoFull}`}>
                  <div className={`${s.infoItemIcon} ${s.amber}`}>📅</div>
                  <div className={s.infoItemText}>
                    <span className={s.infoItemValue}>{new Date(data.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className={s.infoItemLabel}>Ngày tạo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Question List ── */}
          <div className={`${s.card} ${s.questionCard}`}>
            <div className={s.questionHeader}>
              <span className={s.questionHeaderTitle}>
                📋 Danh Sách Câu Hỏi
              </span>
              <span className={s.questionCount}>{items.length} câu</span>
            </div>
            <div className={s.questionList}>
              {items.map((item, idx) => {
                const isBlurred = !isOwner && idx >= GUEST_VISIBLE;
                const answers = isOwner ? getAnswers(item) : [];
                const isActive = idx === previewIdx;
                return (
                  <div
                    key={idx}
                    className={`${s.qItem} ${isBlurred ? s.qBlurred : ''} ${isActive ? s.qItemActive : ''}`}
                    onClick={() => !isBlurred && setPreviewIdx(idx)}
                  >
                    <span className={`${s.qNum} ${isActive ? s.qNumActive : ''}`}>{idx + 1}</span>
                    <div className={s.qBody}>
                      <div className={s.qQuestion}>
                        {item.image_url && (
                          <img src={item.image_url} alt="" className={s.qQuestionImage} />
                        )}
                        <span>{item.term || item.question || '(Trống)'}</span>
                      </div>
                      {answers.length > 0 && (
                        <div className={s.qAnswers}>
                          {answers.map((ans, ai) => (
                            <span key={ai} className={s.qAnswerChip}>
                              <span className={s.qAnswerChipIcon}>✅</span>
                              {ans}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className={s.qMeta}>
                        <span className={s.qTime}>⏱ {item.extra_data?.time_limit || 20}s</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guest CTA */}
            {!isOwner && items.length > GUEST_VISIBLE && (
              <div className={s.guestOverlay}>
                <div className={s.guestText}>
                  Đăng nhập để xem toàn bộ {items.length} câu hỏi và đáp án
                </div>
                <button className={s.guestBtn} onClick={handleHostGame}>
                  ▶ Chơi Ngay
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── 2. Player Join Room View ──────────────────────────────
  if (viewMode === 'join_room') {
    return (
      <div className={joinStyles.joinPage}>
        {/* Cyberpunk background effects */}
        <div className={joinStyles.cyberGrid}></div>

        <div className={joinStyles.joinCard}>
          <div className={joinStyles.roomPinBadge}>
            Mã phòng: <span>{id}</span>
          </div>

          {/* Modal is rendered outside the card, below */}

          <form onSubmit={handleJoinRoom}>
            <div className={joinStyles.sectionTitle}>1. Chọn nhân vật của bạn</div>
            <div className={joinStyles.avatarGrid}>
              {AVATARS.map((avatar, idx) => (
                <div
                  key={idx}
                  className={`${joinStyles.avatarBtn} ${playerAvatar === avatar ? joinStyles.avatarActive : ''}`}
                  onClick={() => setPlayerAvatar(avatar)}
                >
                  <img src={avatar} alt={`Avatar ${idx + 1}`} className={joinStyles.avatarImage} />
                </div>
              ))}
            </div>

            <div className={joinStyles.sectionTitle}>2. Nhập biệt danh</div>
            <div className={joinStyles.nameInputWrapper}>
              <input
                type="text"
                placeholder="Tên của bạn là gì?"
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
              disabled={!playerName.trim()}
            >
              🚀 Vào Phòng Ngay
            </button>
          </form>
        </div>

        {/* ── Error Modal Overlay ──────────────────────────── */}
        {/* ── Error Modal Overlay ──────────────────────────── */}
        {joinLocalError && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, animation: 'fadeIn 0.2s ease',
          }}>
            <style>{`
              @keyframes shakeWarning {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
                20%, 40%, 60%, 80% { transform: translateX(6px); }
              }
            `}</style>
            <div style={{
              background: 'linear-gradient(135deg, #2a2214, #3d3119)',
              border: '2px solid rgba(255, 193, 7, 0.4)',
              borderRadius: 24, padding: '36px 28px', maxWidth: 380, width: '100%',
              textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'shakeWarning 0.5s ease-in-out'
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ color: '#FFC107', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
                Tên bị trùng!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
                {joinLocalError}
              </p>
              <button
                onClick={() => setJoinLocalError('')}
                style={{
                  background: 'linear-gradient(135deg, #FFC107, #FFD54F)',
                  color: '#1a1a2e', border: 'none', borderRadius: 14,
                  padding: '14px 0', width: '100%', fontSize: 16, fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 6px 20px rgba(255, 193, 7, 0.3)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 193, 7, 0.3)'; }}
              >
                ✅ Đã hiểu, để tôi đổi tên
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ── 3. Player Playing View ────────────────────────────────
  if (viewMode === 'playing') {
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
              onClick={() => { window.location.href = '/play' }}
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
              ⬅ Quay lại trang chủ /play
            </button>
          </div>
        </div>
      );
    }

    // We pass the nested activity object from the room query
    return (
      <>
        <ActiveMultiplayerRoom
          mp={mp}
          items={items}
          activity={data?.mg_activities}
          playerName={playerName}
        />
        <AudioSettings />
      </>
    );
  }

  // ── 4. Standalone Tool Player ──────────────────────────────
  if (viewMode === 'tool_player' && data) {
    const templateSlug = data.template_slug || '';
    const playerType = resolvePlayerType(templateSlug) || 'flashcards';
    const PlayerComponent = TOOL_PLAYERS[playerType];
    const pName = user ? (user.user_metadata?.full_name || 'Giáo viên') : 'Người chơi';

    return (
      <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 99999, backgroundColor: '#1a1a2e', overflow: 'hidden' }}>
        <style>{`body { overflow: hidden !important; } nav, footer { display: none !important; }`}</style>
        {/* Floating Toolbar */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 9999,
          display: 'flex', gap: 8,
        }}>
          <button 
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
              color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, display: 'flex',
              alignItems: 'center', gap: 6, transition: 'all 0.2s'
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
                background: 'rgba(255,255,255,0.9)', color: 'black',
                border: 'none', padding: '8px 16px', borderRadius: '20px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span>✏️</span> Chỉnh Sửa
            </button>
          )}
        </div>

        {/* Render Tool Player */}
        {PlayerComponent ? (
          <PlayerComponent items={items} activity={data} playerName={pName} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'white', background: '#1a1a2e', flexDirection: 'column' }}>
            <span style={{ fontSize: 60, marginBottom: 16 }}>🔧</span>
            <p>Không tìm thấy giao diện cho công cụ này ({playerType}).</p>
          </div>
        )}
      </div>
    );
  }

  // ── 5. Standalone Solo Player ──────────────────────────────
  if (viewMode === 'solo_player' && data) {
    const templateSlug = data.template_slug || '';
    const playerType = resolvePlayerType(templateSlug) || 'quiz';
    const PlayerComponent = SOLO_PLAYERS[playerType];
    const pName = user ? (user.user_metadata?.full_name || 'Học sinh') : 'Học sinh';

    return (
      <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 99999, backgroundColor: '#1a1a2e', overflow: 'hidden' }}>
        <style>{`body { overflow: hidden !important; } nav, footer { display: none !important; }`}</style>
        {/* Floating Toolbar */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 9999,
          display: 'flex', gap: 8,
        }}>
          <button 
            onClick={() => {
              setViewMode('activity');
              try {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else if (document.webkitFullscreenElement) {
                  document.webkitExitFullscreen();
                }
              } catch (err: any) {}
            }}
            style={{
              background: 'rgba(255, 71, 87, 0.15)',
              backdropFilter: 'blur(12px)',
              color: '#ff6b81',
              border: '2px solid rgba(255, 71, 87, 0.4)',
              padding: '10px 20px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 8px 32px rgba(255, 71, 87, 0.2)',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 71, 87, 0.25)';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 71, 87, 0.4)';
              e.currentTarget.style.borderColor = 'rgba(255, 71, 87, 0.8)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 71, 87, 0.15)';
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 71, 87, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 71, 87, 0.4)';
              e.currentTarget.style.color = '#ff6b81';
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'translateY(2px) scale(0.95)';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
            }}
          >
            <span>🚪</span> Thoát Bài Làm
          </button>
        </div>

        {/* Render Solo Tool Player */}
        {PlayerComponent ? (
          <PlayerComponent items={items} activity={data} playerName={pName} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'white', background: '#1a1a2e', flexDirection: 'column' }}>
            <span style={{ fontSize: 60, marginBottom: 16 }}>🎮</span>
            <p>Không tìm thấy giao diện chơi đơn cho tựa game này ({playerType}).</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
