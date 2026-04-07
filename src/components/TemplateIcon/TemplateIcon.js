/**
 * TemplateIcon — Renders a unique SVG icon for each template.
 *
 * HOW TO ADD A NEW ICON:
 * Just add a new case in the switch statement with the template slug.
 * Each icon is a simple SVG drawing inside a colored circle.
 */

export default function TemplateIcon({ slug, color, size = 64 }) {
  const iconContent = getIconContent(slug);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill={color} opacity="0.12" />
      <circle cx="32" cy="32" r="24" fill={color} opacity="0.2" />
      {/* Icon content */}
      <g fill={color} stroke={color} strokeWidth="0">
        {iconContent}
      </g>
    </svg>
  );
}

function getIconContent(slug) {
  switch (slug) {
    case 'anagram':
      return (
        <>
          <rect x="16" y="26" width="10" height="12" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="27" y="26" width="10" height="12" rx="2" fill="currentColor" opacity="0.8" />
          <rect x="38" y="26" width="10" height="12" rx="2" fill="currentColor" />
          <text x="19" y="35" fontSize="8" fill="white" fontWeight="bold">A</text>
          <text x="30" y="35" fontSize="8" fill="white" fontWeight="bold">B</text>
          <text x="41" y="35" fontSize="8" fill="white" fontWeight="bold">C</text>
          <path d="M23 22 L27 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M41 22 L37 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      );
    case 'spin-the-wheel':
    case 'random-wheel':
      return (
        <>
          <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <line x1="32" y1="18" x2="32" y2="32" stroke="currentColor" strokeWidth="2" />
          <line x1="32" y1="32" x2="42" y2="26" stroke="currentColor" strokeWidth="2" />
          <line x1="32" y1="32" x2="22" y2="26" stroke="currentColor" strokeWidth="2" />
          <line x1="32" y1="32" x2="32" y2="46" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="32" r="3" fill="currentColor" />
          <polygon points="32,14 29,10 35,10" fill="currentColor" />
        </>
      );
    case 'open-the-box':
      return (
        <>
          <rect x="20" y="24" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <path d="M20 30 L44 30" stroke="currentColor" strokeWidth="2" />
          <rect x="29" y="27" width="6" height="6" rx="1" fill="currentColor" />
          <path d="M18 24 L32 16 L46 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        </>
      );
    case 'unjumble':
      return (
        <>
          <rect x="14" y="28" width="12" height="8" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="28" y="28" width="8" height="8" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="38" y="28" width="12" height="8" rx="2" fill="currentColor" />
          <path d="M20 24 C20 20 32 20 32 24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
          <polygon points="32,22 30,26 34,26" fill="currentColor" />
        </>
      );
    case 'matching-pairs':
      return (
        <>
          <rect x="18" y="22" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="35" y="22" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.3" />
          <rect x="18" y="35" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.3" />
          <rect x="35" y="35" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <text x="21" y="30" fontSize="6" fill="currentColor" fontWeight="bold">⭐</text>
          <text x="38" y="30" fontSize="6" fill="currentColor" fontWeight="bold">⭐</text>
        </>
      );
    case 'quiz':
      return (
        <>
          <circle cx="32" cy="30" r="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <text x="26" y="36" fontSize="16" fill="currentColor" fontWeight="bold">?</text>
          <circle cx="32" cy="47" r="2" fill="currentColor" />
        </>
      );
    case 'group-sort':
    case 'categorize':
      return (
        <>
          <rect x="16" y="20" width="14" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="34" y="20" width="14" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="23" cy="28" r="3" fill="currentColor" opacity="0.5" />
          <circle cx="23" cy="36" r="3" fill="currentColor" opacity="0.7" />
          <circle cx="41" cy="28" r="3" fill="currentColor" />
          <circle cx="41" cy="36" r="3" fill="currentColor" opacity="0.4" />
        </>
      );
    case 'match-up':
      return (
        <>
          <rect x="14" y="24" width="14" height="6" rx="3" fill="currentColor" opacity="0.8" />
          <rect x="14" y="34" width="14" height="6" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="36" y="24" width="14" height="6" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="36" y="34" width="14" height="6" rx="3" fill="currentColor" opacity="0.8" />
          <line x1="28" y1="27" x2="36" y2="37" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="28" y1="37" x2="36" y2="27" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        </>
      );
    case 'flash-cards':
    case 'random-cards':
    case 'speaking-cards':
      return (
        <>
          <rect x="20" y="18" width="20" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-5 30 32)" />
          <rect x="24" y="18" width="20" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.15" transform="rotate(5 34 32)" />
          <text x="30" y="36" fontSize="10" fill="currentColor" fontWeight="bold">A</text>
        </>
      );
    case 'complete-the-sentence':
    case 'missing-word':
      return (
        <>
          <rect x="16" y="24" width="32" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="20" y1="29" x2="28" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="30" y="27" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.2" strokeDasharray="2 1" />
          <line x1="20" y1="35" x2="44" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </>
      );
    case 'find-the-match':
      return (
        <>
          <circle cx="24" cy="26" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="40" cy="26" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.3" />
          <circle cx="32" cy="38" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M28 32 L36 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'labelled-diagram':
    case 'labelled-diagram-pro':
      return (
        <>
          <rect x="18" y="20" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="28" cy="30" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="38" cy="36" r="3" fill="currentColor" opacity="0.5" />
          <line x1="28" y1="26" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="28" cy="18" r="2" fill="currentColor" />
          <line x1="41" y1="36" x2="46" y2="36" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="46" cy="36" r="2" fill="currentColor" />
        </>
      );
    case 'word-magnets':
    case 'word-magnets-pro':
      return (
        <>
          <rect x="14" y="22" width="16" height="8" rx="4" fill="currentColor" opacity="0.6" />
          <rect x="34" y="22" width="14" height="8" rx="4" fill="currentColor" opacity="0.4" />
          <rect x="18" y="34" width="12" height="8" rx="4" fill="currentColor" opacity="0.8" />
          <rect x="34" y="34" width="10" height="8" rx="4" fill="currentColor" />
        </>
      );
    case 'type-the-answer':
      return (
        <>
          <rect x="18" y="24" width="28" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="22" y1="32" x2="34" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="36" y="29" width="1.5" height="8" fill="currentColor" opacity="0.6">
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
          </rect>
        </>
      );
    case 'gameshow-quiz':
      return (
        <>
          <polygon points="32,16 36,26 46,26 38,32 41,42 32,36 23,42 26,32 18,26 28,26" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <text x="27" y="34" fontSize="10" fill="currentColor" fontWeight="bold">!</text>
        </>
      );
    case 'wordsearch': {
      const opacities = [0.4, 0.7, 0.5, 0.3, 0.6, 0.8, 0.35, 0.55, 0.45, 0.65, 0.75, 0.5, 0.3, 0.6, 0.4, 0.7];
      return (
        <>
          <rect x="18" y="18" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          {[0,1,2,3].map(r => [0,1,2,3].map(c => (
            <circle key={`${r}-${c}`} cx={24 + c*6} cy={24 + r*6} r="1.5" fill="currentColor" opacity={opacities[r * 4 + c]} />
          )))}
          <line x1="24" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </>
      );
    }
    case 'hangman':
      return (
        <>
          <line x1="20" y1="44" x2="36" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="24" y1="44" x2="24" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="24" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="36" y1="20" x2="36" y2="24" stroke="currentColor" strokeWidth="2" />
          <circle cx="36" cy="27" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="36" y1="30" x2="36" y2="37" stroke="currentColor" strokeWidth="1.5" />
        </>
      );
    case 'crossword':
      return (
        <>
          {/* Grid */}
          <rect x="20" y="24" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
          <rect x="28" y="24" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
          <rect x="36" y="24" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
          <rect x="28" y="32" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.3" />
          <rect x="28" y="16" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
        </>
      );
    case 'spell-the-word':
      return (
        <>
          <rect x="16" y="28" width="8" height="10" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="26" y="28" width="8" height="10" rx="2" fill="currentColor" opacity="0.7" />
          <rect x="36" y="28" width="8" height="10" rx="2" fill="currentColor" opacity="0.9" />
          <text x="18" y="36" fontSize="6" fill="white" fontWeight="bold">C</text>
          <text x="28" y="36" fontSize="6" fill="white" fontWeight="bold">A</text>
          <text x="38" y="36" fontSize="6" fill="white" fontWeight="bold">T</text>
          <path d="M30 24 L30 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="30" cy="18" r="2" fill="currentColor" opacity="0.5" />
        </>
      );
    case 'flip-tiles':
      return (
        <>
          <rect x="18" y="22" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <rect x="34" y="22" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none" transform="skewY(-3)" />
          <path d="M30 32 C31 30 33 30 34 32" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </>
      );
    case 'maze-chase':
      return (
        <>
          <rect x="18" y="18" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="18" y1="27" x2="30" y2="27" stroke="currentColor" strokeWidth="2" />
          <line x1="34" y1="18" x2="34" y2="34" stroke="currentColor" strokeWidth="2" />
          <line x1="26" y1="34" x2="46" y2="34" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="22" r="3" fill="currentColor" />
          <circle cx="40" cy="40" r="3" fill="currentColor" opacity="0.4" />
        </>
      );
    case 'flying-fruit':
      return (
        <>
          <circle cx="26" cy="32" r="6" fill="currentColor" opacity="0.6" />
          <circle cx="40" cy="28" r="5" fill="currentColor" opacity="0.4" />
          <circle cx="34" cy="38" r="4" fill="currentColor" opacity="0.8" />
          <path d="M20 30 L14 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M36 24 L34 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case 'true-or-false':
      return (
        <>
          <circle cx="24" cy="32" r="10" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.15" />
          <path d="M20 32 L23 35 L28 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="42" cy="32" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <path d="M39 29 L45 35 M45 29 L39 35" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
    case 'whack-a-mole':
      return (
        <>
          <ellipse cx="32" cy="40" rx="14" ry="4" fill="currentColor" opacity="0.2" />
          <circle cx="32" cy="30" r="8" fill="currentColor" opacity="0.6" />
          <circle cx="29" cy="28" r="1.5" fill="white" />
          <circle cx="35" cy="28" r="1.5" fill="white" />
          <ellipse cx="32" cy="32" rx="3" ry="1.5" fill="currentColor" opacity="0.4" />
        </>
      );
    case 'balloon-pop':
      return (
        <>
          <ellipse cx="26" cy="28" rx="7" ry="9" fill="currentColor" opacity="0.5" />
          <ellipse cx="38" cy="26" rx="6" ry="8" fill="currentColor" opacity="0.7" />
          <line x1="26" y1="37" x2="24" y2="44" stroke="currentColor" strokeWidth="1" />
          <line x1="38" y1="34" x2="40" y2="42" stroke="currentColor" strokeWidth="1" />
          <text x="23" y="31" fontSize="6" fill="white" fontWeight="bold">A</text>
        </>
      );
    case 'image-quiz':
      return (
        <>
          <rect x="18" y="20" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="32" cy="32" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.15" />
          <polygon points="30,30 36,33 30,36" fill="currentColor" />
          <circle cx="42" cy="22" r="4" fill="currentColor" opacity="0.6" />
          <text x="40" y="24" fontSize="5" fill="white" fontWeight="bold">?</text>
        </>
      );
    case 'pair-or-no-pair':
      return (
        <>
          <rect x="16" y="24" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <rect x="34" y="24" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <text x="20" y="35" fontSize="8" fill="currentColor" fontWeight="bold">A</text>
          <text x="38" y="35" fontSize="8" fill="currentColor" fontWeight="bold">A</text>
          <path d="M30 32 L34 32" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
        </>
      );
    case 'airplane':
      return (
        <>
          <path d="M22 38 L36 26 L44 22 L40 30 L28 36 Z" fill="currentColor" opacity="0.6" />
          <path d="M40 30 L44 22" stroke="currentColor" strokeWidth="2" />
          <path d="M28 36 L24 40 L30 38" fill="currentColor" opacity="0.4" />
          <line x1="22" y1="38" x2="18" y2="42" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </>
      );
    case 'rank-order':
      return (
        <>
          <rect x="20" y="20" width="24" height="6" rx="3" fill="currentColor" opacity="0.3" />
          <rect x="20" y="29" width="24" height="6" rx="3" fill="currentColor" opacity="0.6" />
          <rect x="20" y="38" width="24" height="6" rx="3" fill="currentColor" opacity="0.9" />
          <text x="16" y="25" fontSize="6" fill="currentColor">1</text>
          <text x="16" y="34" fontSize="6" fill="currentColor">2</text>
          <text x="16" y="43" fontSize="6" fill="currentColor">3</text>
        </>
      );
    case 'speed-sorting':
      return (
        <>
          <rect x="16" y="30" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="34" y="30" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="32" cy="22" r="5" fill="currentColor" opacity="0.6" />
          <path d="M28 26 L24 30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
          <path d="M36 26 L40 30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </>
      );
    case 'watch-and-memorize':
      return (
        <>
          <circle cx="32" cy="30" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="28" cy="28" r="2" fill="currentColor" />
          <circle cx="36" cy="28" r="2" fill="currentColor" />
          <path d="M26 34 C28 38 36 38 38 34" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="32" y1="14" x2="32" y2="18" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="32" cy="13" r="1.5" fill="currentColor" opacity="0.5" />
        </>
      );
    case 'win-or-lose-quiz':
      return (
        <>
          <rect x="18" y="20" width="28" height="24" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
          <text x="24" y="36" fontSize="14" fill="currentColor" fontWeight="bold">$</text>
          <text x="36" y="28" fontSize="8" fill="currentColor" fontWeight="bold">?</text>
        </>
      );
    case 'maths-generator':
      return (
        <>
          <text x="18" y="30" fontSize="11" fill="currentColor" fontWeight="bold">2</text>
          <text x="28" y="30" fontSize="11" fill="currentColor" fontWeight="bold">+</text>
          <text x="37" y="30" fontSize="11" fill="currentColor" fontWeight="bold">3</text>
          <line x1="18" y1="34" x2="46" y2="34" stroke="currentColor" strokeWidth="2" />
          <text x="28" y="44" fontSize="11" fill="currentColor" fontWeight="bold">5</text>
        </>
      );
    default:
      return (
        <>
          <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
          <text x="27" y="37" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
        </>
      );
  }
}
