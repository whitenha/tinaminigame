'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TEMPLATES } from '@/data/templates';
import Icon from '@/components/Icon/Icon';
import SettingsEditor from '@/components/ContentEditor/SettingsEditor';
import styles from './extract.module.css';

// ── Zod schema (must mirror the API route) ──────────────────

const MCQItemSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().default(0),
});

const TrueFalseItemSchema = z.object({
  question: z.string(),
  isTrue: z.boolean(),
});

const PairItemSchema = z.object({
  term: z.string(),
  definition: z.string(),
});

const SentenceItemSchema = z.object({
  sentence: z.string(),
});

const ListItemSchema = z.object({
  item: z.string(),
});

const GroupItemSchema = z.object({
  groupName: z.string(),
  items: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean(),
  })),
});

const ExtractionSchema = z.object({
  title: z.string(),
  detectedFormat: z.enum(['MCQ', 'TRUE_FALSE', 'PAIRS', 'WORD', 'SENTENCE', 'LIST', 'GROUP']),
  mcqItems: z.array(MCQItemSchema).optional(),
  trueFalseItems: z.array(TrueFalseItemSchema).optional(),
  pairItems: z.array(PairItemSchema).optional(),
  sentenceItems: z.array(SentenceItemSchema).optional(),
  listItems: z.array(ListItemSchema).optional(),
  groupItems: z.array(GroupItemSchema).optional(),
});

// ── Format display map ──────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  MCQ: 'Trắc nghiệm',
  TRUE_FALSE: 'Đúng / Sai',
  PAIRS: 'Ghép đôi',
  WORD: 'Từ vựng',
  SENTENCE: 'Câu',
  LIST: 'Danh sách',
  GROUP: 'Phân nhóm',
};

const FORMAT_OPTIONS = ['', 'MCQ', 'TRUE_FALSE', 'PAIRS', 'WORD', 'SENTENCE', 'LIST', 'GROUP'];

// ── Helper: get compatible games for a format ───────────────

function getCompatibleGames(format: string) {
  return TEMPLATES.filter(t =>
    t.engine?.supportedFormats?.includes(format) ||
    t.engine?.contentFormat === format
  );
}

// ── Helper: convert AI output to Supabase content items ─────

function toContentItems(data: any): any[] {
  const fmt = data.detectedFormat;

  if (fmt === 'MCQ' && data.mcqItems) {
    return data.mcqItems.map((q: any) => {
      let opts = [...(q.options || [])];
      while (opts.length < 4) opts.push('');
      return { question: q.question, options: opts.slice(0, 4), image_url: null, time_limit: 20 };
    });
  }

  if (fmt === 'TRUE_FALSE' && data.trueFalseItems) {
    return data.trueFalseItems.map((q: any) => ({
      question: q.question,
      options: [q.isTrue ? 'Đúng' : 'Sai', q.isTrue ? 'Sai' : 'Đúng', '', ''],
      image_url: null, time_limit: 15,
    }));
  }

  if ((fmt === 'PAIRS' || fmt === 'WORD') && data.pairItems) {
    return data.pairItems.map((p: any) => ({
      term: p.term, definition: p.definition, image_url: null,
    }));
  }

  if (fmt === 'SENTENCE' && data.sentenceItems) {
    return data.sentenceItems.map((s: any) => ({
      term: s.sentence, definition: '', image_url: null,
    }));
  }

  if (fmt === 'LIST' && data.listItems) {
    return data.listItems.map((l: any) => ({
      term: l.item, definition: '', image_url: null,
    }));
  }

  if (fmt === 'GROUP' && data.groupItems) {
    return data.groupItems.map((g: any) => ({
      term: g.groupName,
      options: (g.items || []).map((i: any) => ({ text: i.text, isCorrect: i.isCorrect })),
      image_url: null,
    }));
  }

  return [];
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ExtractPage() {
  const router = useRouter();
  const { user, isTeacher } = useAuth();

  // Phase: 'input' | 'loading' | 'preview'
  const [phase, setPhase] = useState<'input' | 'loading' | 'preview'>('input');
  const [inputText, setInputText] = useState('');
  const [preferredFormat, setPreferredFormat] = useState('');
  const [error, setError] = useState('');

  // Preview state
  const [extractedData, setExtractedData] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const [compatibleGames, setCompatibleGames] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFetchingImages, setIsFetchingImages] = useState(false);

  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [readQuestion, setReadQuestion] = useState(true);
  const [readOptions, setReadOptions] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [globalTime, setGlobalTime] = useState(20);
  const [toastMsg, setToastMsg] = useState('');
  
  const useFallbackRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };
  
  // AI streaming hook
  const { object, submit, isLoading, error: aiError } = useObject({
    api: '/api/extract-game',
    schema: ExtractionSchema,
    onFinish: ({ object: result, error: finishError }) => {
      if (finishError) {
        if (!useFallbackRef.current && (finishError.message.includes('429') || finishError.message.includes('validation failed') || finishError.message.includes('GROQ_QUOTA_EXCEEDED'))) {
          showToast('Groq vỡ tải! Đang tự động đổi sang Google Gemma 3 27B...');
          useFallbackRef.current = true;
          submit({ text: inputText, preferredFormat: preferredFormat || undefined, useFallback: true });
          return;
        }

        if (finishError.message.includes('validation failed') && finishError.message.includes('undefined')) {
          setError('❌ Hệ thống AI bị quá tải hoặc API Key của bạn đã hết hạn mức (Quota) miễn phí trong ngày. Vui lòng thử lại vào ngày mai hoặc nâng cấp tài khoản (Pay-as-you-go).');
        } else if (finishError.message.includes('429')) {
          setError('❌ Hạn mức AI đã hết. Vui lòng sử dụng lại vào ngày mai.');
        } else {
          setError('❌ AI trả về lỗi: ' + finishError.message);
        }
        setPhase('input');
        return;
      }
      if (result) {
        setExtractedData(result);
        setEditTitle(result.title || 'Bộ câu hỏi mới');
        const games = getCompatibleGames(result.detectedFormat || 'MCQ');
        setCompatibleGames(games);
        if (games.length > 0) setSelectedSlug(games[0].slug);
        setPhase('preview');
      } else {
        setError('❌ Hệ thống AI bị quá tải hoặc đã hết hạn mức (Quota) sử dụng miễn phí. Vui lòng cấp quyền thanh toán (Pay-as-you-go) hoặc thử lại vào ngày mai!');
        setPhase('input');
      }
    },
    onError: (err) => {
      if (!useFallbackRef.current && (err.message.includes('429') || err.message.includes('GROQ_QUOTA_EXCEEDED'))) {
        showToast('Groq quá tải! Đang đổi sang Google Gemma 3 27B...');
        useFallbackRef.current = true;
        submit({ text: inputText, preferredFormat: preferredFormat || undefined, useFallback: true });
        return;
      }

      // Parse lỗi thân thiện hơn
      if (err.message.includes('401')) {
        setError('❌ Chưa cấu hình API Key, hoặc Key không hợp lệ. Vui lòng kiểm tra lại .env.local và khởi động lại Server.');
      } else if (err.message.includes('fetch failed')) {
        setError('❌ Không thể kết nối tới Google Gemini. Vui lòng kiểm tra mạng lưới hoặc VPN của bạn.');
      } else {
        setError(err.message || '❌ Có lỗi xảy ra khi gọi AI bóc tách (Server Error).');
      }
      setPhase('input');
    },
  });

  // ── Extract handler ─────────────────────────────────────

  const handleExtract = useCallback(() => {
    if (!inputText.trim() || inputText.trim().length < 10) {
      setError('Vui lòng nhập ít nhất 10 ký tự.');
      return;
    }
    setError('');
    setPhase('loading');
    useFallbackRef.current = false;
    submit({ text: inputText, preferredFormat: preferredFormat || undefined, useFallback: false });
  }, [inputText, preferredFormat, submit]);

  // ── Publish handler ─────────────────────────────────────

  const performPublish = async () => {
    if (!user || !extractedData || !selectedSlug) return;

    setIsPublishing(true);
    try {
      const contentItems = toContentItems(extractedData);
      if (contentItems.length === 0) throw new Error('Không có nội dung để phát hành');

      const format = extractedData.detectedFormat;
      const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 1. Create activity
      const { data: actData, error: actError } = await supabase
        .from('mg_activities')
        .insert({
          creator_id: user.id,
          title: editTitle || 'Bộ câu hỏi mới',
          template_slug: selectedSlug,
          content_format: format,
          share_code: shareCode,
          is_public: true,
          settings: { 
            cover_image: coverImage, 
            read_question: readQuestion, 
            read_options: readOptions, 
            shuffle_questions: shuffleQuestions 
          },
        })
        .select()
        .single();

      if (actError) throw actError;

      // 2. Insert content items
      const isMCQLike = ['MCQ', 'TRUE_FALSE'].includes(format);
      const itemsToInsert = contentItems.map((item: any, idx: number) => ({
        activity_id: actData.id,
        position_index: idx,
        term: item.question || item.term || '',
        definition: item.definition || (item.options ? (typeof item.options[0] === 'string' ? item.options[0] : (item.options[0] as any)?.text) : ''),
        options: item.options || [],
        image_url: item.image_url || null,
        audio_url: null,
        extra_data: { time_limit: globalTime },
      }));

      const { error: itemsError } = await supabase
        .from('mg_content_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Redirect to game
      router.push('/' + actData.id);

    } catch (err: any) {
      console.error(err);
      setError('Lỗi khi phát hành: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Retry handler ───────────────────────────────────────

  const handleRetry = () => {
    setPhase('input');
    setExtractedData(null);
    setError('');
  };

  // ── Auto fetch images using Unsplash API ───────────────

  const handleAutoImages = async () => {
    if (!extractedData) return;
    setIsFetchingImages(true);
    showToast('Đang tìm ảnh tự động...');

    const fmt = extractedData.detectedFormat;
    let targetArrayName = '';
    if (fmt === 'MCQ') targetArrayName = 'mcqItems';
    else if (fmt === 'TRUE_FALSE') targetArrayName = 'trueFalseItems';
    else if (fmt === 'PAIRS' || fmt === 'WORD') targetArrayName = 'pairItems';
    else if (fmt === 'SENTENCE') targetArrayName = 'sentenceItems';
    else if (fmt === 'LIST') targetArrayName = 'listItems';
    else if (fmt === 'GROUP') targetArrayName = 'groupItems';

    if (!targetArrayName || !extractedData[targetArrayName]) {
      setIsFetchingImages(false);
      return;
    }

    const items = extractedData[targetArrayName];
    const queries: string[] = [];
    items.forEach((item: any) => {
       const q = item.term || item.question || item.sentence || item.item || item.groupName;
       if (q && typeof q === 'string' && !queries.includes(q)) queries.push(q);
    });

    if (queries.length === 0) {
      setIsFetchingImages(false);
      return;
    }

    try {
      const res = await fetch('/api/fetch-images', {
         method: 'POST',
         body: JSON.stringify({ queries }),
         headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (data.results) {
         const newItems = items.map((item: any) => {
            const q = item.term || item.question || item.sentence || item.item || item.groupName;
            const match = data.results.find((r: any) => r.query === q);
            if (match && match.imageUrl) {
               return { ...item, image_url: match.imageUrl };
            }
            return item;
         });
         setExtractedData({ ...extractedData, [targetArrayName]: newItems });
         showToast(`Đã tìm ảnh cho ${data.results.filter((r: any) => r.imageUrl).length}/${queries.length} mục`);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải ảnh tự động');
    } finally {
      setIsFetchingImages(false);
    }
  };

  // ── Get item count from streaming data ──────────────────

  const getItemCount = (data: any) => {
    if (!data) return 0;
    if (data.mcqItems) return data.mcqItems.length;
    if (data.trueFalseItems) return data.trueFalseItems.length;
    if (data.pairItems) return data.pairItems.length;
    if (data.sentenceItems) return data.sentenceItems.length;
    if (data.listItems) return data.listItems.length;
    if (data.groupItems) return data.groupItems.length;
    return 0;
  };

  // ── Render items preview ────────────────────────────────

  const renderItems = (data: any) => {
    if (!data) return null;
    const fmt = data.detectedFormat;

    if (fmt === 'MCQ' && data.mcqItems) {
      return data.mcqItems.map((q: any, i: number) => (
        <div key={i} className={styles.itemCard}>
          <div className={styles.itemNum}>{i + 1}</div>
          <div className={styles.itemBody}>
            <div className={styles.itemQuestion}>{q.question}</div>
            <div className={styles.itemMeta}>
              {q.options?.map((opt: string, j: number) => (
                <span key={j} className={j === 0 ? styles.itemCorrect : ''}>
                  {j > 0 ? ' · ' : ''}{String.fromCharCode(65 + j)}. {opt}
                </span>
              ))}
            </div>
          </div>
        </div>
      ));
    }

    if (fmt === 'TRUE_FALSE' && data.trueFalseItems) {
      return data.trueFalseItems.map((q: any, i: number) => (
        <div key={i} className={styles.itemCard}>
          <div className={styles.itemNum}>{i + 1}</div>
          <div className={styles.itemBody}>
            <div className={styles.itemQuestion}>{q.question}</div>
            <div className={styles.itemMeta}>
              <span className={styles.itemCorrect}>{q.isTrue ? '✓ Đúng' : '✗ Sai'}</span>
            </div>
          </div>
        </div>
      ));
    }

    if ((fmt === 'PAIRS' || fmt === 'WORD') && data.pairItems) {
      return data.pairItems.map((p: any, i: number) => (
        <div key={i} className={styles.itemCard}>
          <div className={styles.itemNum}>{i + 1}</div>
          <div className={styles.itemBody} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {p.image_url && <img src={p.image_url} alt={p.term} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />}
            <div>
              <div className={styles.itemQuestion}>{p.term}</div>
              <div className={styles.itemMeta}>→ {p.definition}</div>
            </div>
          </div>
        </div>
      ));
    }

    if (fmt === 'SENTENCE' && data.sentenceItems) {
      return data.sentenceItems.map((s: any, i: number) => (
        <div key={i} className={styles.itemCard}>
          <div className={styles.itemNum}>{i + 1}</div>
          <div className={styles.itemBody}>
            <div className={styles.itemQuestion}>{s.sentence}</div>
          </div>
        </div>
      ));
    }

    if (fmt === 'LIST' && data.listItems) {
      return data.listItems.map((l: any, i: number) => (
        <div key={i} className={styles.itemCard}>
          <div className={styles.itemNum}>{i + 1}</div>
          <div className={styles.itemBody}>
            <div className={styles.itemQuestion}>{l.item}</div>
          </div>
        </div>
      ));
    }

    if (fmt === 'GROUP' && data.groupItems) {
      return data.groupItems.map((g: any, i: number) => (
        <div key={i} className={styles.itemCard}>
          <div className={styles.itemNum}>{i + 1}</div>
          <div className={styles.itemBody}>
            <div className={styles.itemQuestion}>{g.groupName}</div>
            <div className={styles.itemMeta}>
              {g.items?.map((item: any, j: number) => (
                <span key={j} className={item.isCorrect ? styles.itemCorrect : ''}>
                  {j > 0 ? ', ' : ''}{item.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      ));
    }

    return null;
  };

  // Use streaming data during loading, or extractedData after finish
  const displayData = phase === 'loading' ? object : extractedData;

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className={styles.page}>
      {/* Toast */}
      <div className={`${styles.toast} ${toastMsg ? styles.toastVisible : ''}`}>
        <Icon name="check-circle" size={18} /> {toastMsg}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <Icon name="arrow-left" size={20} />
        </button>
        <div className={styles.headerText}>
          <h1>Bóc Tách Thông Minh</h1>
          <p>Dán văn bản → AI tạo game tự động</p>
        </div>
      </div>

      {/* Phase indicator */}
      <div className={styles.phases}>
        <div className={styles.phaseStep} data-active={phase === 'input'} data-done={phase !== 'input'} />
        <div className={styles.phaseStep} data-active={phase === 'loading'} data-done={phase === 'preview'} />
        <div className={styles.phaseStep} data-active={phase === 'preview'} />
      </div>

      {/* Error display */}
      {error && <div className={styles.errorBox}>{error}</div>}

      {/* ── PHASE 1: INPUT ──────────────────────────── */}
      {phase === 'input' && (
        <div className={styles.inputSection}>
          <div className={styles.textareaWrapper}>
            <textarea
              className={styles.textarea}
              placeholder="Dán văn bản câu hỏi, từ vựng, danh sách... vào đây. AI sẽ tự động nhận dạng và bóc tách thành game cho bạn."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <span className={styles.charCount}>{inputText.length} ký tự</span>
          </div>

          {/* Format override */}
          <div className={styles.formatRow}>
            <span className={styles.formatLabel}>Ép kiểu:</span>
            {FORMAT_OPTIONS.map(f => (
              <button
                key={f || 'auto'}
                className={styles.formatChip}
                data-active={preferredFormat === f}
                onClick={() => setPreferredFormat(f)}
              >
                {f ? FORMAT_LABELS[f] : 'Tự động'}
              </button>
            ))}
          </div>

          <button
            className={styles.extractBtn}
            onClick={handleExtract}
            disabled={!inputText.trim() || inputText.trim().length < 10}
          >
            <Icon name="rocket" size={20} />
            Bóc Tách Ngay
          </button>
        </div>
      )}

      {/* ── PHASE 2: LOADING ────────────────────────── */}
      {phase === 'loading' && (
        <div>
          <div className={styles.loadingSection}>
            <div className={styles.loadingOrb}>
              <Icon name="search" size={32} color="white" />
            </div>
            <div className={styles.loadingText}>AI đang phân tích...</div>
            <div className={styles.loadingSubtext}>
              {displayData?.detectedFormat
                ? `Phát hiện: ${FORMAT_LABELS[displayData.detectedFormat] || displayData.detectedFormat} · ${getItemCount(displayData)} mục`
                : 'Đang đọc và nhận dạng nội dung'}
            </div>
          </div>

          {/* Show streaming items */}
          {displayData && getItemCount(displayData) > 0 && (
            <div className={styles.itemsList}>
              {renderItems(displayData)}
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 3: PREVIEW ────────────────────────── */}
      {phase === 'preview' && extractedData && (
        <div className={styles.previewSection}>
          {/* Result header */}
          <div className={styles.resultHeader}>
            <div className={styles.formatBadge}>
              <Icon name="check" size={14} />
              {FORMAT_LABELS[extractedData.detectedFormat] || extractedData.detectedFormat}
            </div>
            <span className={styles.itemCount}>{getItemCount(extractedData)} mục đã bóc tách</span>
          </div>

          {/* Title editor */}
          <input
            className={styles.titleInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Tiêu đề game..."
          />

          {/* Game picker */}
          {compatibleGames.length > 0 && (
            <>
              <div className={styles.gamePickerLabel}>Chọn loại game:</div>
              <div className={styles.gameGrid}>
                {compatibleGames.map(game => (
                  <div
                    key={game.slug}
                    className={styles.gameCard}
                    data-selected={selectedSlug === game.slug}
                    onClick={() => setSelectedSlug(game.slug)}
                  >
                    <div className={styles.gameCardColor} style={{ background: game.color }} />
                    <div className={styles.gameCardName}>{game.nameVi}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Options Row for Auto Images */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button 
              onClick={handleAutoImages} 
              disabled={isFetchingImages}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#a29bfe', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}
            >
              <Icon name="image" size={18} />
              {isFetchingImages ? 'Đang tìm ảnh...' : '🪄 Tự động gắn ảnh'}
            </button>
          </div>

          {/* Items preview */}
          <div className={styles.itemsList}>
            {renderItems(extractedData)}
          </div>

          {/* Publish Trigger */}
          <button
            className={styles.publishBtn}
            onClick={() => setShowSettingsModal(true)}
            disabled={!selectedSlug}
          >
            <Icon name="rocket" size={20} />
            Tiếp Tục: Thiết Lập Game
          </button>

          <button className={styles.retryBtn} onClick={handleRetry}>
            Thử lại với văn bản khác
          </button>
        </div>
      )}

      {/* ── SETTINGS MODAL ────────────────────────── */}
      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => !isPublishing && setShowSettingsModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon name="gamepad" size={24} color="#a29bfe" />
                Hoàn tất cài đặt
              </h2>
              <button 
                className={styles.closeBtn} 
                onClick={() => !isPublishing && setShowSettingsModal(false)}
                disabled={isPublishing}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <SettingsEditor 
                title={editTitle}
                setTitle={setEditTitle}
                coverImage={coverImage}
                setCoverImage={setCoverImage}
                applyTimeToAll={(time: number) => {
                  setGlobalTime(time);
                  showToast(`Đã tự động áp dụng ${time} giây cho tất cả!`);
                }}
                readQuestion={readQuestion}
                setReadQuestion={setReadQuestion}
                readOptions={readOptions}
                setReadOptions={setReadOptions}
                shuffleQuestions={shuffleQuestions}
                setShuffleQuestions={setShuffleQuestions}
              />
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setShowSettingsModal(false)}
                disabled={isPublishing}
              >
                Trở lại
              </button>
              <button 
                className={styles.confirmPublishBtn} 
                onClick={performPublish}
                disabled={isPublishing}
              >
                <Icon name="rocket" size={20} />
                {isPublishing ? 'Đang xuất bản...' : 'Xác nhận Phát Hành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
