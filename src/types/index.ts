/**
 * ============================================================
 * TINA MINIGAME — Shared TypeScript Definitions
 * ============================================================
 * Central type registry. All modules should import from here.
 */

// ── Content Format & Engine Types ─────────────────────────────

export type ContentFormat =
  | 'MCQ' | 'TRUE_FALSE' | 'PAIRS' | 'PAIRS_GROUP'
  | 'LIST' | 'WORD' | 'WORDLIST' | 'SENTENCE'
  | 'GROUP' | 'DIAGRAM' | 'MATH';

export type EngineType =
  | 'selection' | 'pairing' | 'ordering' | 'reveal' | 'action';

export type PlayerType =
  | 'quiz' | 'gameshow' | 'truefalse' | 'typeanswer'
  | 'matchingpairs' | 'matchup' | 'groupsort'
  | 'unjumble' | 'anagram' | 'spelltheword'
  | 'flashcards' | 'speakingcards' | 'spinwheel'
  | 'whackamole' | 'mazechase' | 'imagequiz' | 'hangman';

// ── Template Types ────────────────────────────────────────────

export interface TemplateEngine {
  contentFormat: ContentFormat;
  engineType: EngineType;
  playerType: PlayerType | string;
  fallbackPlayer?: PlayerType | string;
  supportedFormats?: ContentFormat[];
}

export interface Template {
  id: number;
  slug: string;
  nameVi: string;
  nameEn: string;
  icon: string;
  color: string;
  category: string;
  description?: string;
  isPro?: boolean;
  isNew?: boolean;
  engine: TemplateEngine;
}

// ── Content Item Types ────────────────────────────────────────

export interface ContentItemBase {
  term?: string;
  definition?: string;
  image_url?: string | null;
  audio_url?: string | null;
  extra_data?: Record<string, unknown>;
}

export interface MCQItem extends ContentItemBase {
  question: string;
  options: string[];
  time_limit?: number;
  wrong1?: string;
  wrong2?: string;
  wrong3?: string;
}

export interface PairItem extends ContentItemBase {
  term: string;
  definition: string;
}

export interface GroupItem extends ContentItemBase {
  term: string;
  options: (string | { text: string; group?: string })[];
}

export interface PairsGroupItem extends ContentItemBase {
  pairs: { term: string; definition: string }[];
  time_limit?: number;
}

/** Union type for all possible content item shapes */
export type ContentItem = MCQItem | PairItem | GroupItem | PairsGroupItem | ContentItemBase;

// ── Game Engine Types ─────────────────────────────────────────

export type GamePhase = 'countdown' | 'playing' | 'feedback' | 'result';

export interface ShuffledOption {
  text: string;
  originalIndex: number;
}

export interface AnswerRecord {
  questionIndex: number;
  correct: boolean;
  selectedIndex: number;
}

export interface SelectionEngineOptions {
  musicType?: string;
  scoringPolicy?: 'time-speed' | 'fixed' | 'none';
  defaultTimeLimit?: number;
  hasCountdown?: boolean;
  feedbackDelay?: number;
  autoAdvance?: boolean;
  enableTTS?: boolean;
  initialScore?: number;
}

export interface SelectionEngineReturn {
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  countdownNum: number;
  currentQ: number;
  totalQ: number;
  currentItem: ContentItemBase | null;
  counterLabel: string;
  shuffledOptions: ShuffledOption[];
  shuffleOptionsForQuestion: (qIdx: number) => void;
  submitAnswer: (selectedOriginalIndex: number) => void;
  advanceToNext: () => void;
  selectedAnswer: number | null;
  showFeedback: boolean;
  score: number;
  setScore: (score: number | ((prev: number) => number)) => void;
  streak: number;
  setStreak: (streak: number | ((prev: number) => number)) => void;
  answers: AnswerRecord[];
  timeLeft: number;
  setTimeLeft: (timeLeft: number | ((prev: number) => number)) => void;
  timerPercent: number;
  isTimerDanger: boolean;
  maxTime: number;
  emit: (event: string) => void;
  GameEvent: Record<string, string>;
}

// ── Multiplayer Types ─────────────────────────────────────────

export type RoomPhase = 'lobby' | 'playing' | 'question' | 'leaderboard' | 'podium' | 'finished';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  is_host: boolean;
  is_online?: boolean;
  joined_at?: string;
}

export interface PowerUpEffect {
  type: string;
  name: string;
  duration?: number;
  value?: number;
  source_player_id?: string;
  target_player_id?: string;
  expires_at?: number;
}

export interface RoomState {
  roomId: string | null;
  phase: RoomPhase;
  players: RoomPlayer[];
  currentQuestion: number;
  isHost: boolean;
  hostId: string | null;
  activityId: string | null;
  myPlayerId: string | null;
  activePowerUps: PowerUpEffect[];
}

// ── Supabase DB Row Types ─────────────────────────────────────

export interface ActivitySettings {
  cover_image?: string | null;
  read_question?: boolean;
  read_options?: boolean;
  shuffle_questions?: boolean;
}

export interface ActivityRow {
  id: string;
  creator_id: string;
  title: string;
  template_slug: string;
  content_format: ContentFormat;
  share_code: string;
  is_public: boolean;
  settings: ActivitySettings;
  created_at: string;
  updated_at?: string;
}

export interface ContentItemRow {
  id: string;
  activity_id: string;
  position_index: number;
  term: string;
  definition: string;
  options: string[];
  image_url: string | null;
  audio_url: string | null;
  extra_data: Record<string, unknown> | null;
}

export interface RoomRow {
  id: string;
  activity_id: string;
  host_id: string;
  game_pin: string;
  phase: RoomPhase;
  current_question: number;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface RoomPlayerRow {
  id: string;
  room_id: string;
  user_name: string;
  avatar: string;
  score: number;
  streak: number;
  is_host: boolean;
  joined_at: string;
}

// ── Scoring & Power-Up Types ──────────────────────────────────

export interface ScoreInput {
  isCorrect: boolean;
  timeLeft: number;
  maxTime: number;
  streak: number;
  powerUps?: PowerUpEffect[];
}

export interface ScoreResult {
  points: number;
  streakBonus: number;
  totalPoints: number;
}

export type PowerUpRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface PowerUpDefinition {
  id: string;
  name: string;
  nameVi: string;
  icon: string;
  rarity: PowerUpRarity;
  description: string;
  effect: string;
  duration?: number;
  value?: number;
}

// ── Sound Manager Types ───────────────────────────────────────

export type SoundEffect =
  | 'click' | 'correct' | 'wrong' | 'streak'
  | 'countdown_tick' | 'countdown_go'
  | 'timer_warning' | 'game_start' | 'game_complete'
  | 'powerup_collect' | 'powerup_use'
  | 'jackpot' | 'reveal' | 'whoosh' | 'pop'
  | 'levelup' | 'coin' | 'explosion';

export type MusicType = 'quiz' | 'action' | 'chill' | 'intense' | 'victory';
