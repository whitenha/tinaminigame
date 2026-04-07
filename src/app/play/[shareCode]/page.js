'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getGameConfig } from '@/lib/gameRegistry';
import { getTemplateBySlug } from '@/data/templates';
import dynamic from 'next/dynamic';
import styles from './play.module.css';

// ══════════════════════════════════════════════════════════════
//  AUTO-GENERATED PLAYERS MAP
//  
//  Each unique playerType from templates.js → dynamic import.
//  When a template's playerType matches a key here, that component
//  is loaded. No more manual maintenance needed!
// ══════════════════════════════════════════════════════════════
const PLAYERS = {
  // ── Selection Engine ──────────────────────────────────────
  quiz:          dynamic(() => import('@/games/quiz/QuizPlayer')),
  gameshow:      dynamic(() => import('@/games/gameshow/GameshowPlayer')),
  truefalse:     dynamic(() => import('@/games/truefalse/TrueFalsePlayer')),
  winorlose:     dynamic(() => import('@/games/winorlose/WinOrLosePlayer')),
  imagequiz:     dynamic(() => import('@/games/imagequiz/ImageQuizPlayer')),
  typeanswer:    dynamic(() => import('@/games/typeanswer/TypeAnswerPlayer')),

  // ── Reveal Engine ─────────────────────────────────────────
  spinwheel:     dynamic(() => import('@/games/spinwheel/SpinWheelPlayer')),
  flashcards:    dynamic(() => import('@/games/flashcards/FlashCardsPlayer')),
  speakingcards: dynamic(() => import('@/games/speakingcards/SpeakingCardsPlayer')),
  openbox:       dynamic(() => import('@/games/openbox/OpenBoxPlayer')),

  // ── Pairing Engine ────────────────────────────────────────
  matchingpairs: dynamic(() => import('@/games/matchingpairs/MatchingPairsPlayer')),
  matchup:       dynamic(() => import('@/games/matchup/MatchUpPlayer')),
  groupsort:     dynamic(() => import('@/games/groupsort/GroupSortPlayer')),
  categorize:    dynamic(() => import('@/games/categorize/CategorizePlayer')),

  // ── Ordering Engine ───────────────────────────────────────
  unjumble:      dynamic(() => import('@/games/unjumble/UnjumblePlayer')),
  anagram:       dynamic(() => import('@/games/anagram/AnagramPlayer')),
  spelltheword:  dynamic(() => import('@/games/spelltheword/SpellTheWordPlayer')),

  // ── Selection Engine (Custom) ─────────────────────────────
  hangman:       dynamic(() => import('@/games/hangman/HangmanPlayer')),

  // ── Action Engine ─────────────────────────────────────────
  whackamole:    dynamic(() => import('@/games/whackamole/WhackAMolePlayer')),
  mazechase:     dynamic(() => import('@/games/mazechase/MazeChasePlayer')),
};

// ── Resolve player component for a template ─────────────────
// Uses the playerType from template's engine config.
// Every template now maps to an existing player (via fallback).
function resolvePlayer(templateSlug) {
  const config = getGameConfig(templateSlug);
  const playerType = config.playerType;

  // Direct match
  if (PLAYERS[playerType]) return PLAYERS[playerType];

  // Should never reach here since templates now set playerType
  // to an actual available player. But just in case:
  console.warn(`[PlayPage] No player for type "${playerType}" (template: ${templateSlug}). Using quiz fallback.`);
  return PLAYERS.quiz;
}

// ── Game Type Labels ────────────────────────────────────────
function getGameLabel(slug) {
  const template = getTemplateBySlug(slug);
  if (template) return `${template.nameVi}`;
  return 'Trò chơi';
}

export default function PlayPage({ params }) {
  const [shareCode, setShareCode] = useState(null);
  const [activity, setActivity] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gamePhase, setGamePhase] = useState('lobby');
  const [gameMode, setGameMode] = useState('batch'); // 'batch' (default) or 'instant' (survival mode)

  // Resolve params
  useEffect(() => {
    Promise.resolve(params).then(p => setShareCode(p.shareCode));
  }, [params]);

  // Fetch activity data
  useEffect(() => {
    if (!shareCode) return;
    const fetchGame = async () => {
      setLoading(true);
      const { data: act, error: actError } = await supabase
        .from('mg_activities')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (actError || !act) {
        setError('Không tìm thấy trò chơi với mã này.');
        setLoading(false);
        return;
      }
      setActivity(act);

      const { data: contentItems, error: itemsError } = await supabase
        .from('mg_content_items')
        .select('*')
        .eq('activity_id', act.id)
        .order('position_index', { ascending: true });

      if (!itemsError && contentItems) setItems(contentItems);
      setLoading(false);
    };
    fetchGame();
  }, [shareCode]);

  const startGame = () => {
    if (!playerName.trim()) return;
    setGamePhase('playing');
  };

  // ── Loading / Error ────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải trò chơi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <span className={styles.errorEmoji}>😕</span>
        <p>{error}</p>
      </div>
    );
  }

  const templateSlug = activity?.template_slug || 'quiz';
  const gameConfig = getGameConfig(templateSlug);
  const template = getTemplateBySlug(templateSlug);

  // ── LOBBY ──────────────────────────────────────────────────
  if (gamePhase === 'lobby') {
    return (
      <div className={styles.lobbyPage}>
        <div className={styles.lobbyCard}>
          {activity?.settings?.cover_image && (
            <img src={activity.settings.cover_image} alt="Cover" className={styles.lobbyCover} />
          )}
          <div className={styles.lobbyContent}>
            <div className={styles.lobbyEmoji}>🎯</div>
            <h1 className={styles.lobbyTitle}>{activity?.title || 'Trò chơi'}</h1>
            <div className={styles.lobbyGameType}>
              {template ? `${template.nameVi}` : '🎮 Trò chơi'}
            </div>
            <div className={styles.lobbyMeta}>
              <span>📝 {items.length} {gameConfig.contentFormat === 'LIST' ? 'mục' : 'câu hỏi'}</span>
              <span>⏱️ ~{Math.max(1, Math.round(items.reduce((sum, item) => sum + (item.extra_data?.time_limit || 20), 0) / 60))} phút</span>
            </div>

            {gameConfig?.playerType === 'groupsort' && (
              <div className={styles.modeSelector}>
                <label className={styles.nameLabel}>⚙️ Chế độ độ chơi</label>
                <div className={styles.modeButtons}>
                  <button 
                    className={`${styles.modeBtn} ${gameMode === 'batch' ? styles.modeActive : ''}`} 
                    onClick={() => setGameMode('batch')}
                  >
                    🧩 Tự do
                  </button>
                  <button 
                    className={`${styles.modeBtn} ${gameMode === 'instant' ? styles.modeActive : ''}`} 
                    onClick={() => setGameMode('instant')}
                  >
                    🔥 Sinh tồn
                  </button>
                </div>
                <p className={styles.modeDesc}>
                  {gameMode === 'batch' 
                    ? 'Bạn có thể kéo thả tự do, sắp xếp và sửa sai trước khi bấm "Kiểm tra đáp án".'
                    : 'Nếu xếp đúng sẽ nhận báo cáo ngay. Nếu xếp sai 2 lần, từ đó sẽ BỊ HỦY DIỆT!'}
                </p>
              </div>
            )}

            <div className={styles.nameInputGroup}>
              <label className={styles.nameLabel}>👤 Tên của bạn</label>
              <input
                type="text"
                className={styles.nameInput}
                placeholder="VD: Nguyễn Văn A"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={40}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && playerName.trim()) startGame(); }}
              />
            </div>

            <button 
              className={`${styles.startBtn} ${!playerName.trim() ? styles.startBtnDisabled : ''}`}
              onClick={startGame}
              disabled={!playerName.trim()}
            >
              {playerName.trim() ? '▶ Bắt Đầu Chơi!' : '✏️ Nhập tên để bắt đầu'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── DELEGATE TO GAME PLAYER ────────────────────────────────
  const PlayerComponent = resolvePlayer(templateSlug);
  return <PlayerComponent items={items} activity={activity} playerName={playerName} gameMode={gameMode} />;
}
