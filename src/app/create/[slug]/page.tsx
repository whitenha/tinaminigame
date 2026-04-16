// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTemplateBySlug } from '@/data/templates';
import { supabase } from '@/lib/supabase';
import { CldUploadWidget } from 'next-cloudinary';
import { getContentFormat, parseImportText } from '@/lib/gameRegistry';
import { speak as ttsSpeak, cancelSpeech, preloadVoices, detectLang } from '@/lib/tts';
import MCQEditor from '@/components/ContentEditor/MCQEditor';
import PairsEditor from '@/components/ContentEditor/PairsEditor';
import PairsGroupEditor from '@/components/ContentEditor/PairsGroupEditor';
import ListEditor from '@/components/ContentEditor/ListEditor';
import TrueFalseEditor from '@/components/ContentEditor/TrueFalseEditor';
import TypeAnswerEditor from '@/components/ContentEditor/TypeAnswerEditor';
import SettingsEditor from '@/components/ContentEditor/SettingsEditor';
import WheelEditor from '@/components/ContentEditor/WheelEditor';
import GroupEditor from '@/components/ContentEditor/GroupEditor';
import GroupMultiColumnEditor from '@/components/ContentEditor/GroupMultiColumnEditor';
import SpellWordEditor from '@/components/ContentEditor/SpellWordEditor';
import Icon from '@/components/Icon/Icon';
import styles from './create.module.css';

export default function CreateActivityPage({ params }: any) {
  const { isTeacher, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editActivityId = searchParams.get('edit');

  const [slug, setSlug] = useState('');
  const [template, setTemplate] = useState<any>(null);

  // Global Activity Settings
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState<any>(null);
  const [contentFormat, setContentFormat] = useState('');
  const [readQuestion, setReadQuestion] = useState(true);
  const [readOptions, setReadOptions] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  
  // Database State to enable Updating existing record and Auto-Save
  const [activityId, setActivityId] = useState<any>(null);
  const [lastSavedTime, setLastSavedTime] = useState<any>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Slide state (-1 means Settings Page)
  const [contentItems, setContentItems] = useState([
    { question: '', options: ['', '', '', ''], image_url: null, time_limit: 20 }
  ]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [dragReadyIndex, setDragReadyIndex] = useState<any>(null);
  const [importReport, setImportReport] = useState<any>(null);

  // Drag and Drop Refs
  // @ts-ignore
  const dragItem = useRef();
  // @ts-ignore
  const dragOverItem = useRef();
  const pressTimer = useRef<any>(null);
  const canDrag = useRef(false);
  // INIT: Only run once per slug
  useEffect(() => {
    Promise.resolve(params).then((p) => {
      if (slug === p.slug) return; // Already initialized for this slug
      
      setSlug(p.slug);
      const t = getTemplateBySlug(p.slug);
      if (t) {
        setTemplate(t);
        // Use gameRegistry to determine content format
        const format = getContentFormat(p.slug);
        setContentFormat(format);

        // Initialize default item based on content format
        const defaultItems = {
          'MCQ':        [{ question: '', options: ['', '', '', ''], image_url: null, time_limit: 20 }],
          'TRUE_FALSE': [{ question: '', options: ['Đúng', 'Sai', '', ''], image_url: null, time_limit: 15 }],
          'PAIRS':      [{ term: '', definition: '', image_url: null }],
          'LIST':       [{ term: '', definition: '', image_url: null }],
          'WORD':       [{ term: '', definition: '', image_url: null }],
          'WORDLIST':   [{ term: '', definition: '', image_url: null }],
          'SENTENCE':   [{ term: '', definition: '', image_url: null }],
          'GROUP':      [{ term: '', definition: '', image_url: null }],
          'DIAGRAM':    [{ term: '', definition: '', image_url: null }],
          'MATH':       [{ term: '', definition: '', image_url: null }],
        };
        // @ts-ignore
        setContentItems(defaultItems[format] || [{ term: '', definition: '', image_url: null }]);
      }
    });
  }, [params, slug]);

  // Handle Loading Data for Edit Mode
  useEffect(() => {
    if (editActivityId && user) {
      const fetchActivityForEdit = async () => {
        try {
          const { data: actData, error: actError } = await supabase
            .from('mg_activities')
            .select('*')
            .eq('id', editActivityId)
            .single();

          if (actError) throw actError;

          // Set Global Settings
          setActivityId(actData.id);
          setTitle(actData.title || '');
          if (actData.settings) {
            setCoverImage(actData.settings.cover_image || null);
            setReadQuestion(actData.settings.read_question ?? true);
            setReadOptions(actData.settings.read_options ?? false);
            setShuffleQuestions(actData.settings.shuffle_questions ?? true);
          }

          // Fetch Items
          const { data: itemsData, error: itemsError } = await supabase
            .from('mg_content_items')
            .select('*')
            .eq('activity_id', editActivityId)
            .order('position_index', { ascending: true });

          if (itemsError) throw itemsError;

          if (itemsData && itemsData.length > 0) {
            const mappedItems = itemsData.map(item => ({
              term: item.term || '',
              definition: item.definition || '',
              question: item.term || '',  // For MCQ/TrueFalse backwards compat in state
              options: (item.options && item.options.length > 0) ? item.options : ['', '', '', ''],
              image_url: item.image_url || null,
              audio_url: item.audio_url || null,
              time_limit: item.extra_data?.time_limit || 20,
              // Restore wheel MCQ answers from extra_data
              wrong1: item.extra_data?.wrong1 || '',
              wrong2: item.extra_data?.wrong2 || '',
              wrong3: item.extra_data?.wrong3 || '',
            }));
            setContentItems(mappedItems);
            // After loading, we can optionally go to the settings page or stay on slide 0
            // setCurrentIndex(0); 
          }
        } catch (error: any) {
          console.error("Error fetching activity for edit mode:", error);
          // Don't alert here maybe, just silently fail or alert
        }
      };

      fetchActivityForEdit();
    }
  }, [editActivityId, user]);

  // --- TEXT TO SPEECH (TTS) ---
  const speakTextRef = useRef<any>(null);

  // Pre-warm TTS voices on mount
  useEffect(() => { preloadVoices(); }, []);

  useEffect(() => {
    // Only speak when slide changes, not on every keystroke
    if (currentIndex >= 0 && contentItems[currentIndex]) {
      // Prevent multiple triggers by clearing previous timeout
      if (speakTextRef.current) clearTimeout(speakTextRef.current);

      speakTextRef.current = setTimeout(() => {
        const item = contentItems[currentIndex];
        cancelSpeech();

        // Read question if enabled
        // @ts-ignore
        const questionText = item.question || item.term;
        if (readQuestion && questionText) {
          ttsSpeak(questionText, { clean: true });
        }
        
        // Read options if enabled
        if (readOptions && item.options) {
          const validOpts = item.options.filter(o => typeof o === 'string' && o.trim() !== '');
          if (validOpts.length > 0) {
            const optsLang = detectLang(validOpts.join(' '));
            ttsSpeak(optsLang === 'vi-VN' ? "Các đáp án là: " : "The options are: ", { forceLang: optsLang });
            
            validOpts.forEach((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              ttsSpeak(`${letter}, ${opt}`, { clean: true });
            });
          }
        }
      }, 400);
    } else {
      cancelSpeech();
    }
    
    return () => {
      if (speakTextRef.current) clearTimeout(speakTextRef.current);
    };
  }, [currentIndex]); // Notice: explicitly omitting contentItems and read settings to avoid re-reading while user is typing

  // Close menu on outside click removed because modalOverlay handles it
  useEffect(() => {
    // No-op or we can just remove the whole useEffect. Let's just comment it out.
  }, []);

  useEffect(() => {
    if (!loading && !isTeacher) {
      router.push('/login');
    }
  }, [loading, isTeacher, router]);


  // Cache states in a Ref for the auto-save interval
  const autoSaveState = useRef<any>({});
  useEffect(() => {
    autoSaveState.current = {
      title, contentItems, coverImage, contentFormat, readQuestion, readOptions, shuffleQuestions, activityId, user, template
    };
  }, [title, contentItems, coverImage, contentFormat, readQuestion, readOptions, shuffleQuestions, activityId, user, template]);

  const performSave = async (isAuto = false) => {
    const s = autoSaveState.current;
    if (!s.title?.trim()) {
      if (!isAuto) {
        alert('Vui lòng nhập tên trò chơi trong trang Settings!');
        setCurrentIndex(-1);
      }
      return;
    }
    
    const validItems = s.contentItems.filter((item: any) => {
      if (s.contentFormat === 'MCQ' || s.contentFormat === 'TRUE_FALSE') return (item.question || '').trim() !== '';
      if (s.contentFormat === 'GROUP') {
        const optionCount = (item.options || []).filter((opt: any) => {
          const text = typeof opt === 'string' ? opt : (opt?.text || '');
          return text.trim() !== '';
        }).length;
        return optionCount >= 2 && (item.term || '').trim() !== '';
      }
      // All other formats use term
      return (item.term || '').trim() !== '';
    });

    if (validItems.length === 0) {
      if (!isAuto) {
        alert('Vui lòng hoàn thiện ít nhất 1 câu hỏi/nội dung!');
        setCurrentIndex(0);
      }
      return;
    }

    if (isAuto) setIsAutoSaving(true);
    else setIsSaving(true);

    try {
      let currentActId = s.activityId;
      
      if (!currentActId) {
        const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: actData, error: actError } = await supabase
          .from('mg_activities')
          .insert({
            creator_id: s.user.id,
            title: s.title,
            template_slug: s.template?.slug,
            content_format: s.contentFormat,
            share_code: shareCode,
            is_public: true,
            settings: { 
              cover_image: s.coverImage,
              read_question: s.readQuestion,
              read_options: s.readOptions,
              shuffle_questions: s.shuffleQuestions
            }
          })
          .select()
          .single();

        if (actError) throw actError;
        currentActId = actData.id;
        setActivityId(currentActId);
        autoSaveState.current.activityId = currentActId;
      } else {
        const { error: actError } = await supabase
          .from('mg_activities')
          .update({
            title: s.title,
            settings: { 
              cover_image: s.coverImage,
              read_question: s.readQuestion,
              read_options: s.readOptions,
              shuffle_questions: s.shuffleQuestions
            }
          })
          .eq('id', currentActId);

        if (actError) throw actError;
      }

      // Hard overwrite items: delete Old + Insert New
      const { error: deleteError } = await supabase
        .from('mg_content_items')
        .delete()
        .eq('activity_id', currentActId);

      if (deleteError) throw deleteError;

      const itemsToInsert = validItems.map((item: any, idx: any) => ({
        activity_id: currentActId,
        position_index: idx,
        term: item.question || item.term || '',
        definition: item.definition || (item.options ? (typeof item.options[0] === 'string' ? item.options[0] : item.options[0]?.text) : ''),
        options: item.options || [],
        image_url: item.image_url || null,
        audio_url: item.audio_url || null,
        extra_data: {
          time_limit: item.time_limit || 20,
          // Persist wheel MCQ wrong answers
          ...(item.wrong1 ? { wrong1: item.wrong1 } : {}),
          ...(item.wrong2 ? { wrong2: item.wrong2 } : {}),
          ...(item.wrong3 ? { wrong3: item.wrong3 } : {}),
        }
      }));

      const { error: itemsError } = await supabase
        .from('mg_content_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);

      if (!isAuto) {
        router.push('/' + currentActId);
      }
      
    } catch (err: any) {
      console.error(err);
      if (!isAuto) alert('Có lỗi xảy ra khi lưu: ' + err.message);
    } finally {
      if (isAuto) setIsAutoSaving(false);
      else setIsSaving(false);
    }
  };

  // Setup auto-save Interval
  useEffect(() => {
    const timer = setInterval(() => {
      performSave(true);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !template) return <div className={styles.loading}>Đang tải...</div>;

  // --- DRAG AND DROP (Hold to Drag) ---
  const handlePointerDownDrag = (e: any, index: any) => {
    canDrag.current = false;
    setDragReadyIndex(null);
    clearTimeout(pressTimer.current);
    
    // Hold for 600ms to activate drag
    pressTimer.current = setTimeout(() => {
      canDrag.current = true;
      setDragReadyIndex(index);
    }, 600);
  };

  const handlePointerUpOrLeaveDrag = () => {
    clearTimeout(pressTimer.current);
    canDrag.current = false;
    setDragReadyIndex(null);
  };

  const customDragStart = (e: any, index: any) => {
    if (!canDrag.current) {
      e.preventDefault(); // Cancel drag if they didn't hold long enough
      return;
    }
    dragItem.current = index;
    setDragReadyIndex(null);
    (e.target as any).style.opacity = 0.5;
  };

  const dragEnter = (e: any, index: any) => {
    dragOverItem.current = index;
  };

  const handleDataImport = async (type: any, payload: any) => {
    // Determine if text is a vocabulary list (word: definition) without MCQ options
    const isVocabList = type === 'text' && 
      payload.split('\n').some((l: any) => /->|→|:/.test(l)) && 
      !payload.split('\n').some((l: any) => /^[A-Da-d][.)]\s/m.test(l));

    // For non-MCQ text imports, OR vocab lists, use local parsing from gameRegistry
    if (type === 'text' && (contentFormat !== 'MCQ' || isVocabList)) {
      const { parseImportText } = await import('@/lib/gameRegistry');
      const parsed = parseImportText(payload, contentFormat);
      
      if (parsed.length === 0) {
        alert('Không tìm thấy mục nào hợp lệ. Kiểm tra lại định dạng.');
        return;
      }

      // @ts-ignore
      const isEmpty = contentItems.length === 1 && !contentItems[0].question && !contentItems[0].term;
      if (isEmpty) {
        // @ts-ignore
        setContentItems(parsed);
      } else {
        // @ts-ignore
        setContentItems([...contentItems, ...parsed]);
      }
      alert(`🎉 Đã import ${parsed.length} mục!`);
      setShowImportModal(false);
      setImportText('');
      return;
    }

    // For MCQ — use API-based parsing (AI-powered)
    const formData = new FormData();
    if (type === 'file') {
      formData.append('file', payload);
    } else {
      formData.append('text', payload);
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/import-pdf', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Lỗi server');
      }

      if (result.data && result.data.length > 0) {
        const newItems = result.data.map((q: any) => {
           let opts = [...q.options];
           let correctIdx = q.correct_answer || 0;
           
           if (correctIdx !== 0 && correctIdx < opts.length) {
              const temp = opts[0];
              opts[0] = opts[correctIdx];
              opts[correctIdx] = temp;
           }

           while(opts.length < 4) opts.push("");
           
           return {
             question: q.question,
             options: opts.slice(0, 4),
             image_url: null,
             time_limit: 20
           };
        });
        
        const isEmpty = contentItems.length === 1 && !contentItems[0].question;
        const startIndex = isEmpty ? 0 : contentItems.length;

        const report = {
           total: newItems.length,
           errors: newItems.map((item: any, i: any) => item._errorMsg ? { slideIndex: startIndex + i, msg: item._errorMsg } : null).filter(Boolean)
        };
        
        if (isEmpty) {
           setContentItems(newItems);
        } else {
           setContentItems([...contentItems, ...newItems]);
        }
        
        setImportReport(report);
        setShowImportModal(false);
        setImportText('');
      } else {
        alert('Không tìm thấy câu hỏi nào hợp lệ.');
      }
    } catch (err: any) {
      alert("❌ Lỗi bóc tách: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const dragEnd = (e: any) => {
    (e.target as any).style.opacity = 1;
    if (dragItem.current === undefined || dragOverItem.current === undefined) return;
    if (dragItem.current === dragOverItem.current) return;

    const copyListItems = [...contentItems];
    // @ts-ignore
    const dragItemContent = copyListItems[dragItem.current];
    // @ts-ignore
    copyListItems.splice(dragItem.current, 1);
    // @ts-ignore
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    setContentItems(copyListItems);

    if (currentIndex === dragItem.current) {
      // @ts-ignore
      setCurrentIndex(dragOverItem.current);
    } else if (currentIndex === dragOverItem.current) {
      setCurrentIndex(dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleMenu = (e: any, index: any) => {
    e.preventDefault();
    e.stopPropagation();
    // Use setTimeout to escape the current event chain 
    // This prevents batching conflicts with drag handlers
    setTimeout(() => {
      // @ts-ignore
      setOpenMenuIndex(prev => prev === index ? null : index);
    }, 10);
  };

  // --- SLIDE ACTIONS ---
  const addSlide = () => {
    const defaultItems = {
      'MCQ':        { question: '', options: ['', '', '', ''], image_url: null, time_limit: 20 },
      'TRUE_FALSE': { question: '', options: ['Đúng', 'Sai', '', ''], image_url: null, time_limit: 15 },
      'PAIRS':      { term: '', definition: '', image_url: null },
      'PAIRS_GROUP':{ pairs: [{term: '', definition: ''}, {term: '', definition: ''}], time_limit: 60, image_url: null },
      'LIST':       { term: '', definition: '', image_url: null },
      'WORD':       { term: '', definition: '', image_url: null },
      'WORDLIST':   { term: '', definition: '', image_url: null },
      'SENTENCE':   { term: '', definition: '', image_url: null },
      'GROUP':      { term: '', options: ['', '', '', '', '', ''], image_url: null },
      'DIAGRAM':    { term: '', definition: '', image_url: null },
      'MATH':       { term: '', definition: '', image_url: null },
    };
    // @ts-ignore
    const newItem = defaultItems[contentFormat] || { term: '', definition: '', image_url: null };
    setContentItems([...contentItems, newItem]);
    setCurrentIndex(contentItems.length);
  };

  const deleteSlide = (index: any) => {
    if (contentItems.length === 1) {
      alert("Bạn phải có ít nhất 1 câu hỏi!");
      return;
    }
    const newItems = contentItems.filter((_, i) => i !== index);
    setContentItems(newItems);
    if (currentIndex >= newItems.length) setCurrentIndex(newItems.length - 1);
    if (currentIndex === index) setCurrentIndex(Math.max(0, index - 1));
  };

  const duplicateSlide = (index: any) => {
    const itemToCopy = { ...contentItems[index] };
    const newItems = [...contentItems];
    newItems.splice(index + 1, 0, itemToCopy);
    setContentItems(newItems);
    setCurrentIndex(index + 1);
  };

  const updateTimeLimit = (index: any, time: any) => {
    const newItems = [...contentItems];
    newItems[index] = { ...newItems[index], time_limit: time };
    setContentItems(newItems);
  };

  const applyTimeToAll = (time: any) => {
    const newItems = contentItems.map(item => ({ ...item, time_limit: time }));
    setContentItems(newItems);
    alert(`Đã áp dụng thời gian ${time} giây cho toàn bộ ${newItems.length} câu hỏi!`);
  };

  const updateItemProp = (index: any, propName: any, value: any) => {
    const newItems = [...contentItems];
    newItems[index] = { ...newItems[index], [propName]: value };
    setContentItems(newItems);
  };

  const updateCurrentItem = (updatedItem: any) => {
    const newItems = [...contentItems];
    newItems[currentIndex] = updatedItem;
    setContentItems(newItems);
  };

  const setSlideMedia = (url: any) => {
    if (currentIndex < 0) return;
    setContentItems(prev => prev.map((item, i) => 
      i === currentIndex ? { ...item, image_url: url } : item
    ));
  };

  const removeSlideMedia = () => {
    if (currentIndex < 0) return;
    setContentItems(prev => prev.map((item, i) => 
      i === currentIndex ? { ...item, image_url: null } : item
    ));
  };

  // --- RENDERING ---
  const currentItem = currentIndex >= 0 ? contentItems[currentIndex] : null;

  const isWheelTemplate = template?.engine?.playerType === 'spinwheel';
  const isGroupSortTemplate = contentFormat === 'GROUP';
  const isCustomLayoutTemplate = isWheelTemplate || isGroupSortTemplate;

  const renderEditor = () => {
    if (currentIndex === -1 && !isCustomLayoutTemplate) {
      return (
        <SettingsEditor 
          title={title} 
          setTitle={setTitle} 
          coverImage={coverImage}
          setCoverImage={setCoverImage}
          applyTimeToAll={applyTimeToAll}
          readQuestion={readQuestion}
          setReadQuestion={setReadQuestion}
          readOptions={readOptions}
          setReadOptions={setReadOptions}
          shuffleQuestions={shuffleQuestions}
          setShuffleQuestions={setShuffleQuestions}
        />
      );
    }
    switch (contentFormat) {
      case 'MCQ':
        // Use TypeAnswerEditor for type-the-answer template
        if (slug === 'type-the-answer') {
          return <TypeAnswerEditor item={currentItem} onChange={updateCurrentItem} />;
        }
        return <MCQEditor item={currentItem} onChange={updateCurrentItem} />;
      case 'PAIRS':
      case 'WORDLIST':
        return <PairsEditor item={currentItem} onChange={updateCurrentItem} />;
      case 'PAIRS_GROUP':
        return <PairsGroupEditor item={currentItem} onChange={updateCurrentItem} />;
      case 'WORD':
        if (slug === 'spell-the-word') {
          return <SpellWordEditor item={currentItem} onChange={updateCurrentItem} />;
        }
        return <PairsEditor item={currentItem} onChange={updateCurrentItem} />;
      case 'GROUP':
        return <GroupEditor item={currentItem} onChange={updateCurrentItem} />;
      case 'LIST':
      case 'SENTENCE':
      case 'DIAGRAM':
      case 'MATH':
        return <ListEditor item={currentItem} onChange={updateCurrentItem} />;
      case 'TRUE_FALSE':
        return <TrueFalseEditor item={currentItem} onChange={updateCurrentItem} />;
      default:
        return <PairsEditor item={currentItem} onChange={updateCurrentItem} />;
    }
  };

  const getAddSlideLabel = () => {
    const labels = { 'MCQ': '+ Thêm câu hỏi', 'TRUE_FALSE': '+ Thêm phát biểu', 'PAIRS': '+ Thêm thẻ', 'PAIRS_GROUP': '+ Thêm Vòng', 'LIST': '+ Thêm mục', 'WORD': '+ Thêm từ', 'SENTENCE': '+ Thêm câu', 'GROUP': '+ Thêm mục', 'DIAGRAM': '+ Thêm nhãn', 'MATH': '+ Thêm bài' };
    // @ts-ignore
    return labels[contentFormat] || '+ Thêm mục';
  };

  return (
    <div className={styles.page}>
      
      {/* 1. TOP BAR */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/templates')}><Icon name="x" size={18} /></button>
          <div className={styles.titleGroup}>
            <span className={styles.badge} style={{ background: template.color }}>{template.nameVi}</span>
            <input
              className={styles.editableTitle}
              value={title}
              onChange={e => setTitle((e.target as any).value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  (e.target as any).blur();
                  performSave(false);
                }
              }}
              placeholder="Chưa đặt tên trò chơi"
              spellCheck={false}
            />
            {contentFormat && (
              <button className={styles.importBtnHeader} onClick={() => setShowImportModal(true)}>
                <span className={styles.importBtnIcon}><Icon name="lightbulb" size={14} color="#f6e58d" /></span>
                <span className={styles.importBtnText}>Bóc Tách Tự Động</span>
              </button>
            )}
          </div>
        </div>
        
        <div className={styles.headerRight} style={{ display: 'flex', alignItems: 'center' }}>
          {/* Nút cài đặt riêng cho di động */}
          <button 
            className={`${styles.mobileSettingsBtn} ${currentIndex === -1 ? styles.activeMobileSettings : ''}`}
            onClick={() => setCurrentIndex(-1)}
            title="Cài đặt trò chơi"
          >
            <Icon name="settings" size={20} color="#a29bfe" />
          </button>
          
          {lastSavedTime && (
            <span className={styles.desktopOnlySaveTime} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginRight: '16px', fontWeight: 600 }}>
              {isAutoSaving ? "Đang tự động lưu..." : `Đã lưu: ${lastSavedTime}`}
            </span>
          )}
          <button 
            className={styles.saveBtn} 
            onClick={() => performSave(false)} 
            disabled={isSaving}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      {isWheelTemplate ? (
        /* ═══ WHEEL TEMPLATE: Full-screen two-panel editor ═══ */
        <main className={styles.workspace}>
          <WheelEditor
            items={contentItems}
            onChange={(newItems: any) => setContentItems(newItems)}
          />
        </main>
      ) : isGroupSortTemplate ? (
        /* ═══ GROUP SORT TEMPLATE: Kanban multi-column editor ═══ */
        <main className={styles.workspace} style={{ margin: 0, padding: 0 }}>
          <GroupMultiColumnEditor
            items={contentItems}
            onChange={(newItems: any) => setContentItems(newItems)}
          />
        </main>
      ) : (
        /* ═══ STANDARD TEMPLATE: Slide-based editor ═══ */
        <main className={styles.workspace}>
          {/* Left Panel: Media Preview (ONLY SHOWS WHEN IMAGE EXISTS) */}
          {currentIndex !== -1 && currentItem?.image_url && (
            <div className={styles.mediaPanel}>
              <div className={styles.mediaPreviewContainer}>
                <img src={currentItem.image_url} alt="Media" className={styles.mediaRealImage} />
                
                <div className={styles.mediaActionsTop}>
                  <CldUploadWidget 
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'tina_minigame'}
                    options={{ cropping: true, showSkipCropButton: false, multiple: false }}
                    onSuccess={(result) => {
                      // @ts-ignore
                      if (result.info && result.info.secure_url) {
                        // @ts-ignore
                        setSlideMedia(result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                       <button className={styles.editMediaBtn} onClick={() => open()} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="pencil" size={14} color="#e84393" /> Đổi / Sửa</button>
                    )}
                  </CldUploadWidget>
                  
                  <button className={styles.removeMediaBtn} onClick={removeSlideMedia} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="trash" size={14} color="#ff7675" /> Xóa</button>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel: Active Editor Form */}
          <div className={styles.formPanel}>
            <div style={{ maxWidth: currentIndex === -1 ? '700px' : (currentItem?.image_url ? '100%' : '840px'), margin: '0 auto', height: '100%' }}>
              
              {/* Inline Upload Placeholder when NO image exists */}
              {currentIndex !== -1 && !currentItem?.image_url && (
                <div className={styles.inlineMediaPlaceholder}>
                  <CldUploadWidget 
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'tina_minigame'}
                    options={{
                      cropping: true,
                      showSkipCropButton: false,
                      multiple: false,
                      defaultSource: 'local',
                      language: 'vi',
                      text: {
                        vi: {
                          menu: { files: 'Tải tệp lên' },
                          local: { browse: 'Chọn ảnh', dd_title_single: 'Kéo thả ảnh vào đây' },
                          crop: { title: 'Cắt và Chỉnh sửa ảnh', crop_btn: 'Cắt ảnh', skip_btn: 'Bỏ qua' }
                        }
                      }
                    }}
                    onSuccess={(result) => {
                      // @ts-ignore
                      if (result.info && result.info.secure_url) {
                        // @ts-ignore
                        setSlideMedia(result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button className={styles.inlineUploadBtn} onClick={() => open()} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                        <Icon name="camera" size={18} color="#00cec9" /> Nhấn vào đây để thêm hình ảnh minh họa (Tùy chọn)
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              )}

              {renderEditor()}
            </div>
          </div>
        </main>
      )}

      {/* 3. BOTTOM CAROUSEL (hidden for custom layout templates) */}
      {!isCustomLayoutTemplate && (
      <footer className={styles.footerCarousel}>
        
        {/* DESKTOP LAYOUT */}
        <div className={`${styles.slidesContainer} ${styles.desktopOnlyContainer}`}>
          
          {/* Settings Thumbnail */}
          <div 
            className={`${styles.slideThumbnail} ${styles.desktopOnlySlide} ${currentIndex === -1 ? styles.slideActive : ''}`}
            onClick={() => setCurrentIndex(-1)}
            style={{ borderColor: currentIndex === -1 ? template.color : 'transparent' }}
          >
            <div className={styles.slideIconBig}><Icon name="settings" size={26} color="#a29bfe" /></div>
            <div className={styles.slidePreview}>Cài đặt</div>
          </div>

          <div className={styles.divider}></div>

          {/* Slides List */}
          {contentItems.map((item, idx) => (
            <div 
              key={idx}
              draggable={idx === dragReadyIndex}
              onPointerDown={(e) => handlePointerDownDrag(e, idx)}
              onPointerUp={handlePointerUpOrLeaveDrag}
              onPointerLeave={handlePointerUpOrLeaveDrag}
              onPointerCancel={handlePointerUpOrLeaveDrag}
              onDragStart={(e) => customDragStart(e, idx)}
              onDragEnter={(e) => dragEnter(e, idx)}
              onDragEnd={dragEnd}
              onDragOver={(e) => e.preventDefault()}
              // @ts-ignore
              className={`${styles.slideThumbnail} ${idx === currentIndex ? styles.slideActive : ''} ${!item.question && !item.term ? styles.slideEmpty : ''} ${idx === dragReadyIndex ? styles.slideReadyToDrag : ''}`}
              onClick={(e) => { setCurrentIndex(idx); }}
              style={{ borderColor: idx === currentIndex ? template.color : 'transparent' }}
            >
              <div className={styles.slideNumber}>{idx + 1}</div>
              
              {item.image_url ? (
                 <img src={item.image_url} alt="thumbnail" className={styles.miniSlideImg} />
              ) : ((item as any).question || (item as any).term) ? (
                <div className={styles.slidePreview}>
                  {((item as any).question || (item as any).term).substring(0, 15)}...
                </div>
              ) : (item as any).pairs ? (
                <div className={styles.slidePreview}>
                  {((item as any).pairs).length} cặp
                </div>
              ) : (
                <div className={styles.slideIcon}><Icon name="camera" size={24} color="#00cec9" /></div>
              )}

              {/* 3 dots menu btn */}
              <button 
                type="button"
                className={styles.menuTriggerBtn} 
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleMenu(e, idx); }}
              >
                ⋮
              </button>
            </div>
          ))}
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <button className={styles.addSlideBtn} onClick={addSlide}>
              <span className={styles.addIcon}><Icon name="plus" size={22} color="#00b894" /></span>
              <span style={{fontSize: '11px', lineHeight: '14px', textAlign: 'center'}}>{getAddSlideLabel()}</span>
            </button>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className={`${styles.mobilePaginationContainer} ${styles.mobileOnlyContainer}`}>
          
          <button 
             className={styles.mobileNavBtn} 
             disabled={currentIndex === -1 || contentItems.length === 0} 
             onClick={() => setCurrentIndex(prev => Math.max(-1, prev - 1))}
          >
             <Icon name="chevron-left" size={24} />
          </button>
          
          <div className={styles.mobileNavInfo}>
             <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                {currentIndex === -1 ? 'Cài đặt chung' : `Câu ${currentIndex + 1} / ${contentItems.length}`}
             </span>
             {currentIndex !== -1 && (
               <button 
                 className={styles.mobileInlineMenuBtn} 
                 onClick={(e) => { e.stopPropagation(); toggleMenu(e, currentIndex); }}
               >
                 ⋮ Menu
               </button>
             )}
          </div>

          {currentIndex < contentItems.length - 1 ? (
            <button 
               className={styles.mobileNavBtn}
               onClick={() => setCurrentIndex(prev => Math.min(contentItems.length - 1, prev + 1))}
            >
               <Icon name="chevron-right" size={24} />
            </button>
          ) : (
            <button 
               className={`${styles.mobileNavBtn} ${styles.mobileAddBtn}`}
               onClick={() => {
                  addSlide();
               }}
            >
               <Icon name="plus" size={24} />
            </button>
          )}

        </div>
      </footer>
      )}

      {/* Global Context Menu Modal (Bypasses overflow clipping) */}
      {openMenuIndex !== null && contentItems[openMenuIndex] && (
        <div className={styles.modalOverlay} onPointerDown={(e) => {
          if (e.target === e.currentTarget) setOpenMenuIndex(null);
        }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Icon name="settings" size={16} color="#a29bfe" /> Tùy chỉnh Câu {openMenuIndex + 1}</span>
              <button className={styles.closeModalBtn} onClick={() => setOpenMenuIndex(null)}><Icon name="x" size={16} color="#fff" /></button>
            </div>
            
            <div className={styles.menuBody}>
              <div className={styles.menuSection}>
                <p className={styles.menuLabel} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="clock" size={12} color="#fdcb6e" /> Thời gian đếm ngược:</p>
                <div style={{display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center'}}>
                  <button className={styles.timeBtn} style={{flex: 1, padding: '8px', minHeight: 'unset'}} onClick={() => updateTimeLimit(openMenuIndex, Math.max(5, (contentItems[openMenuIndex].time_limit || 30) - 5))}>- 5s</button>
                  <input 
                    type="number" 
                    className={styles.timeInput}
                    value={contentItems[openMenuIndex].time_limit || 30}
                    onChange={(e) => updateTimeLimit(openMenuIndex, parseInt(e.target.value) || 0)}
                  />
                  <button className={styles.timeBtn} style={{flex: 1, padding: '8px', minHeight: 'unset'}} onClick={() => updateTimeLimit(openMenuIndex, (contentItems[openMenuIndex].time_limit || 30) + 5)}>+ 5s</button>
                </div>
              </div>

              <div className={styles.menuDivider}></div>

              <div className={styles.menuSection}>
                <p className={styles.menuLabel} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="settings" size={12} color="#a29bfe" /> Căn chỉnh Câu hỏi:</p>
                <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                  <div className={styles.segmentGroup}>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(!contentItems[openMenuIndex].questionAlignH || contentItems[openMenuIndex].questionAlignH === 'left')}
                      onClick={() => updateItemProp(openMenuIndex, 'questionAlignH', 'left')}
                    >
                      <Icon name="align-left" size={14} /> Trái
                    </button>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(contentItems[openMenuIndex].questionAlignH === 'center')}
                      onClick={() => updateItemProp(openMenuIndex, 'questionAlignH', 'center')}
                    >
                      <Icon name="align-center" size={14} /> Giữa
                    </button>
                  </div>
                  <div className={styles.segmentGroup}>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(!contentItems[openMenuIndex].questionAlignV || contentItems[openMenuIndex].questionAlignV === 'top')}
                      onClick={() => updateItemProp(openMenuIndex, 'questionAlignV', 'top')}
                    >
                      <Icon name="align-top" size={14} /> Trên
                    </button>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(contentItems[openMenuIndex].questionAlignV === 'center')}
                      onClick={() => updateItemProp(openMenuIndex, 'questionAlignV', 'center')}
                    >
                      <Icon name="align-middle" size={14} /> Giữa
                    </button>
                  </div>
                </div>

                <p className={styles.menuLabel} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="settings" size={12} color="#00cec9" /> Căn chỉnh Đáp án:</p>
                <div style={{display: 'flex', gap: '8px'}}>
                  <div className={styles.segmentGroup}>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(!contentItems[openMenuIndex].answerAlignH || contentItems[openMenuIndex].answerAlignH === 'left')}
                      onClick={() => updateItemProp(openMenuIndex, 'answerAlignH', 'left')}
                    >
                      <Icon name="align-left" size={14} /> Trái
                    </button>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(contentItems[openMenuIndex].answerAlignH === 'center')}
                      onClick={() => updateItemProp(openMenuIndex, 'answerAlignH', 'center')}
                    >
                      <Icon name="align-center" size={14} /> Giữa
                    </button>
                  </div>
                  <div className={styles.segmentGroup}>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(!contentItems[openMenuIndex].answerAlignV || contentItems[openMenuIndex].answerAlignV === 'top')}
                      onClick={() => updateItemProp(openMenuIndex, 'answerAlignV', 'top')}
                    >
                      <Icon name="align-top" size={14} /> Trên
                    </button>
                    <button 
                      className={styles.segmentBtn}
                      data-active={(contentItems[openMenuIndex].answerAlignV === 'center')}
                      onClick={() => updateItemProp(openMenuIndex, 'answerAlignV', 'center')}
                    >
                      <Icon name="align-middle" size={14} /> Giữa
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.menuDivider}></div>

              <button className={styles.menuItem} onClick={() => { duplicateSlide(openMenuIndex); setOpenMenuIndex(null); }}>
                <Icon name="copy" size={16} color="#74b9ff" /> Nhân bản câu này
              </button>
              <button className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => { deleteSlide(openMenuIndex); setOpenMenuIndex(null); }}>
                <Icon name="trash" size={16} color="#ff7675" /> Xóa câu này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.importModalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.importHeaderTitle} style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Icon name="rocket" size={20} color="#e84393" /> Nhập Dữ Liệu {contentFormat === 'MCQ' ? 'Tự Động' : 'Nhanh'}</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
              {contentFormat === 'MCQ' && 'Trí tuệ nhân tạo sẽ tự động đọc, bóc tách và phân loại câu hỏi/đáp án.'}
              {contentFormat === 'TRUE_FALSE' && 'Mỗi dòng: Phát biểu -> Đúng hoặc Sai'}
              {['PAIRS', 'WORD', 'GROUP'].includes(contentFormat) && 'Mỗi dòng: Từ -> Nghĩa/Nhóm (phân tách bằng -> hoặc tab)'}
              {contentFormat === 'PAIRS_GROUP' && 'Mỗi dòng: Từ -> Nghĩa. Tách các vòng chơi bằng một dòng trống.'}
              {['LIST', 'SENTENCE', 'WORDLIST', 'DIAGRAM', 'MATH'].includes(contentFormat) && 'Mỗi dòng là 1 mục. Có thể thêm mô tả bằng dấu ->'}
            </p>

            {contentFormat !== 'MCQ' && (
              <div style={{ background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: '10px', padding: '10px 14px', margin: '8px 0', fontSize: '12px', color: '#a29bfe', fontWeight: 600, whiteSpace: 'pre-line' }}>
                <strong>Ví dụ:</strong>{'\n'}
                {contentFormat === 'TRUE_FALSE' && 'Trái đất quay quanh mặt trời. -> Đúng\nMặt trăng lớn hơn trái đất. -> Sai\nNước sôi ở 100°C. -> Đúng'}
                {['PAIRS', 'WORD'].includes(contentFormat) && 'Apple -> Quả táo\nBanana -> Quả chuối\nCherry -> Quả anh đào'}
                {contentFormat === 'PAIRS_GROUP' && 'Vòng 1:\nApple -> Quả táo\nBanana -> Quả chuối\n\nVòng 2:\nHello -> Xin chào\nGoodbye -> Tạm biệt'}
                {contentFormat === 'GROUP' && 'Táo -> Trái cây\nChó -> Động vật\nCà rốt -> Rau củ'}
                {['LIST', 'SENTENCE', 'WORDLIST', 'DIAGRAM', 'MATH'].includes(contentFormat) && 'Mục 1\nMục 2\nMục 3\nMục 4'}
              </div>
            )}
            
            <div className={styles.importOptions}>
              {contentFormat === 'MCQ' && (
                <label className={styles.uploadPdfBtnModal}>
                  📄 Tải lên file PDF
                  <input type="file" accept=".pdf" onChange={(e) => {
                    if((e.target as any).files?.[0]) handleDataImport('file', (e.target as any).files[0]);
                  }} style={{display: 'none'}} />
                </label>
              )}
              <span style={{color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontWeight: 600}}>{contentFormat === 'MCQ' ? 'HOẶC' : ''}</span>
              <button className={styles.clipBtnModal} onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setImportText(text);
                } catch (err: any) {
                  alert('Không thể đọc Clipboard do trình duyệt chặn.');
                }
              }}>
                📋 Dán từ Clipboard
              </button>
            </div>

            <textarea 
              value={importText} 
              onChange={e => setImportText((e.target as any).value)} 
              placeholder={contentFormat === 'MCQ' ? "Dán trực tiếp nội dung câu hỏi vào đây..." : ['LIST', 'SENTENCE', 'WORDLIST', 'DIAGRAM', 'MATH'].includes(contentFormat) ? "Mỗi dòng là 1 mục..." : "Mỗi dòng: Từ/Phát biểu -> Nghĩa/Kết quả"}
              className={styles.importTextarea}
              rows={8}
            />
            
            <div className={styles.importActionRow}>
              <button 
                onClick={() => setShowImportModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button 
                onClick={() => handleDataImport('text', importText)} 
                disabled={isSaving || !importText.trim()} 
                className={styles.primaryImportBtn}
              >
                {isSaving ? 'Đang xử lý...' : contentFormat === 'MCQ' ? 'Bắt Đầu Bóc Tách' : `Import ${contentFormat === 'LIST' ? 'mục' : contentFormat === 'TRUE_FALSE' ? 'phát biểu' : 'thẻ'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Report Modal */}
      {importReport && (
        <div className={styles.modalOverlay} onClick={() => setImportReport(null)}>
          <div className={styles.importModalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 className={styles.importHeaderTitle}>📊 Báo Cáo Bóc Tách</h3>
            
            <div style={{ textAlign: 'center', margin: '30px 0 20px 0' }}>
               <h2 style={{ color: '#00b894', margin: '0 0 5px 0', fontSize: '48px', lineHeight: 1 }}>{importReport.total}</h2>
               <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '15px' }}>câu hỏi đã được tạo!</p>
            </div>
            
            {importReport.errors.length > 0 ? (
               <div style={{ background: 'rgba(214, 48, 49, 0.15)', border: '1px solid rgba(214, 48, 49, 0.3)', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ color: '#ff7675', margin: '0 0 12px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <span style={{ fontSize: '18px' }}>⚠️</span> Tính năng đang thử nghiệm, các câu này cần được kiểm tra:
                  </h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                     {importReport.errors.map((err: any, idx: any) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                           <span style={{ flex: 1, paddingRight: '12px', color: 'rgba(255,255,255,0.8)' }}>
                              <strong style={{color: 'white', display: 'inline-block', minWidth: '60px'}}>Slide {err.slideIndex + 1}:</strong> {err.msg}
                           </span>
                           <button 
                              onClick={() => { setCurrentIndex(err.slideIndex); setImportReport(null); }} 
                              style={{ background: 'rgba(9, 132, 227, 0.2)', color: '#74b9ff', border: '1px solid rgba(9, 132, 227, 0.5)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s ease' }}
                              onMouseEnter={(e) => { (e.target as any).style.background = '#0984e3'; (e.target as any).style.color = 'white'; }}
                              onMouseLeave={(e) => { (e.target as any).style.background = 'rgba(9, 132, 227, 0.2)'; (e.target as any).style.color = '#74b9ff'; }}
                           >
                              Đến sửa →
                           </button>
                        </li>
                     ))}
                  </ul>
               </div>
            ) : (
               <div style={{ background: 'rgba(0, 184, 148, 0.1)', border: '1px solid rgba(0, 184, 148, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#55efc4', fontSize: '15px', fontWeight: '600' }}>
                  🎉 Tất cả dữ liệu đều hoàn hảo, không phát hiện lỗi!
               </div>
            )}
            
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
               <button 
                className={styles.primaryImportBtn} 
                onClick={() => setImportReport(null)}
                style={{ minWidth: '150px' }}
               >
                  Đã Hiểu & Đóng
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
