/**
 * ============================================================
 * TINA MINIGAME — Game Registry (Unified)
 * ============================================================
 * DERIVES all config from templates.js. No duplicate data.
 * Single source of truth: templates.js
 */

import { TEMPLATES } from '@/data/templates';

// ── Build registry map from templates ────────────────────────
interface GameConfig {
  contentFormat: string;
  playerType: string;
  musicType: string;
  engineType: string;
  scoringPolicy: string;
  hasLeaderboard: boolean;
  hasTimer: boolean;
  inputMode: string;
  supportedFormats: string[];
  fallbackPlayer: string | null;
}

const _registry: Record<string, GameConfig> = {};
for (const t of TEMPLATES) {
  if (t.engine) {
    _registry[t.slug] = {
      contentFormat:    t.engine.contentFormat,
      playerType:       t.engine.playerType,
      musicType:        t.engine.musicType,
      engineType:       t.engine.engineType,
      scoringPolicy:    t.engine.scoringPolicy,
      hasLeaderboard:   t.engine.hasLeaderboard,
      hasTimer:         t.engine.hasTimer,
      inputMode:        t.engine.inputMode,
      supportedFormats: t.engine.supportedFormats,
      fallbackPlayer:   t.engine.fallbackPlayer || null,
    };
  }
}

export const GAME_REGISTRY = _registry;

/**
 * Get full game config for a template slug.
 */
export function getGameConfig(slug: string): GameConfig {
  return GAME_REGISTRY[slug] || GAME_REGISTRY['quiz'] || {
    contentFormat: 'MCQ', playerType: 'quiz', musicType: 'quiz',
    engineType: 'selection', scoringPolicy: 'time-speed',
    hasLeaderboard: true, hasTimer: true, inputMode: 'tap',
    supportedFormats: ['MCQ'], fallbackPlayer: null,
  };
}

/**
 * Get content format for a template slug.
 */
export function getContentFormat(slug: string): string {
  return GAME_REGISTRY[slug]?.contentFormat || 'MCQ';
}

/**
 * Get the engine type for a template slug.
 */
export function getEngineType(slug: string): string {
  return GAME_REGISTRY[slug]?.engineType || 'selection';
}

/**
 * Resolve the actual playerType to use (with fallback).
 * If a template has no dedicated player, fall back to a shared player
 * based on its engineType.
 */
export function resolvePlayerType(slug: string): string {
  const config = GAME_REGISTRY[slug];
  if (!config) return 'quiz';
  return config.playerType;
}

/**
 * Get all templates that support a given content format.
 */
export function getCompatibleTemplates(contentFormat: string) {
  return Object.entries(GAME_REGISTRY)
    .filter(([_, config]) => config.supportedFormats?.includes(contentFormat))
    .map(([slug, config]) => ({ slug, ...config }));
}

/**
 * Check if a template supports a content format.
 */
export function templateSupports(slug: string, contentFormat: string): boolean {
  const config = GAME_REGISTRY[slug];
  if (!config) return false;
  return config.supportedFormats?.includes(contentFormat) || config.contentFormat === contentFormat;
}

/**
 * Get all templates grouped by engine type.
 */
export function getTemplatesByEngine() {
  const groups = { selection: [], reveal: [], pairing: [], ordering: [], action: [] };
  for (const [slug, config] of Object.entries(GAME_REGISTRY)) {
    // @ts-ignore
    const group = groups[config.engineType];
    if (group) group.push({ slug, ...config });
  }
  return groups;
}

/**
 * Parse import text into content items based on content format.
 */
export function parseImportText(text: string, contentFormat: string): unknown[] {
  const lines = text.trim().split('\n').filter(l => l.trim());

  switch (contentFormat) {
    case 'MCQ': {
      // Look for vocab list format first
      const hasOptions = lines.some(l => /^[A-Da-d][.)]\s/.test(l));
      if (!hasOptions) {
        const vocabLines = lines.filter(l => /->|→|:|\t/.test(l));
        if (vocabLines.length > 0) {
           return vocabLines.map(line => {
             const parts = line.split(/->|→|:|\t/).map(s => s.trim());
             return {
                question: parts[0] || '',
                options: [parts[1] || '', '', '', ''],
                image_url: null,
                time_limit: 20
             };
           });
        }
      }

      const items = [];
      let current = null;
      for (const line of lines) {
        const optMatch = line.match(/^[A-Da-d][.)]\s*(.+)/);
        if (optMatch) {
          if (current) {
            const isCorrect = line.toLowerCase().includes('(correct)') || line.toLowerCase().includes('(đúng)');
            const cleanOpt = optMatch[1].replace(/\(correct\)|\(đúng\)/gi, '').trim();
            // @ts-ignore
            if (isCorrect) current.options.unshift(cleanOpt);
            // @ts-ignore
            else current.options.push(cleanOpt);
          }
        } else if (line.trim() !== '') {
          if (current && current.options.length > 0) items.push(current);
          current = { question: line.trim(), options: [], image_url: null, time_limit: 20 };
        }
      }
      if (current && current.options.length > 0) items.push(current);
      // @ts-ignore
      items.forEach(item => { while (item.options.length < 4) item.options.push(''); });
      return items;
    }

    case 'TRUE_FALSE': {
      return lines.map(line => {
        const parts = line.split(/->|→|:|=/).map(s => s.trim());
        const statement = parts[0] || line.trim();
        const answer = (parts[1] || '').toLowerCase();
        const isTrue = answer.includes('đúng') || answer.includes('true') || answer === 'đ' || answer === 't';
        return { question: statement, options: [isTrue ? 'Đúng' : 'Sai', isTrue ? 'Sai' : 'Đúng', '', ''], image_url: null, time_limit: 15 };
      });
    }

    case 'PAIRS': {
      return lines.map(line => {
        const parts = line.split(/->|→|:|\t/).map(s => s.trim());
        return { term: parts[0] || '', definition: parts[1] || '', image_url: null };
      });
    }

    case 'PAIRS_GROUP': {
      // Group by empty lines for rounds
      const groups = text.split(/\n\s*\n/).filter(g => g.trim());
      if (groups.length === 0) return [];
      
      return groups.map(group => {
        const pairs = group.split('\n').filter(l => l.trim()).map(line => {
          const parts = line.split(/->|→|:|\t/).map(s => s.trim());
          return { term: parts[0] || '', definition: parts[1] || '' };
        });
        return { pairs, image_url: null, time_limit: 45 };
      });
    }

    case 'LIST': {
      return lines.map(line => {
        const parts = line.split(/->|→/).map(s => s.trim());
        return { term: parts[0] || '', definition: parts[1] || '', image_url: null };
      });
    }

    case 'WORD': {
      return lines.map(line => {
        const parts = line.split(/->|→|:|\t/).map(s => s.trim());
        return { term: parts[0] || '', definition: parts[1] || '', image_url: null };
      });
    }

    case 'SENTENCE': {
      return lines.map(line => ({ term: line.trim(), definition: '', image_url: null }));
    }

    case 'GROUP': {
      // Complex format check (e.g., from ChatGPT)
      if (text.toLowerCase().includes('nhóm') && text.toLowerCase().includes('đáp án')) {
        const items = [];
        let currentGroup = null;
        let mode = 'CORRECT'; 
        
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          
          if (line.toLowerCase().includes('nhóm')) {
            let term = line;
            const match = line.match(/(?:nhóm)\s*\d*\s*[:\-]\s*(.*)/i);
            if (match && match[1]) {
               // Extract "🐶 Động vật có vú" (we can just use the whole line if we want, or try to keep emojis)
               // The user example is "🐶 Nhóm 1: Động vật có vú". Let's just use the whole line 
               // because teachers often like emojis. Or we clean it up. Let's use the whole line!
               term = line; 
            }
            currentGroup = { term: term, options: [], image_url: null };
            items.push(currentGroup);
            mode = 'CORRECT';
          } else if (line.toLowerCase().includes('đáp án đúng')) {
            mode = 'CORRECT';
          } else if (line.toLowerCase().includes('đáp án sai') || line.toLowerCase().includes('thẻ gây nhiễu')) {
            mode = 'WRONG';
          } else if (currentGroup) {
            // @ts-ignore
            currentGroup.options.push({ text: line, isCorrect: mode === 'CORRECT' });
          }
        }
        return items;
      }

      // Fallback simple format
      return lines.map(line => {
        const parts = line.split(/->|→|:|\t/).map(s => s.trim());
        return { term: parts[0] || '', definition: parts[1] || '', image_url: null };
      });
    }

    default:
      return lines.map(line => ({ term: line.trim(), definition: '', image_url: null }));
  }
}
