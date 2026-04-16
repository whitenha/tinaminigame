/**
 * ============================================================
 * TINA MINIGAME — Scoring Engine
 * ============================================================
 * Pure function scoring system.
 * 
 * Formula:
 *   score = basePoints × timeMultiplier × streakMultiplier × itemMultiplier
 *
 * - basePoints = 1000 (correct) or 0 (wrong/timeout)
 * - timeMultiplier = 0.2 + 0.8 × (timeRemaining / timeLimit)
 *   → Instant answer: 1000 × 1.0 = 1000
 *   → Last second:    1000 × 0.2 = 200
 *   → Timeout:        0
 * - streakMultiplier:
 *   - 0-2: ×1.0
 *   - 3-4: ×1.1 (🔥)
 *   - 5-6: ×1.2 (🔥🔥)
 *   - 7+:  ×1.3 (🔥🔥🔥)
 * - itemMultiplier: from power-ups (default 1.0)
 */

const BASE_POINTS = 1000;
const MIN_POINTS = 200;

/**
 * Get streak multiplier tier
 */
interface StreakInfo {
  multiplier: number;
  tier: number;
  emoji: string;
}

interface CalcScoreParams {
  isCorrect: boolean;
  timeRemainingMs: number;
  timeLimitMs: number;
  currentStreak?: number;
  itemMultiplier?: number;
}

interface ScoreBreakdown {
  base: number;
  timeMultiplier: number;
  streakMultiplier: number;
  itemMultiplier: number;
  rawBeforeRound: number;
}

interface CalcScoreResult {
  points: number;
  newStreak: number;
  breakdown: ScoreBreakdown;
  streakInfo: StreakInfo;
}

interface ScoreMessage {
  text: string;
  color: string;
}

/**
 * Get streak multiplier tier
 */
function getStreakMultiplier(streak: number): StreakInfo {
  if (streak >= 7) return { multiplier: 1.3, tier: 3, emoji: '🔥🔥🔥' };
  if (streak >= 5) return { multiplier: 1.2, tier: 2, emoji: '🔥🔥' };
  if (streak >= 3) return { multiplier: 1.1, tier: 1, emoji: '🔥' };
  return { multiplier: 1.0, tier: 0, emoji: '' };
}

/**
 * Calculate score for a single answer
 * @param {Object} params
 * @param {boolean} params.isCorrect - Was the answer correct?
 * @param {number} params.timeRemainingMs - Time remaining in milliseconds
 * @param {number} params.timeLimitMs - Total time limit in milliseconds
 * @param {number} params.currentStreak - Current streak count (before this answer)
 * @param {number} [params.itemMultiplier=1] - Multiplier from power-ups
 * @returns {{ points, newStreak, breakdown, streakInfo }}
 */
export function calcScore({
  isCorrect,
  timeRemainingMs,
  timeLimitMs,
  currentStreak = 0,
  itemMultiplier = 1,
}: CalcScoreParams): CalcScoreResult {
  // Wrong answer or timeout → 0 points, reset streak
  if (!isCorrect) {
    return {
      points: 0,
      newStreak: 0,
      breakdown: {
        base: 0,
        timeMultiplier: 0,
        streakMultiplier: 1,
        itemMultiplier,
        rawBeforeRound: 0,
      },
      streakInfo: getStreakMultiplier(0),
    };
  }

  // Time multiplier: linear decay from 1.0 → 0.2
  const timeRatio = Math.max(0, Math.min(1, timeRemainingMs / timeLimitMs));
  const timeMultiplier = 0.2 + 0.8 * timeRatio;

  // Streak
  const newStreak = currentStreak + 1;
  const streakInfo = getStreakMultiplier(newStreak);

  // Calculate
  const rawPoints = BASE_POINTS * timeMultiplier * streakInfo.multiplier * itemMultiplier;
  const points = Math.max(MIN_POINTS, Math.round(rawPoints));

  return {
    points,
    newStreak,
    breakdown: {
      base: BASE_POINTS,
      timeMultiplier: Math.round(timeMultiplier * 100) / 100,
      streakMultiplier: streakInfo.multiplier,
      itemMultiplier,
      rawBeforeRound: rawPoints,
    },
    streakInfo,
  };
}

/**
 * Get a message based on score earned
 */
export function getScoreMessage(points: number): ScoreMessage {
  if (points >= 900) return { text: 'PERFECT!', color: '#FFD700' };
  if (points >= 700) return { text: 'GREAT!', color: '#2ecc71' };
  if (points >= 500) return { text: 'GOOD!', color: '#3498db' };
  if (points >= 200) return { text: 'OK', color: '#f39c12' };
  return { text: 'MISS', color: '#e74c3c' };
}
