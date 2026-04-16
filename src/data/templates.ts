/**
 * ============================================================
 * TINA MINIGAME — Template Registry (Unified Single Source)
 * ============================================================
 *
 * SINGLE SOURCE OF TRUTH for all template metadata AND engine config.
 *
 * HOW TO ADD A NEW TEMPLATE:
 * 1. Add a new object to the TEMPLATES array below (including `engine` block).
 * 2. If the playerType has a dedicated component, add it to src/games/[folder]/
 * 3. If not, it auto-falls-back to the shared player for its engineType.
 * 4. Done! The template auto-appears on all pages and is immediately playable.
 *
 * No other files (gameRegistry, page.js) need to be modified.
 */

import type { EngineType } from '@/types';

// ── Fallback players per engine type ────────────────────────
// When a template doesn't have a dedicated player component,
// it falls back to these shared players.
export const ENGINE_FALLBACKS: Record<EngineType, string> = {
  selection: 'quiz',
  reveal:    'flashcards',
  pairing:   'matchingpairs',
  ordering:  'unjumble',
  action:    'whackamole',
};

// ── Category definitions ────────────────────────────────────
export interface TemplateCategory {
  id: string;
  labelKey: string;
  emoji: string;
}

export const CATEGORIES: TemplateCategory[] = [
  { id: 'all',      labelKey: 'cat.all',       emoji: '🎮' },
  { id: 'quiz',     labelKey: 'cat.quiz',  emoji: '❓' },
  { id: 'matching', labelKey: 'cat.matching',      emoji: '🔗' },
  { id: 'word',     labelKey: 'cat.word',       emoji: '🔤' },
  { id: 'sentence', labelKey: 'cat.sentence',           emoji: '✏️' },
  { id: 'card',     labelKey: 'cat.card',           emoji: '🃏' },
  { id: 'wheel',    labelKey: 'cat.wheel',     emoji: '🎡' },
  { id: 'action',   labelKey: 'cat.action',     emoji: '🏃' },
  { id: 'visual',   labelKey: 'cat.visual',      emoji: '📊' },
  { id: 'math',     labelKey: 'cat.math',      emoji: '🔢' },
];

// ── Color palette ───────────────────────────────────────────
export const COLORS = {
  purple:  '#6C5CE7',
  teal:    '#00B894',
  orange:  '#E17055',
  pink:    '#E84393',
  yellow:  '#FDCB6E',
  blue:    '#0984E3',
  red:     '#D63031',
  green:   '#00CEC9',
};

// ── Badge types ─────────────────────────────────────────────
export const BADGES = {
  POPULAR: { label: 'Phổ biến', emoji: '⭐' },
  NEW:     { label: 'Mới',     emoji: '🆕' },
  PRO:     { label: 'Pro',     emoji: '👑' },
};

// ═══════════════════════════════════════════════════════════
//  ALL 40 TEMPLATES — with engine config embedded
// ═══════════════════════════════════════════════════════════
export const TEMPLATES = [

  // ─────────────────────────────────────────────────────────
  //  QUIZ / SELECTION GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 6, slug: 'quiz',
    name: 'Quiz', nameVi: 'Trắc nghiệm',
    description: 'Một loạt câu hỏi trắc nghiệm. Chọn đáp án đúng để tiếp tục.',
    howToPlay: 'Đọc câu hỏi và chọn đáp án đúng từ các lựa chọn.',
    category: 'quiz', tier: 'standard', color: COLORS.purple,
    badges: ['POPULAR'], difficulty: 1, playerCount: '1-30',
    engine: {
      contentFormat: 'MCQ', playerType: 'quiz', musicType: 'quiz',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
    },
  },
  {
    id: 20, slug: 'gameshow-quiz',
    name: 'Gameshow Quiz', nameVi: 'Đố vui truyền hình',
    description: 'Trắc nghiệm với áp lực thời gian, trợ giúp và vòng bonus.',
    howToPlay: 'Trả lời câu hỏi trắc nghiệm với đồng hồ đếm ngược.',
    category: 'quiz', tier: 'pro', color: COLORS.pink,
    badges: ['PRO', 'POPULAR'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'MCQ', playerType: 'gameshow', musicType: 'gameshow',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
    },
  },
  {
    id: 38, slug: 'win-or-lose-quiz',
    name: 'Win or Lose Quiz', nameVi: 'Được ăn cả ngã về không',
    description: 'Trắc nghiệm với điểm số tự chọn cho mỗi câu hỏi.',
    howToPlay: 'Chọn mức điểm bạn muốn cược. Đúng thì nhận, sai thì mất!',
    category: 'quiz', tier: 'pro', color: COLORS.pink,
    badges: ['PRO'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'MCQ', playerType: 'winorlose', musicType: 'gameshow',
      engineType: 'selection', scoringPolicy: 'bet',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
    },
  },

  {
    id: 19, slug: 'type-the-answer',
    name: 'Type the Answer', nameVi: 'Gõ đáp án',
    description: 'Gõ đáp án đúng cho mỗi câu hỏi.',
    howToPlay: 'Đọc câu hỏi, gõ đáp án vào ô trả lời. Phải đánh vần chính xác!',
    category: 'quiz', tier: 'pro', color: COLORS.teal,
    badges: ['PRO'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'MCQ', playerType: 'typeanswer', musicType: 'quiz',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'type',
      supportedFormats: ['MCQ', 'PAIRS'],
    },
  },

  // ─────────────────────────────────────────────────────────
  //  TRUE/FALSE — SELECTION
  // ─────────────────────────────────────────────────────────
  {
    id: 29, slug: 'true-or-false',
    name: 'True or False', nameVi: 'Đúng hay Sai',
    description: 'Nhấn Đúng hoặc Sai trước khi hết thời gian!',
    howToPlay: 'Câu hỏi xuất hiện nhanh. Nhấn Đúng hoặc Sai.',
    category: 'quiz', tier: 'pro', color: COLORS.blue,
    badges: ['PRO'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'TRUE_FALSE', playerType: 'truefalse', musicType: 'quiz',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['TRUE_FALSE'],
    },
  },

  // ─────────────────────────────────────────────────────────
  //  CARD / REVEAL GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 9, slug: 'flash-cards',
    name: 'Flash Cards', nameVi: 'Thẻ ghi nhớ',
    description: 'Tự kiểm tra bằng thẻ gợi ý ở trước và đáp án ở sau.',
    howToPlay: 'Đọc mặt trước, thử trả lời, lật thẻ kiểm tra.',
    category: 'card', tier: 'standard', color: COLORS.yellow,
    badges: [], difficulty: 1, playerCount: '1', isTool: true,
    engine: {
      contentFormat: 'PAIRS', playerType: 'flashcards', musicType: 'calm',
      engineType: 'reveal', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'tap',
      supportedFormats: ['PAIRS', 'LIST'],
    },
  },
  {
    id: 10, slug: 'speaking-cards',
    name: 'Speaking Cards', nameVi: 'Thẻ nói',
    description: 'Rút thẻ ngẫu nhiên từ bộ bài đã xáo.',
    howToPlay: 'Nhấn để rút thẻ. Mỗi thẻ chứa chủ đề để thảo luận.',
    category: 'card', tier: 'standard', color: COLORS.orange,
    badges: ['NEW'], difficulty: 1, playerCount: '2-30', isTool: true,
    engine: {
      contentFormat: 'LIST', playerType: 'speakingcards', musicType: 'calm',
      engineType: 'action', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'tap',
      supportedFormats: ['LIST', 'WORD', 'PAIRS'],
      fallbackPlayer: 'flashcards',
    },
  },
  {
    id: 13, slug: 'random-cards',
    name: 'Random Cards', nameVi: 'Thẻ ngẫu nhiên',
    description: 'Rút thẻ ngẫu nhiên từ bộ bài đã xáo.',
    howToPlay: 'Nhấn nút để rút một thẻ ngẫu nhiên.',
    category: 'card', tier: 'standard', color: COLORS.teal,
    badges: [], difficulty: 1, playerCount: '1-30', isTool: true,
    engine: {
      contentFormat: 'PAIRS', playerType: 'flashcards', musicType: 'fun',
      engineType: 'reveal', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'reveal',
      supportedFormats: ['PAIRS', 'LIST'],
      fallbackPlayer: 'flashcards',
    },
  },
  {
    id: 26, slug: 'flip-tiles',
    name: 'Flip Tiles', nameVi: 'Lật thẻ',
    description: 'Nhấn để phóng to và vuốt để lật thẻ hai mặt.',
    howToPlay: 'Nhấn vào thẻ để phóng to, vuốt để lật sang mặt sau.',
    category: 'card', tier: 'pro', color: COLORS.pink,
    badges: ['PRO'], difficulty: 1, playerCount: '1-30',
    engine: {
      contentFormat: 'PAIRS', playerType: 'flashcards', musicType: 'calm',
      engineType: 'reveal', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'tap',
      supportedFormats: ['PAIRS'],
      fallbackPlayer: 'flashcards',
    },
  },

  // ─────────────────────────────────────────────────────────
  //  WHEEL / BOX — REVEAL GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 2, slug: 'spin-the-wheel',
    name: 'Spin the Wheel', nameVi: 'Vòng quay may mắn',
    description: 'Quay vòng quay để xem mục nào sẽ xuất hiện tiếp theo.',
    howToPlay: 'Nhấn nút quay để bắt đầu. Vòng quay dừng ngẫu nhiên.',
    category: 'wheel', tier: 'standard', color: COLORS.teal,
    badges: ['POPULAR'], difficulty: 1, playerCount: '1-40', isTool: true,
    engine: {
      contentFormat: 'LIST', playerType: 'spinwheel', musicType: 'fun',
      engineType: 'reveal', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'tap',
      supportedFormats: ['LIST', 'PAIRS'],
    },
  },
  {
    id: 14, slug: 'random-wheel',
    name: 'Random Wheel', nameVi: 'Vòng quay ngẫu nhiên',
    description: 'Quay vòng quay để xem mục nào xuất hiện tiếp theo.',
    howToPlay: 'Nhấn vào vòng quay để quay. Có thể quay nhiều lần.',
    category: 'wheel', tier: 'standard', color: COLORS.pink,
    badges: ['POPULAR'], difficulty: 1, playerCount: '1-40', isTool: true,
    engine: {
      contentFormat: 'LIST', playerType: 'spinwheel', musicType: 'fun',
      engineType: 'reveal', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'tap',
      supportedFormats: ['LIST', 'PAIRS'],
    },
  },
  {
    id: 3, slug: 'open-the-box',
    name: 'Open the Box', nameVi: 'Mở hộp bí ẩn',
    description: 'Chạm vào từng hộp để mở ra và xem nội dung.',
    howToPlay: 'Nhấn vào các hộp để mở chúng.',
    category: 'wheel', tier: 'standard', color: COLORS.yellow,
    badges: [], difficulty: 1, playerCount: '1-30',
    engine: {
      contentFormat: 'MCQ', playerType: 'openbox', musicType: 'fun',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
    },
  },

  // ─────────────────────────────────────────────────────────
  //  MATCHING / PAIRING GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 5, slug: 'matching-pairs',
    name: 'Matching Pairs', nameVi: 'Ghép đôi',
    description: 'Lật từng cặp thẻ để tìm các cặp trùng khớp.',
    howToPlay: 'Nhấn vào 2 thẻ để lật. Nếu khớp nhau, chúng biến mất.',
    category: 'matching', tier: 'standard', color: COLORS.blue,
    badges: ['POPULAR'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'PAIRS_GROUP', playerType: 'matchingpairs', musicType: 'calm',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['PAIRS'],
    },
  },
  {
    id: 8, slug: 'match-up',
    name: 'Match Up', nameVi: 'Nối nghĩa',
    description: 'Kéo và thả mỗi từ khóa bên cạnh định nghĩa.',
    howToPlay: 'Ghép mỗi từ khóa với định nghĩa phù hợp.',
    category: 'matching', tier: 'standard', color: COLORS.pink,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'PAIRS_GROUP', playerType: 'matchup', musicType: 'calm',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['PAIRS'],
    },
  },
  {
    id: 12, slug: 'find-the-match',
    name: 'Find the Match', nameVi: 'Tìm đáp án',
    description: 'Chạm vào đáp án đúng để loại bỏ.',
    howToPlay: 'Tìm và nhấn vào đáp án đúng.',
    category: 'matching', tier: 'standard', color: COLORS.purple,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'PAIRS', playerType: 'matchingpairs', musicType: 'quiz',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['PAIRS'],
      fallbackPlayer: 'matchingpairs',
    },
  },
  {
    id: 7, slug: 'group-sort',
    name: 'Group Sort', nameVi: 'Phân nhóm',
    description: 'Kéo và thả mỗi mục vào nhóm đúng.',
    howToPlay: 'Phân loại các mục vào các danh mục phù hợp.',
    category: 'matching', tier: 'standard', color: COLORS.teal,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'GROUP', playerType: 'groupsort', musicType: 'calm',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['GROUP'],
      fallbackPlayer: 'groupsort',
    },
  },
  {
    id: 17, slug: 'categorize',
    name: 'Categorize', nameVi: 'Phân loại',
    description: 'Kéo và thả mỗi mục vào đúng nhóm.',
    howToPlay: 'Phân loại các mục bằng cách kéo thả.',
    category: 'matching', tier: 'standard', color: COLORS.orange,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'GROUP', playerType: 'categorize', musicType: 'fun',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['GROUP'],
      fallbackPlayer: 'groupsort',
    },
  },
  {
    id: 31, slug: 'balloon-pop',
    name: 'Balloon Pop', nameVi: 'Bóng bay nổ',
    description: 'Nổ bóng bay để thả từ khóa xuống đúng định nghĩa.',
    howToPlay: 'Nhấn vào bóng đúng để thả từ khóa.',
    category: 'matching', tier: 'pro', color: COLORS.teal,
    badges: ['PRO'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'PAIRS', playerType: 'matchingpairs', musicType: 'fun',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['PAIRS'],
      fallbackPlayer: 'matchingpairs',
    },
  },
  {
    id: 33, slug: 'pair-or-no-pair',
    name: 'Pair or No Pair', nameVi: 'Có phải cặp không?',
    description: 'Quyết định xem hai thẻ có thuộc cùng nhóm hay không.',
    howToPlay: 'Nhấn "Cặp" hoặc "Không" nhanh và chính xác!',
    category: 'matching', tier: 'pro', color: COLORS.yellow,
    badges: ['PRO'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'PAIRS', playerType: 'matchingpairs', musicType: 'quiz',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['PAIRS'],
      fallbackPlayer: 'matchingpairs',
    },
  },
  {
    id: 36, slug: 'speed-sorting',
    name: 'Speed Sorting', nameVi: 'Phân loại nhanh',
    description: 'Kéo và thả nhanh từng mục vào đúng hộp.',
    howToPlay: 'Các mục xuất hiện liên tục. Kéo thả nhanh!',
    category: 'matching', tier: 'pro', color: COLORS.purple,
    badges: ['PRO'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'GROUP', playerType: 'matchingpairs', musicType: 'fun',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['GROUP'],
      fallbackPlayer: 'matchingpairs',
    },
  },

  // ─────────────────────────────────────────────────────────
  //  WORD / ORDERING GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 1, slug: 'anagram',
    name: 'Anagram', nameVi: 'Xáo chữ',
    description: 'Kéo các chữ cái vào đúng vị trí để giải mã từ.',
    howToPlay: 'Nhìn chữ cái bị xáo trộn, kéo thả vào đúng thứ tự.',
    category: 'word', tier: 'standard', color: COLORS.purple,
    badges: ['POPULAR'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'WORD', playerType: 'anagram', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['WORD'],
    },
  },
  {
    id: 25, slug: 'spell-the-word',
    name: 'Spell the Word', nameVi: 'Đánh vần',
    description: 'Sắp xếp chữ cái để đánh vần đáp án.',
    howToPlay: 'Xem gợi ý, sắp xếp chữ cái để đánh vần từ đúng.',
    category: 'word', tier: 'pro', color: COLORS.teal,
    badges: ['PRO'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'WORD', playerType: 'spelltheword', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['WORD'],
    },
  },
  {
    id: 22, slug: 'wordsearch',
    name: 'Wordsearch', nameVi: 'Tìm từ',
    description: 'Các từ được giấu trong lưới chữ cái.',
    howToPlay: 'Kéo để đánh dấu khi tìm thấy từ.',
    category: 'word', tier: 'pro', color: COLORS.orange,
    badges: ['PRO', 'POPULAR'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'WORDLIST', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: false, inputMode: 'navigate',
      supportedFormats: ['WORDLIST'],
      fallbackPlayer: 'unjumble',
    },
  },
  {
    id: 23, slug: 'hangman',
    name: 'Hangman', nameVi: 'Đoán từ',
    description: 'Đoán từ bằng cách chọn đúng các chữ cái.',
    howToPlay: 'Chọn từng chữ cái. Đoán từ trước khi hình hoàn thành!',
    category: 'word', tier: 'pro', color: COLORS.blue,
    badges: ['PRO', 'POPULAR'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'WORD', playerType: 'hangman', musicType: 'calm',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: false, inputMode: 'tap',
      supportedFormats: ['WORD'],
      fallbackPlayer: 'anagram',
    },
  },
  {
    id: 24, slug: 'crossword',
    name: 'Crossword', nameVi: 'Ô chữ',
    description: 'Dùng gợi ý để giải ô chữ.',
    howToPlay: 'Đọc gợi ý, nhấn vào ô chữ và gõ đáp án.',
    category: 'word', tier: 'pro', color: COLORS.purple,
    badges: ['PRO'], difficulty: 4, playerCount: '1',
    engine: {
      contentFormat: 'WORD', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'type',
      supportedFormats: ['WORD'],
      fallbackPlayer: 'unjumble',
    },
  },
  {
    id: 18, slug: 'word-magnets',
    name: 'Word Magnets', nameVi: 'Nam châm chữ',
    description: 'Kéo và thả các từ để sắp xếp thành câu.',
    howToPlay: 'Kéo chúng vào đúng vị trí để tạo thành câu hoàn chỉnh.',
    category: 'word', tier: 'standard', color: COLORS.purple,
    badges: [], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'SENTENCE', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'drag',
      supportedFormats: ['SENTENCE'],
      fallbackPlayer: 'unjumble',
    },
  },
  {
    id: 40, slug: 'word-magnets-pro',
    name: 'Word Magnets Pro', nameVi: 'Nam châm chữ Pro',
    description: 'Phiên bản nâng cao của Nam châm chữ.',
    howToPlay: 'Kéo thả các từ và chữ cái để sắp xếp thành câu.',
    category: 'word', tier: 'pro', color: COLORS.orange,
    badges: ['PRO'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'SENTENCE', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'drag',
      supportedFormats: ['SENTENCE'],
      fallbackPlayer: 'unjumble',
    },
  },

  // ─────────────────────────────────────────────────────────
  //  SENTENCE / ORDERING GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 4, slug: 'unjumble',
    name: 'Unjumble', nameVi: 'Sắp xếp câu',
    description: 'Kéo và thả các từ để sắp xếp lại câu đúng thứ tự.',
    howToPlay: 'Các từ bị xáo trộn. Kéo thả vào đúng vị trí.',
    category: 'sentence', tier: 'standard', color: COLORS.orange,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'SENTENCE', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['SENTENCE'],
    },
  },
  {
    id: 11, slug: 'complete-the-sentence',
    name: 'Complete the Sentence', nameVi: 'Hoàn thành câu',
    description: 'Kéo và thả từ vào chỗ trống để hoàn thành câu.',
    howToPlay: 'Kéo từ phù hợp từ ngân hàng từ vào đúng chỗ trống.',
    category: 'sentence', tier: 'standard', color: COLORS.blue,
    badges: [], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'SENTENCE', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['SENTENCE'],
      fallbackPlayer: 'unjumble',
    },
  },
  {
    id: 15, slug: 'missing-word',
    name: 'Missing Word', nameVi: 'Từ còn thiếu',
    description: 'Kéo và thả từ vào chỗ trống trong đoạn văn.',
    howToPlay: 'Chọn từ đúng và kéo vào chỗ trống phù hợp.',
    category: 'sentence', tier: 'standard', color: COLORS.yellow,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'SENTENCE', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['SENTENCE'],
      fallbackPlayer: 'unjumble',
    },
  },

  // ─────────────────────────────────────────────────────────
  //  ACTION GROUP
  // ─────────────────────────────────────────────────────────
  {
    id: 30, slug: 'whack-a-mole',
    name: 'Whack-a-Mole', nameVi: 'Đập chuột',
    description: 'Chuột chũi xuất hiện. Đập đúng con để thắng!',
    howToPlay: 'Đọc câu hỏi và đập vào con chuột có đáp án đúng.',
    category: 'action', tier: 'pro', color: COLORS.purple,
    badges: ['PRO', 'POPULAR'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'MCQ', playerType: 'whackamole', musicType: 'fun',
      engineType: 'action', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
    },
  },
  {
    id: 27, slug: 'maze-chase',
    name: 'Maze Chase', nameVi: 'Mê cung',
    description: 'Chạy đến đáp án đúng, tránh kẻ thù!',
    howToPlay: 'Điều khiển nhân vật chạy trong mê cung.',
    category: 'action', tier: 'pro', color: COLORS.yellow,
    badges: ['PRO', 'POPULAR'], difficulty: 3, playerCount: '1',
    engine: {
      contentFormat: 'MCQ', playerType: 'mazechase', musicType: 'fun',
      engineType: 'action', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'navigate',
      supportedFormats: ['MCQ'],
    },
  },
  {
    id: 28, slug: 'flying-fruit',
    name: 'Flying Fruit', nameVi: 'Trái cây bay',
    description: 'Đáp án bay ngang màn hình. Chạm vào đáp án đúng!',
    howToPlay: 'Nhấn nhanh vào đáp án đúng khi nó bay qua!',
    category: 'action', tier: 'pro', color: COLORS.orange,
    badges: ['PRO'], difficulty: 3, playerCount: '1',
    engine: {
      contentFormat: 'MCQ', playerType: 'whackamole', musicType: 'fun',
      engineType: 'action', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
      fallbackPlayer: 'whackamole',
    },
  },
  {
    id: 34, slug: 'airplane',
    name: 'Airplane', nameVi: 'Máy bay',
    description: 'Bay vào đáp án đúng và tránh đáp án sai!',
    howToPlay: 'Điều khiển máy bay bay qua các đáp án.',
    category: 'action', tier: 'pro', color: COLORS.orange,
    badges: ['PRO', 'NEW'], difficulty: 3, playerCount: '1',
    engine: {
      contentFormat: 'MCQ', playerType: 'whackamole', musicType: 'fun',
      engineType: 'action', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'navigate',
      supportedFormats: ['MCQ'],
      fallbackPlayer: 'whackamole',
    },
  },
  {
    id: 37, slug: 'watch-and-memorize',
    name: 'Watch & Memorize', nameVi: 'Xem và nhớ',
    description: 'Quan sát kỹ và nhớ các mục.',
    howToPlay: 'Các mục hiện ra ngắn. Ghi nhớ rồi chọn lại!',
    category: 'action', tier: 'pro', color: COLORS.teal,
    badges: ['PRO'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'LIST', playerType: 'flashcards', musicType: 'calm',
      engineType: 'reveal', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'reveal',
      supportedFormats: ['LIST'],
      fallbackPlayer: 'flashcards',
    },
  },

  // ─────────────────────────────────────────────────────────
  //  VISUAL / SPECIALIZED
  // ─────────────────────────────────────────────────────────
  {
    id: 16, slug: 'labelled-diagram',
    name: 'Labelled Diagram', nameVi: 'Sơ đồ có nhãn',
    description: 'Kéo nhãn vào đúng vị trí trên hình.',
    howToPlay: 'Kéo nhãn chính xác vào đúng vị trí trên hình.',
    category: 'visual', tier: 'standard', color: COLORS.blue,
    badges: [], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'DIAGRAM', playerType: 'matchingpairs', musicType: 'calm',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['DIAGRAM'],
      fallbackPlayer: 'matchingpairs',
    },
  },
  {
    id: 21, slug: 'labelled-diagram-pro',
    name: 'Labelled Diagram Pro', nameVi: 'Sơ đồ có nhãn Pro',
    description: 'Phiên bản nâng cao của Sơ đồ có nhãn.',
    howToPlay: 'Kéo thả nhãn với thêm tính năng tùy chỉnh.',
    category: 'visual', tier: 'pro', color: COLORS.yellow,
    badges: ['PRO'], difficulty: 3, playerCount: '1-30',
    engine: {
      contentFormat: 'DIAGRAM', playerType: 'matchingpairs', musicType: 'calm',
      engineType: 'pairing', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'drag',
      supportedFormats: ['DIAGRAM'],
      fallbackPlayer: 'matchingpairs',
    },
  },
  {
    id: 35, slug: 'rank-order',
    name: 'Rank Order', nameVi: 'Xếp hạng',
    description: 'Kéo và thả các mục vào đúng thứ tự.',
    howToPlay: 'Sắp xếp các mục theo thứ tự đúng.',
    category: 'visual', tier: 'pro', color: COLORS.blue,
    badges: ['PRO'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'LIST', playerType: 'unjumble', musicType: 'calm',
      engineType: 'ordering', scoringPolicy: 'none',
      hasLeaderboard: false, hasTimer: false, inputMode: 'drag',
      supportedFormats: ['LIST'],
      fallbackPlayer: 'unjumble',
    },
  },
  {
    id: 39, slug: 'maths-generator',
    name: 'Maths Generator', nameVi: 'Máy tạo bài Toán',
    description: 'Chọn chủ đề và tự động tạo ra bài toán.',
    howToPlay: 'Chọn dạng toán, mức độ khó, số lượng bài.',
    category: 'math', tier: 'pro', color: COLORS.yellow,
    badges: ['PRO'], difficulty: 2, playerCount: '1-30',
    engine: {
      contentFormat: 'MATH', playerType: 'quiz', musicType: 'quiz',
      engineType: 'selection', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'type',
      supportedFormats: ['MATH'],
      fallbackPlayer: 'quiz',
    },
  },
  {
    id: 999, slug: 'mazechase',
    name: 'Maze Chase', nameVi: 'Mê cung rượt đuổi',
    description: 'Chạy đua trong mê cung và săn điểm bằng cách ăn đáp án.',
    howToPlay: 'Điều khiển bằng 4 phím mũi tên. Tránh kẻ địch và ăn đáp án đúng!',
    category: 'action', tier: 'pro', color: COLORS.orange,
    badges: ['NEW', 'PRO'], difficulty: 3, playerCount: '1',
    engine: {
      contentFormat: 'MCQ', playerType: 'mazechase', musicType: 'fun',
      engineType: 'action', scoringPolicy: 'time-speed',
      hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
      supportedFormats: ['MCQ'],
    },
  },
];

// ═══════════════════════════════════════════════════════════
//  HELPER FUNCTIONS (auto-derived from data)
// ═══════════════════════════════════════════════════════════

/** Get all unique categories that have at least one template (excluding tools) */
export function getActiveCategories(): TemplateCategory[] {
  const activeCatIds = new Set(TEMPLATES.filter(t => !t.isTool).map(t => t.category));
  return CATEGORIES.filter(c => c.id === 'all' || activeCatIds.has(c.id));
}

/** Filter templates by category */
export function filterByCategory(categoryId: string) {
  const games = TEMPLATES.filter(t => !t.isTool);
  if (categoryId === 'all') return games;
  return games.filter(t => t.category === categoryId);
}

/** Filter templates by tier */
export function filterByTier(tier: string) {
  if (tier === 'all') return TEMPLATES;
  return TEMPLATES.filter(t => t.tier === tier);
}

/** Search templates by name */
export function searchTemplates(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return TEMPLATES;
  return TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.nameVi.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  );
}

/** Get a single template by slug */
export function getTemplateBySlug(slug: string) {
  return TEMPLATES.find(t => t.slug === slug) || null;
}

/** Get all slugs */
export function getAllSlugs(): string[] {
  return TEMPLATES.map(t => t.slug);
}

/** Get related templates (same category, excluding self) */
export function getRelatedTemplates(slug: string, limit: number = 4) {
  const current = getTemplateBySlug(slug);
  if (!current) return [];
  return TEMPLATES
    .filter(t => t.category === current.category && t.slug !== slug)
    .slice(0, limit);
}

/** Get featured templates (ones with POPULAR badge) */
export function getFeaturedTemplates(limit: number = 8) {
  return TEMPLATES
    .filter(t => t.badges.includes('POPULAR'))
    .slice(0, limit);
}

/** Get template count per category */
export function getCategoryCounts(): Record<string, number> {
  const counts = { all: TEMPLATES.length };
  TEMPLATES.forEach(t => {
    // @ts-ignore
    counts[t.category] = (counts[t.category] || 0) + 1;
  });
  return counts;
}

/**
 * Get all unique playerTypes that actually have components.
 * Used by play page to auto-build the PLAYERS import map.
 */
export function getAllPlayerTypes(): string[] {
  const set = new Set<string>();
  TEMPLATES.forEach(t => {
    if (t.engine?.playerType) set.add(t.engine.playerType);
  });
  return [...set];
}
