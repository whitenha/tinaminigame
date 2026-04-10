'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './SpinWheelPlayer.module.css';

// ── Dynamic HSL Color Generator ──────────────────────────────
const getColor = (idx, total) => `hsl(${(idx / total) * 360}, 80%, 80%)`;
const getNextColor = (idx, total) => `hsl(${((idx + 1) / total) * 360}, 80%, 80%)`;
const TEXT_COLOR = '#2C3E50';

// ── Confetti Colors ──────────────────────────────────────────
const CONFETTI_COLORS = [
  'hsl(0, 80%, 80%)', 'hsl(60, 80%, 80%)', 'hsl(120, 80%, 80%)',
  'hsl(180, 80%, 80%)', 'hsl(240, 80%, 80%)', 'hsl(300, 80%, 80%)',
];

// ── Sound Engine ─────────────────────────────────────────────
function playTick(ctx, type, volume = 0.5) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, now);

  switch (type) {
    case 'ticking': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.06);
      break;
    }
    case 'click': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.04);
      break;
    }
    case 'pop': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.1);
      break;
    }
    case 'bell': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.15);
      break;
    }
    case 'coin': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.12);
      break;
    }
    case 'laser': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.1);
      break;
    }
    case 'drum': {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.12);
      break;
    }
    case 'piano': {
      const freqs = [523.25, 587.33, 659.25, 698.46, 783.99];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.2);
      break;
    }
    case 'xylophone': {
      const freqs = [784, 880, 988, 1047, 1175];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.18);
      break;
    }
    case 'bubble': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      gain.gain.setValueAtTime(volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.14);
      break;
    }
    case 'chirp': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3000, now);
      osc.frequency.exponentialRampToValueAtTime(5000, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.06);
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.08);
      break;
    }
    case 'woodblock': {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.02);
      gain.gain.setValueAtTime(volume * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(5, now);
      osc.connect(filter); filter.connect(gain);
      osc.start(now); osc.stop(now + 0.05);
      break;
    }
    default: {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain); osc.start(now); osc.stop(now + 0.05);
    }
  }
}

// ── Confetti Component ───────────────────────────────────────
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 1.8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + Math.random() * 10,
    rotation: Math.random() * 360,
  }));
  return (
    <div className={styles.confettiWrap}>
      {pieces.map(p => (
        <div key={p.id} className={styles.confetti} style={{
          left: `${p.left}%`, animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`, backgroundColor: p.color,
          width: p.size, height: p.size * 0.5,
          transform: `rotate(${p.rotation}deg)`,
        }} />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  SpinWheelPlayer
// ═════════════════════════════════════════════════════════════
export default function SpinWheelPlayer({ items, activity, playerName }) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [results, setResults] = useState([]);
  const [quizState, setQuizState] = useState(null);
  const [remainingItems, setRemainingItems] = useState(items);

  const wheelRef = useRef(null);
  const rotationRef = useRef(0);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastSegRef = useRef(-1);

  // Read config from activity settings (fallback to defaults)
  const soundType = activity?.settings?.soundType || 'ticking';
  const soundVolume = activity?.settings?.soundVolume ?? 0.5;
  const spinDuration = activity?.settings?.spinDuration || 5;
  const removeWinner = activity?.settings?.removeWinner || false;

  const entries = remainingItems.filter(it => (it.term || '').trim() !== '');

  // Init audio
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Check MCQ
  const hasMCQ = (entry) => entry.definition && entry.extra_data?.wrong1 && entry.extra_data?.wrong2 && entry.extra_data?.wrong3;

  // Shuffle helper
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ── Spin ───────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (spinning || entries.length < 2) return;
    setSpinning(true);
    setWinner(null);
    setQuizState(null);
    setShowConfetti(false);

    const ctx = getAudioCtx();
    const nSegs = entries.length;
    const segAngle = 360 / nSegs;
    const chosenIdx = Math.floor(Math.random() * nSegs);
    const extra = 5 + Math.floor(Math.random() * 4);
    const targetAngle = -(chosenIdx * segAngle + segAngle / 2);
    const totalRotation = rotationRef.current + extra * 360 +
      (targetAngle - (rotationRef.current % 360) + 720) % 360;

    const startRot = rotationRef.current;
    const deltaRot = totalRotation - startRot;
    rotationRef.current = totalRotation;

    const dur = spinDuration;
    const startTime = performance.now();
    lastSegRef.current = -1;

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${dur}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    // Sound tick loop
    const tickLoop = (now) => {
      const elapsed = (now - startTime) / 1000;
      const t = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentRot = startRot + deltaRot * eased;
      const normalized = ((currentRot % 360) + 360) % 360;
      const currentSeg = Math.floor(normalized / segAngle) % nSegs;

      if (currentSeg !== lastSegRef.current && lastSegRef.current !== -1) {
        playTick(ctx, soundType, soundVolume);
      }
      lastSegRef.current = currentSeg;
      if (t < 1) animFrameRef.current = requestAnimationFrame(tickLoop);
    };
    animFrameRef.current = requestAnimationFrame(tickLoop);

    setTimeout(() => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setSpinning(false);
      const won = entries[chosenIdx];
      setWinner(won);

      if (hasMCQ(won)) {
        const options = shuffleArray([
          { text: won.definition, correct: true },
          { text: won.extra_data?.wrong1, correct: false },
          { text: won.extra_data?.wrong2, correct: false },
          { text: won.extra_data?.wrong3, correct: false },
        ]);
        setQuizState({ entry: won, options, selected: null, answered: false });
      } else {
        setResults(prev => [won, ...prev]);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        if (removeWinner) {
          setRemainingItems(prev => prev.filter(it => it !== won));
        }
      }
    }, dur * 1000 + 100);
  }, [spinning, entries, spinDuration, soundType, soundVolume, removeWinner, getAudioCtx]);

  // ── Quiz answer ────────────────────────────────────────────
  const handleQuizAnswer = useCallback((optionIdx) => {
    if (!quizState || quizState.answered) return;
    const option = quizState.options[optionIdx];
    setQuizState(prev => ({ ...prev, selected: optionIdx, answered: true }));

    if (option.correct) {
      setResults(prev => [quizState.entry, ...prev]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    setTimeout(() => {
      if (option.correct && removeWinner) {
        setRemainingItems(prev => prev.filter(it => it !== quizState.entry));
      }
      setWinner(null);
      setQuizState(null);
    }, 2500);
  }, [quizState, removeWinner]);

  // ── Render SVG wheel ───────────────────────────────────────
  const renderWheel = () => {
    const size = 500;
    const cx = size / 2;
    const cy = size / 2;
    const r = 240;

    if (entries.length === 0) {
      return (
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.wheelSvg}>
          <circle cx={cx} cy={cy} r={r} fill="#37474F" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <text x={cx} y={cy} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="18" fontWeight="700">Trống</text>
        </svg>
      );
    }

    const n = entries.length;
    const segAngle = 360 / n;

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.wheelSvg}>
        <defs>
          <clipPath id="centerClipPlay">
            <circle cx={cx} cy={cy} r="32" />
          </clipPath>
          {entries.map((_, i) => {
            const c1 = getColor(i, n);
            const c2 = getNextColor(i, n);
            const midRad = ((i + 0.5) * segAngle) * Math.PI / 180;
            const gx1 = cx + r * 0.3 * Math.cos(midRad - 0.5);
            const gy1 = cy + r * 0.3 * Math.sin(midRad - 0.5);
            const gx2 = cx + r * 0.9 * Math.cos(midRad + 0.5);
            const gy2 = cy + r * 0.9 * Math.sin(midRad + 0.5);
            return (
              <linearGradient key={`g${i}`} id={`playGrad${i}`}
                x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
            );
          })}
        </defs>

        {entries.map((item, i) => {
          const startAngle = i * segAngle;
          const endAngle = (i + 1) * segAngle;
          const startRad = startAngle * Math.PI / 180;
          const endRad = endAngle * Math.PI / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const largeArc = segAngle > 180 ? 1 : 0;
          const midAngle = (startAngle + endAngle) / 2;
          const midRad = midAngle * Math.PI / 180;
          const textDist = r * 0.65;
          const tx = cx + textDist * Math.cos(midRad);
          const ty = cy + textDist * Math.sin(midRad);
          const textRot = midAngle + (midAngle > 90 && midAngle < 270 ? 180 : 0);
          const label = (item.term || '').trim();
          const maxLen = n > 16 ? 6 : n > 10 ? 10 : 14;
          const display = label.length > maxLen ? label.slice(0, maxLen) + '…' : label;
          const fontSize = n > 20 ? 9 : n > 14 ? 10 : n > 8 ? 12 : 14;
          const hasImage = !!item.image_url;
          const imgDist = r * 0.4;
          const imgX = cx + imgDist * Math.cos(midRad);
          const imgY = cy + imgDist * Math.sin(midRad);
          const imgSize = n > 12 ? 18 : 24;

          return (
            <g key={i}>
              <path
                d={n === 1
                  ? `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`
                  : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                fill={`url(#playGrad${i})`}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
              />
              {hasImage && (
                <>
                  <defs>
                    <clipPath id={`playClip${i}`}>
                      <circle cx={imgX} cy={imgY} r={imgSize / 2}/>
                    </clipPath>
                  </defs>
                  <image
                    href={item.image_url}
                    x={imgX - imgSize / 2} y={imgY - imgSize / 2}
                    width={imgSize} height={imgSize}
                    clipPath={`url(#playClip${i})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </>
              )}
              <text
                x={tx} y={ty}
                transform={`rotate(${textRot}, ${tx}, ${ty})`}
                textAnchor="middle" dominantBaseline="middle"
                fill={TEXT_COLOR}
                fontSize={hasImage ? Math.max(fontSize - 2, 8) : fontSize}
                fontWeight="800"
                fontFamily="'Baloo 2', 'Inter', sans-serif"
                style={{ textShadow: '0 0.5px 1px rgba(255,255,255,0.4)' }}
              >
                {display}
              </text>
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />

        {/* Center hub */}
        <circle cx={cx} cy={cy} r="32" fill="white" />
        <circle cx={cx} cy={cy} r="28" fill="white" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="6" fill="#ccc" />
        <circle cx={cx} cy={cy} r="32" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
      </svg>
    );
  };

  return (
    <div className={styles.page}>
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{activity?.title || 'Vòng Quay May Mắn'}</h1>
        <div className={styles.playerTag}>👤 {playerName}</div>
      </div>

      {/* Main layout */}
      <div className={styles.mainLayout}>
        {/* Wheel area */}
        <div className={styles.wheelArea}>
          <div className={styles.wheelWrapper}>
            <div
              className={styles.wheelBody}
              ref={wheelRef}
              onClick={handleSpin}
              style={{ cursor: (spinning || entries.length < 2) ? 'default' : 'pointer' }}
            >
              {renderWheel()}
            </div>

            {/* Pointer (RIGHT side) */}
            <div className={styles.pointer}>
              <svg width="36" height="50" viewBox="0 0 36 50" fill="none">
                <path d="M0 25L36 0V50L0 25Z" fill="#546E7A" stroke="#37474F" strokeWidth="1.5"/>
                <path d="M4 25L32 4V46L4 25Z" fill="#78909C" opacity="0.5"/>
              </svg>
            </div>
          </div>

          {/* Spin button */}
          <button
            className={`${styles.spinBtn} ${(spinning || entries.length < 2) ? styles.spinDisabled : ''}`}
            onClick={handleSpin}
            disabled={spinning || entries.length < 2}
          >
            {spinning ? '⏳ Đang quay...' : '🎡 QUAY!'}
          </button>
        </div>

        {/* Results panel (right side) */}
        <div className={styles.resultsPanel}>
          <h3 className={styles.resultsPanelTitle}>
            📋 Kết quả <span className={styles.resultsCount}>{results.length}</span>
          </h3>
          {results.length === 0 ? (
            <div className={styles.noResults}>
              <span className={styles.noResultsIcon}>🎯</span>
              <p>Quay vòng quay để xem kết quả</p>
            </div>
          ) : (
            <div className={styles.resultsList}>
              {results.map((r, i) => (
                <div key={i} className={styles.resultItem}>
                  <span className={styles.resultNum}>{results.length - i}</span>
                  {r.image_url && <img src={r.image_url} alt="" className={styles.resultImg} />}
                  <span className={styles.resultName}>{r.term}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Winner popup — simple mode */}
      {winner && !spinning && !quizState && (
        <div className={styles.winnerOverlay} onClick={() => setWinner(null)}>
          <div className={styles.winnerCard} onClick={e => e.stopPropagation()}>
            <div className={styles.winnerEmoji}>🎉</div>
            {winner.image_url && <img src={winner.image_url} alt="" className={styles.winnerImage} />}
            <h2 className={styles.winnerName}>{winner.term}</h2>
            {winner.definition && <p className={styles.winnerDesc}>{winner.definition}</p>}
            <button className={styles.winnerOk} onClick={() => setWinner(null)}>OK</button>
          </div>
        </div>
      )}

      {/* Quiz popup — MCQ mode */}
      {quizState && !spinning && (
        <div className={styles.winnerOverlay}>
          <div className={styles.quizCard} onClick={e => e.stopPropagation()}>
            <div className={styles.quizHeader}>
              <span className={styles.quizEmoji}>❓</span>
              {winner?.image_url && <img src={winner.image_url} alt="" className={styles.winnerImage} />}
              <h2 className={styles.quizQuestion}>{winner?.term}</h2>
              <p className={styles.quizSubtitle}>Chọn đáp án đúng:</p>
            </div>
            <div className={styles.quizOptions}>
              {quizState.options.map((opt, idx) => {
                let optClass = styles.quizOption;
                if (quizState.answered) {
                  if (opt.correct) optClass += ' ' + styles.quizCorrect;
                  else if (quizState.selected === idx) optClass += ' ' + styles.quizWrong;
                  else optClass += ' ' + styles.quizDimmed;
                }
                return (
                  <button
                    key={idx}
                    className={optClass}
                    onClick={() => handleQuizAnswer(idx)}
                    disabled={quizState.answered}
                  >
                    <span className={styles.quizLabel}>{['A', 'B', 'C', 'D'][idx]}</span>
                    <span className={styles.quizText}>{opt.text}</span>
                    {quizState.answered && opt.correct && <span className={styles.quizMark}>✓</span>}
                    {quizState.answered && quizState.selected === idx && !opt.correct && <span className={styles.quizMark}>✗</span>}
                  </button>
                );
              })}
            </div>
            {quizState.answered && (
              <div className={styles.quizResult}>
                {quizState.options[quizState.selected]?.correct ? (
                  <span className={styles.quizResultCorrect}>🎉 Chính xác!</span>
                ) : (
                  <span className={styles.quizResultWrong}>❌ Sai rồi! Đáp án đúng: {quizState.options.find(o => o.correct)?.text}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
