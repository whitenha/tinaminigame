'use client';

import { useState, useRef, useCallback } from 'react';
import { R2UploadWidget } from '@/components/Uploader/R2UploadWidget';
import styles from './WheelEditor.module.css';

// ── Dynamic HSL Color Generator for unbroken gradients ──
const getColor = (idx: any, total: any) => `hsl(${(idx / total) * 360}, 80%, 80%)`;
const getNextColor = (idx: any, total: any) => `hsl(${((idx + 1) / total) * 360}, 80%, 80%)`;

const CONFETTI_COLORS = [
  'hsl(0, 80%, 80%)',   // Red
  'hsl(60, 80%, 80%)',  // Yellow
  'hsl(120, 80%, 80%)', // Green
  'hsl(180, 80%, 80%)', // Cyan
  'hsl(240, 80%, 80%)', // Blue
  'hsl(300, 80%, 80%)', // Magenta
];

// Text color for pastel backgrounds
const TEXT_COLOR = '#2C3E50';

const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'tina_minigame';

// ── Sound Engine ─────────────────────────────────────────────
const SOUND_TYPES = [
  { id: 'ticking',    label: '🕐 Ticking (mặc định)', emoji: '🕐' },
  { id: 'click',      label: '🖱️ Click',              emoji: '🖱️' },
  { id: 'pop',        label: '🫧 Pop',                emoji: '🫧' },
  { id: 'bell',       label: '🔔 Bell',               emoji: '🔔' },
  { id: 'coin',       label: '🪙 Coin',               emoji: '🪙' },
  { id: 'laser',      label: '⚡ Laser',              emoji: '⚡' },
  { id: 'drum',       label: '🥁 Drum',               emoji: '🥁' },
  { id: 'piano',      label: '🎹 Piano',              emoji: '🎹' },
  { id: 'xylophone',  label: '🎵 Xylophone',          emoji: '🎵' },
  { id: 'bubble',     label: '💧 Bubble',             emoji: '💧' },
  { id: 'chirp',      label: '🐦 Chirp',              emoji: '🐦' },
  { id: 'woodblock',  label: '🪵 Woodblock',          emoji: '🪵' },
];

function playTick(ctx: any, type: any, volume = 0.5) {
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
      // Noise burst
      const bufSize = ctx.sampleRate * 0.03;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(volume * 0.6, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(nGain); nGain.connect(ctx.destination);
      noise.start(now); noise.stop(now + 0.05);
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

// ── Confetti ─────────────────────────────────────────────────
function Confetti({ active }: any) {
  if (!active) return null;
  const pieces = Array.from({ length: 50 }, (_, i) => ({
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

export default function WheelEditor({ items, onChange }: any) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');
  const [results, setResults] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<any>(null);
  const [centerImage, setCenterImage] = useState<any>(null);
  const [wheelConfig, setWheelConfig] = useState({
    spinDuration: 5,
    removeWinner: false,
    soundType: 'ticking',
    soundVolume: 0.5,
  });
  // Quiz state for MCQ mode
  const [quizState, setQuizState] = useState<any>(null); // { entry, options[], selected, correct }

  const wheelRef = useRef<any>(null);
  const rotationRef = useRef(0);
  const textareaRef = useRef<any>(null);
  const imageMenuRef = useRef<any>(null);
  const audioCtxRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);
  const lastSegRef = useRef(-1);

  // Derive valid entries (non-empty)
  const entries = items.filter((it: any) => (it.term || '').trim() !== '');

  // ── Sync textarea value from items ─────────────────────────
  const textValue = items.map((it: any) => it.term || '').join('\n');

  // ── Handle textarea change ─────────────────────────────────
  const handleTextChange = useCallback((e: any) => {
    const lines = (e.target as any).value.split('\n');
    const newItems = lines.map((line: any, idx: any) => ({
      term: line,
      definition: items[idx]?.definition || '',
      wrong1: items[idx]?.wrong1 || '',
      wrong2: items[idx]?.wrong2 || '',
      wrong3: items[idx]?.wrong3 || '',
      image_url: items[idx]?.image_url || null,
    }));
    if (newItems.length === 0) {
      newItems.push({ term: '', definition: '', wrong1: '', wrong2: '', wrong3: '', image_url: null });
    }
    onChange(newItems);
  }, [onChange, items]);

  // ── Shuffle ────────────────────────────────────────────────
  const shuffle = useCallback(() => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    onChange(arr);
  }, [items, onChange]);

  // ── Sort ───────────────────────────────────────────────────
  const sort = useCallback(() => {
    const arr = [...items].sort((a, b) =>
      (a.term || '').localeCompare(b.term || '')
    );
    onChange(arr);
  }, [items, onChange]);

  // ── Add image as entry ─────────────────────────────────────
  const handleAddImageAsEntry = useCallback((url: any) => {
    const newItems = [...items, { term: '🖼️ Ảnh', definition: '', wrong1: '', wrong2: '', wrong3: '', image_url: url }];
    onChange(newItems);
    setShowImageMenu(false);
  }, [items, onChange]);

  // ── Shuffle array helper ─────────────────────────────────────
  const shuffleArray = (arr: any) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ── Check if entry has MCQ data ─────────────────────────────
  const hasMCQ = (entry: any) => {
    return entry.definition && entry.wrong1 && entry.wrong2 && entry.wrong3;
  };

  // ── Init Audio Context lazily ──────────────────────────────
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      // @ts-ignore
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ── Spin the wheel ─────────────────────────────────────────
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

    const dur = wheelConfig.spinDuration;
    const startTime = performance.now();
    lastSegRef.current = -1;

    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${dur}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    // ── Sound tick loop using rAF ──────────────────────────
    const soundType = wheelConfig.soundType || 'ticking';
    const soundVol = wheelConfig.soundVolume ?? 0.5;

    const tickLoop = (now: any) => {
      const elapsed = (now - startTime) / 1000;
      const t = Math.min(elapsed / dur, 1);
      // Approximate same cubic-bezier as CSS
      const eased = 1 - Math.pow(1 - t, 3);
      const currentRot = startRot + deltaRot * eased;
      // Normalize to 0-360 and find which segment the pointer (at 0°/right) is on
      const normalized = ((currentRot % 360) + 360) % 360;
      const currentSeg = Math.floor(normalized / segAngle) % nSegs;

      if (currentSeg !== lastSegRef.current && lastSegRef.current !== -1) {
        playTick(ctx, soundType, soundVol);
      }
      lastSegRef.current = currentSeg;

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tickLoop);
      }
    };
    animFrameRef.current = requestAnimationFrame(tickLoop);

    setTimeout(() => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setSpinning(false);
      const won = entries[chosenIdx];
      setWinner(won);

      // If entry has MCQ data, show quiz instead of instant win
      if (hasMCQ(won)) {
        const options = shuffleArray([
          { text: won.definition, correct: true },
          { text: won.wrong1, correct: false },
          { text: won.wrong2, correct: false },
          { text: won.wrong3, correct: false },
        ]);
        setQuizState({ entry: won, options, selected: null, answered: false });
      } else {
        // No MCQ data — instant win like before
        setResults(prev => [won, ...prev]);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        if (wheelConfig.removeWinner) {
          const newItems = items.filter((_: any, idx: any) => {
            const validIdx = entries.indexOf(items[idx]);
            return validIdx !== chosenIdx;
          });
          if (newItems.length > 0) onChange(newItems);
        }
      }
    }, dur * 1000 + 100);
  }, [spinning, entries, items, onChange, wheelConfig, getAudioCtx]);

  // ── Handle quiz answer selection ────────────────────────────
  const handleQuizAnswer = useCallback((optionIdx: any) => {
    if (!quizState || quizState.answered) return;
    const option = quizState.options[optionIdx];
    // @ts-ignore
    setQuizState(prev => ({ ...prev, selected: optionIdx, answered: true }));

    if (option.correct) {
      setResults(prev => [quizState.entry, ...prev]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // Auto-close after delay
    setTimeout(() => {
      if (option.correct && wheelConfig.removeWinner) {
        const newItems = items.filter((it: any) => it !== quizState.entry);
        if (newItems.length > 0) onChange(newItems);
      }
      setWinner(null);
      setQuizState(null);
    }, 2500);
  }, [quizState, items, onChange, wheelConfig]);

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
          <text x={cx} y={cy - 12} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="18" fontWeight="700">🎡</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="12" fontWeight="600">Nhập mục bên phải</text>
          <circle cx={cx} cy={cy} r="30" fill="#263238" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
        </svg>
      );
    }

    if (entries.length === 1) {
      return (
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.wheelSvg}>
          <defs>
            <linearGradient id="singleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={getColor(0, 1)} />
              <stop offset="100%" stopColor={getNextColor(0, 1)} />
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill="url(#singleGrad)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fill={TEXT_COLOR} fontSize="28" fontWeight="800">{(entries[0].term||'').slice(0,20)}</text>
          {centerImage ? (
            <>
              <clipPath id="centerClip"><circle cx={cx} cy={cy} r="30"/></clipPath>
              <image href={centerImage} x={cx-30} y={cy-30} width="60" height="60" clipPath="url(#centerClip)" preserveAspectRatio="xMidYMid slice"/>
            </>
          ) : (
            <circle cx={cx} cy={cy} r="30" fill="white" stroke="rgba(0,0,0,0.08)" strokeWidth="2"/>
          )}
        </svg>
      );
    }

    const segAngle = 360 / entries.length;

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.wheelSvg}>
        <defs>
          <filter id="segShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.1"/>
          </filter>
          <clipPath id="wheelClip"><circle cx={cx} cy={cy} r={r}/></clipPath>
          <clipPath id="centerClipMain"><circle cx={cx} cy={cy} r="32"/></clipPath>

          {/* Generate a gradient for each segment: color[i] → color[i+1] */}
          {entries.map((_: any, i: any) => {
            const startDeg = i * segAngle - 90;
            const endDeg = (i + 1) * segAngle - 90;
            const midDeg = (startDeg + endDeg) / 2;
            // Gradient direction: from segment start edge toward end edge
            const startRad = startDeg * Math.PI / 180;
            const endRad = endDeg * Math.PI / 180;
            const gx1 = 50 + 50 * Math.cos(startRad);
            const gy1 = 50 + 50 * Math.sin(startRad);
            const gx2 = 50 + 50 * Math.cos(endRad);
            const gy2 = 50 + 50 * Math.sin(endRad);
            return (
              <linearGradient
                key={`grad${i}`}
                id={`segGrad${i}`}
                x1={`${gx1}%`} y1={`${gy1}%`}
                x2={`${gx2}%`} y2={`${gy2}%`}
              >
                <stop offset="0%" stopColor={getColor(i, entries.length)} />
                <stop offset="100%" stopColor={getNextColor(i, entries.length)} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Background image if set */}
        {backgroundImage && (
          <image
            href={backgroundImage}
            x={cx - r} y={cy - r}
            width={r * 2} height={r * 2}
            clipPath="url(#wheelClip)"
            preserveAspectRatio="xMidYMid slice"
            opacity="0.25"
          />
        )}

        {entries.map((item: any, i: any) => {
          const startDeg = i * segAngle - 90;
          const endDeg = (i + 1) * segAngle - 90;
          const startRad = startDeg * Math.PI / 180;
          const endRad = endDeg * Math.PI / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const largeArc = segAngle > 180 ? 1 : 0;

          const midDeg = (startDeg + endDeg) / 2;
          const midRad = midDeg * Math.PI / 180;

          // If entry has image, show image in segment
          const hasImage = item.image_url;
          const imgDist = r * 0.55;
          const imgX = cx + imgDist * Math.cos(midRad);
          const imgY = cy + imgDist * Math.sin(midRad);
          const imgSize = Math.min(segAngle * 1.2, 40);

          // Text position
          const textDist = hasImage ? r * 0.75 : r * 0.55;
          const tx = cx + textDist * Math.cos(midRad);
          const ty = cy + textDist * Math.sin(midRad);
          let textRot = midDeg + 90;

          // Dynamic font sizing
          let fontSize = 22;
          const textLen = (item.term || '').length;
          if (entries.length > 20) fontSize = 10;
          else if (entries.length > 14) fontSize = 12;
          else if (entries.length > 10) fontSize = 14;
          else if (entries.length > 6) fontSize = 17;
          else if (entries.length > 4) fontSize = 20;
          if (textLen > 12) fontSize = Math.max(fontSize - 3, 8);

          const maxChars = entries.length > 14 ? 8 : entries.length > 8 ? 12 : 18;
          const display = textLen > maxChars
            ? (item.term || '').slice(0, maxChars) + '…'
            : item.term;

          return (
            <g key={i}>
              <path
                d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                fill={`url(#segGrad${i})`}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
              />
              {/* Entry image */}
              {hasImage && (
                <>
                  <defs>
                    <clipPath id={`entryClip${i}`}>
                      <circle cx={imgX} cy={imgY} r={imgSize / 2}/>
                    </clipPath>
                  </defs>
                  <image
                    href={item.image_url}
                    x={imgX - imgSize / 2}
                    y={imgY - imgSize / 2}
                    width={imgSize}
                    height={imgSize}
                    clipPath={`url(#entryClip${i})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </>
              )}
              {/* Text */}
              <text
                x={tx} y={ty}
                transform={`rotate(${textRot}, ${tx}, ${ty})`}
                textAnchor="middle"
                dominantBaseline="middle"
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

        {/* Outer ring accent */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />

        {/* Center hub */}
        {centerImage ? (
          <image
            href={centerImage}
            x={cx - 32} y={cy - 32}
            width="64" height="64"
            clipPath="url(#centerClipMain)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <>
            <circle cx={cx} cy={cy} r="32" fill="white" />
            <circle cx={cx} cy={cy} r="28" fill="white" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="6" fill="#ccc" />
          </>
        )}
        <circle cx={cx} cy={cy} r="32" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
      </svg>
    );
  };

  const entryCount = entries.length;

  return (
    <div className={styles.layout}>
      <Confetti active={showConfetti} />

      {/* ══════════════════════════════════════════════════════════
           LEFT: WHEEL AREA (dominant)
         ══════════════════════════════════════════════════════════ */}
      <div className={styles.wheelArea}>
        {/* Background image layer */}
        {backgroundImage && (
          <div className={styles.bgImageLayer}>
            <img src={backgroundImage} alt="" className={styles.bgImage} />
            <button className={styles.bgRemoveBtn} onClick={() => setBackgroundImage(null)}>✕</button>
          </div>
        )}

        <div className={styles.wheelWrapper}>
          <div 
            className={styles.wheelBody} 
            ref={wheelRef}
            onClick={handleSpin}
            style={{ cursor: (spinning || entryCount < 2) ? 'default' : 'pointer' }}
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
          className={`${styles.spinBtn} ${(spinning || entryCount < 2) ? styles.spinDisabled : ''}`}
          onClick={handleSpin}
          disabled={spinning || entryCount < 2}
        >
          {spinning ? '⏳ Đang quay...' : '🎡 QUAY!'}
        </button>

        {/* Winner popup — simple mode (no MCQ) */}
        {winner && !spinning && !quizState && (
          <div className={styles.winnerOverlay} onClick={() => setWinner(null)}>
            <div className={styles.winnerCard} onClick={e => e.stopPropagation()}>
              <div className={styles.winnerEmoji}>🎉</div>
              {winner.image_url && (
                <img src={winner.image_url} alt="" className={styles.winnerImage} />
              )}
              <h2 className={styles.winnerName}>{winner.term}</h2>
              {winner.definition && <p className={styles.winnerDesc}>{winner.definition}</p>}
              <div className={styles.winnerActions}>
                <button className={styles.winnerOk} onClick={() => setWinner(null)}>OK</button>
                <button className={styles.winnerRemove} onClick={() => {
                  const newItems = items.filter((it: any) => it !== winner);
                  if (newItems.length > 0) onChange(newItems);
                  setWinner(null);
                }}>
                  Xóa khỏi vòng quay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quiz popup — MCQ mode */}
        {quizState && !spinning && (
          <div className={styles.winnerOverlay}>
            <div className={styles.quizCard} onClick={e => e.stopPropagation()}>
              <div className={styles.quizHeader}>
                <span className={styles.quizEmoji}>❓</span>
                {winner?.image_url && (
                  <img src={winner.image_url} alt="" className={styles.winnerImage} />
                )}
                <h2 className={styles.quizQuestion}>{winner?.term}</h2>
                <p className={styles.quizSubtitle}>Chọn đáp án đúng:</p>
              </div>
              <div className={styles.quizOptions}>
                {quizState.options.map((opt: any, idx: any) => {
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
                    <span className={styles.quizResultWrong}>❌ Sai rồi! Đáp án đúng: {quizState.options.find((o: any) => o.correct)?.text}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
           RIGHT: ENTRIES & RESULTS PANEL
         ══════════════════════════════════════════════════════════ */}
      <div className={styles.sidePanel}>
        {/* Collapse handle */}
        <div className={styles.collapseHandle}>
          <span className={styles.collapseIcon}>›</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'entries' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('entries')}
          >
            Entries <span className={styles.tabCount}>{entryCount}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'results' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('results')}
          >
            Results <span className={styles.tabCount}>{results.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ paddingLeft: '8px', paddingRight: '8px' }}
          >
            ⚙️ Cài đặt
          </button>
        </div>

        {/* ──── ENTRIES TAB ──── */}
        {activeTab === 'entries' && (
          <div className={styles.entriesTab}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <button className={styles.toolBtn} onClick={shuffle}>
                <span className={styles.toolIcon}>🔀</span> Shuffle
              </button>
              <button className={styles.toolBtn} onClick={sort}>
                <span className={styles.toolIcon}>↕️</span> Sort
              </button>

              {/* ── ADD IMAGE dropdown ── */}
              <div className={styles.imageDropdownWrap} ref={imageMenuRef}>
                <button
                  className={`${styles.toolBtn} ${styles.toolBtnImage}`}
                  onClick={() => setShowImageMenu(!showImageMenu)}
                >
                  <span className={styles.toolIcon}>🖼️</span> Add image
                  <span className={styles.dropdownArrow}>{showImageMenu ? '▴' : '▾'}</span>
                </button>

                {showImageMenu && (
                  <div className={styles.imageDropdown}>
                    {/* 1) Background image */}
                    <R2UploadWidget
                      onSuccess={(result) => {
                        // @ts-ignore
                        if (result.info?.secure_url) {
                          // @ts-ignore
                          setBackgroundImage(result.info.secure_url);
                          setShowImageMenu(false);
                        }
                      }}
                    >
                      {({ open, isUploading }) => (
                        <button className={styles.imageOption} onClick={() => open()} disabled={isUploading}>
                          <span className={styles.imageOptionIcon}>🌄</span>
                          <div className={styles.imageOptionText}>
                            <strong>{isUploading ? 'Đang tải...' : 'Add background image'}</strong>
                            <span>Ảnh nền phía sau vòng quay</span>
                          </div>
                        </button>
                      )}
                    </R2UploadWidget>

                    {/* 2) Center image */}
                    <R2UploadWidget
                      onSuccess={(result) => {
                        // @ts-ignore
                        if (result.info?.secure_url) {
                          // @ts-ignore
                          setCenterImage(result.info.secure_url);
                          setShowImageMenu(false);
                        }
                      }}
                    >
                      {({ open, isUploading }) => (
                        <button className={styles.imageOption} onClick={() => open()} disabled={isUploading}>
                          <span className={styles.imageOptionIcon}>🎯</span>
                          <div className={styles.imageOptionText}>
                            <strong>{isUploading ? 'Đang tải...' : 'Add center image'}</strong>
                            <span>Ảnh ở tâm vòng quay</span>
                          </div>
                        </button>
                      )}
                    </R2UploadWidget>

                    {/* 3) Image as entry */}
                    <R2UploadWidget
                      onSuccess={(result) => {
                        // @ts-ignore
                        if (result.info?.secure_url) {
                          // @ts-ignore
                          handleAddImageAsEntry(result.info.secure_url);
                        }
                      }}
                    >
                      {({ open, isUploading }) => (
                        <button className={styles.imageOption} onClick={() => open()} disabled={isUploading}>
                          <span className={styles.imageOptionIcon}>➕</span>
                          <div className={styles.imageOptionText}>
                            <strong>{isUploading ? 'Đang tải...' : 'Add image as entry'}</strong>
                            <span>Thêm ảnh làm mục mới</span>
                          </div>
                        </button>
                      )}
                    </R2UploadWidget>

                    {/* Divider + Remove actions */}
                    {(backgroundImage || centerImage) && (
                      <>
                        <div className={styles.imageDropdownDivider} />
                        {backgroundImage && (
                          <button className={styles.imageOptionRemove} onClick={() => { setBackgroundImage(null); setShowImageMenu(false); }}>
                            🗑️ Xóa ảnh nền
                          </button>
                        )}
                        {centerImage && (
                          <button className={styles.imageOptionRemove} onClick={() => { setCenterImage(null); setShowImageMenu(false); }}>
                            🗑️ Xóa ảnh tâm
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Advanced toggle */}
            <div style={{ margin: '4px 0' }}>
              <label className={styles.advancedToggle}>
                <input
                  type="checkbox"
                  checked={showAdvanced}
                  onChange={e => setShowAdvanced((e.target as any).checked)}
                  className={styles.advCheckbox}
                />
                <span>Advanced</span>
              </label>
            </div>

            {/* Advanced options */}
            {showAdvanced ? (
              <div className={styles.advList}>
                {items.map((item: any, idx: any) => (
                  <div key={idx} className={styles.advRow}>
                    <div className={styles.advRowTop}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className={styles.resultImg} />
                      ) : (
                        <span style={{width: '24px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)'}}>{idx + 1}</span>
                      )}
                      <input 
                        className={styles.advInput}
                        placeholder="Tên trên vòng quay (câu hỏi)"
                        value={item.term || ''}
                        onChange={e => {
                          const newItems = [...items];
                          newItems[idx] = { ...newItems[idx], term: (e.target as any).value };
                          onChange(newItems);
                        }}
                      />
                      <button 
                        className={styles.advRemoveBtn} 
                        onClick={() => {
                          const newItems = items.filter((_: any, i: any) => i !== idx);
                          onChange(newItems);
                        }}
                      >✕</button>
                    </div>
                    <input 
                      className={`${styles.advInput} ${styles.advInputCorrect}`}
                      placeholder="✅ Đáp án đúng"
                      value={item.definition || ''}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], definition: (e.target as any).value };
                        onChange(newItems);
                      }}
                    />
                    <input 
                      className={`${styles.advInput} ${styles.advInputWrong}`}
                      placeholder="❌ Đáp án sai 1"
                      value={item.wrong1 || ''}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], wrong1: (e.target as any).value };
                        onChange(newItems);
                      }}
                    />
                    <input 
                      className={`${styles.advInput} ${styles.advInputWrong}`}
                      placeholder="❌ Đáp án sai 2"
                      value={item.wrong2 || ''}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], wrong2: (e.target as any).value };
                        onChange(newItems);
                      }}
                    />
                    <input 
                      className={`${styles.advInput} ${styles.advInputWrong}`}
                      placeholder="❌ Đáp án sai 3"
                      value={item.wrong3 || ''}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], wrong3: (e.target as any).value };
                        onChange(newItems);
                      }}
                    />
                  </div>
                ))}
                <button 
                  className={styles.toolBtn} 
                  style={{ justifyContent: 'center', marginTop: '4px', background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => onChange([...items, { term: '', definition: '', wrong1: '', wrong2: '', wrong3: '', image_url: null }])}
                >
                  + Thêm mục
                </button>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className={styles.entriesTextarea}
                value={textValue}
                onChange={handleTextChange}
                placeholder="Nhập mỗi mục trên 1 dòng&#10;Ví dụ:&#10;Nguyễn Văn A&#10;Trần Thị B&#10;Lê Văn C&#10;..."
                spellCheck={false}
              />
            )}

            {/* Entry count info */}
            <div className={styles.entryInfo}>
              {entryCount} mục trên vòng quay
            </div>
          </div>
        )}

        {/* ──── RESULTS TAB ──── */}
        {activeTab === 'results' && (
          <div className={styles.resultsTab}>
            {results.length === 0 ? (
              <div className={styles.noResults}>
                <span className={styles.noResultsIcon}>🎯</span>
                <p>Quay vòng quay để xem kết quả ở đây</p>
              </div>
            ) : (
              <>
                <button className={styles.clearResultsBtn} onClick={() => setResults([])}>
                  🗑️ Xóa tất cả
                </button>
                <div className={styles.resultsList}>
                  {results.map((r, i) => (
                    <div key={i} className={styles.resultItem}>
                      <span className={styles.resultNum}>{results.length - i}</span>
                      {r.image_url && <img src={r.image_url} alt="" className={styles.resultImg} />}
                      <span className={styles.resultName}>{r.term}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ──── SETTINGS TAB ──── */}
        {activeTab === 'settings' && (
          <div className={styles.entriesTab} style={{ overflowY: 'auto' }}>
            <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '8px', paddingLeft: '4px' }}>Cấu hình trò chơi</h3>
            <div className={styles.advPanel}>
              <label className={styles.advOption}>
                <input
                  type="checkbox"
                  checked={wheelConfig.removeWinner}
                  onChange={e => setWheelConfig(prev => ({...prev, removeWinner: (e.target as any).checked}))}
                />
                <span>Xóa mục sau khi trúng</span>
              </label>
              <div className={styles.advOption}>
                <span>Thời gian quay:</span>
                <select
                  value={wheelConfig.spinDuration}
                  onChange={e => setWheelConfig(prev => ({...prev, spinDuration: Number((e.target as any).value)}))}
                  className={styles.advSelect}
                >
                  <option value={3}>3 giây</option>
                  <option value={5}>5 giây</option>
                  <option value={8}>8 giây</option>
                  <option value={10}>10 giây</option>
                </select>
              </div>
            </div>

            <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '16px', marginBottom: '8px', paddingLeft: '4px' }}>🔊 Âm thanh</h3>
            <div className={styles.advPanel}>
              <div className={styles.advOption}>
                <span>Kiểu âm thanh:</span>
                <select
                  value={wheelConfig.soundType}
                  onChange={e => {
                    setWheelConfig(prev => ({...prev, soundType: (e.target as any).value}));
                    // Preview the sound
                    try {
                      const ctx = getAudioCtx();
                      playTick(ctx, (e.target as any).value, wheelConfig.soundVolume ?? 0.5);
                    } catch (e: any) {}
                  }}
                  className={styles.advSelect}
                >
                  {SOUND_TYPES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.advOption}>
                <span>Âm lượng:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <input
                    type="range"
                    min="0" max="1" step="0.1"
                    value={wheelConfig.soundVolume ?? 0.5}
                    onChange={e => setWheelConfig(prev => ({...prev, soundVolume: Number((e.target as any).value)}))}
                    className={styles.volumeSlider}
                  />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', minWidth: '32px' }}>
                    {Math.round((wheelConfig.soundVolume ?? 0.5) * 100)}%
                  </span>
                </div>
              </div>
              <button
                className={styles.toolBtn}
                style={{ justifyContent: 'center', marginTop: '4px', background: 'rgba(255,255,255,0.05)' }}
                onClick={() => {
                  try {
                    const ctx = getAudioCtx();
                    playTick(ctx, wheelConfig.soundType || 'ticking', wheelConfig.soundVolume ?? 0.5);
                  } catch (e: any) {}
                }}
              >
                ▶ Nghe thử
              </button>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '12px', fontStyle: 'italic', paddingLeft: '4px' }}>
              Thiết lập cơ chế vòng quay. Các tùy chọn này sẽ lưu cùng với Minigame của bạn.
            </p>
          </div>
        )}
      </div>

      {/* Click-away to close dropdown */}
      {showImageMenu && (
        <div className={styles.clickAway} onClick={() => setShowImageMenu(false)} />
      )}
    </div>
  );
}
