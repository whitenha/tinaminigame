'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import styles from './SakuraPetals.module.css';

/* ═══════════════════════════════════════════════════════════════
 * ASSET POOLS — organized by depth role (adjusted per user feedback)
 * Background: small hoa2 petals (distant, subtle)
 * Mid: classic flat hoa1 petals (hero layer)
 * Foreground: 4 strongest dramatic/curled petals only
 * ═══════════════════════════════════════════════════════════════ */
const POOL_BG = [
  'hoa2_4', 'hoa2_6', 'hoa2_7', 'hoa2_8', 'hoa2_9', 'hoa2_10', 'hoa2_12',
];

const POOL_MID = [
  'hoa1_1', 'hoa1_2', 'hoa1_3', 'hoa1_5', 'hoa1_8', 'hoa1_10', 'hoa1_11', 'hoa1_12',
];

const POOL_FG = [
  'hoa1_7', 'hoa1_9', 'hoa2_1', 'hoa2_2',
];

/* ── Layer configs ───────────────────────────────────────────── */
const LAYER_CONFIG = {
  bg: {
    pool: POOL_BG,
    count: { desktop: 8, tablet: 5, mobile: 3 },
    sizeRange: [18, 28],      // px
    opacityRange: [0.15, 0.25],
    fallDurRange: [20, 30],   // seconds
    driftAmpRange: [30, 60],  // px
    driftPeriodRange: [6, 10],
    spinRange: [45, 90],      // degrees (±)
    scaleRange: [0.7, 1.0],
    delayRange: [0, 8],
    blurChance: 0.3,          // only 30% get blur (user feedback #2)
    xSpawnRange: [0, 100],    // % of viewport width
  },
  mid: {
    pool: POOL_MID,
    count: { desktop: 6, tablet: 4, mobile: 2 },
    sizeRange: [30, 50],
    opacityRange: [0.35, 0.55],
    fallDurRange: [14, 22],
    driftAmpRange: [50, 100],
    driftPeriodRange: [4, 7],
    spinRange: [90, 180],
    scaleRange: [0.85, 1.15],
    delayRange: [0, 6],
    blurChance: 0,
    xSpawnRange: [5, 95],
  },
  fg: {
    pool: POOL_FG,
    count: { desktop: 2, tablet: 0, mobile: 0 }, // user feedback #1: 2 on desktop
    sizeRange: [45, 65],
    opacityRange: [0.5, 0.65],
    fallDurRange: [10, 16],
    driftAmpRange: [70, 120],
    driftPeriodRange: [3, 5],
    spinRange: [120, 180],
    scaleRange: [0.9, 1.15],
    delayRange: [0, 10],
    blurChance: 0,
    xSpawnRange: [0, 15], // foreground only at edges (will also mirror to 85-100%)
  },
};

/* ── Stable seeded random ────────────────────────────────────── */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randomInRange(rng, min, max) {
  return min + rng() * (max - min);
}

function pickFromPool(rng, pool) {
  return pool[Math.floor(rng() * pool.length)];
}

/* ── Responsive breakpoint detection ─────────────────────────── */
function useBreakpoint() {
  const [bp, setBp] = useState('desktop');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 768) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else setBp('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return bp;
}

/* ── Generate stable petal configs ───────────────────────────── */
function generatePetals(layerKey, count, seed) {
  const cfg = LAYER_CONFIG[layerKey];
  const rng = seededRandom(seed);
  const petals = [];

  for (let i = 0; i < count; i++) {
    const assetName = pickFromPool(rng, cfg.pool);
    const size = Math.round(randomInRange(rng, cfg.sizeRange[0], cfg.sizeRange[1]));
    const opacity = +randomInRange(rng, cfg.opacityRange[0], cfg.opacityRange[1]).toFixed(2);
    const fallDur = +randomInRange(rng, cfg.fallDurRange[0], cfg.fallDurRange[1]).toFixed(1);
    const driftAmp = Math.round(randomInRange(rng, cfg.driftAmpRange[0], cfg.driftAmpRange[1]));
    const driftPeriod = +randomInRange(rng, cfg.driftPeriodRange[0], cfg.driftPeriodRange[1]).toFixed(1);
    const spinDur = +randomInRange(rng, cfg.fallDurRange[0], cfg.fallDurRange[1]).toFixed(1);
    const spinRange = Math.round(randomInRange(rng, cfg.spinRange[0], cfg.spinRange[1]));
    const spinDir = rng() > 0.5 ? 1 : -1;
    const scale = +randomInRange(rng, cfg.scaleRange[0], cfg.scaleRange[1]).toFixed(2);
    const delay = +randomInRange(rng, cfg.delayRange[0], cfg.delayRange[1]).toFixed(1);
    const hasBlur = rng() < cfg.blurChance;

    // X position: for foreground, randomly choose left edge (0-15%) or right edge (85-100%)
    let xPos;
    if (layerKey === 'fg') {
      if (rng() > 0.5) {
        xPos = randomInRange(rng, 0, 15);
      } else {
        xPos = randomInRange(rng, 85, 100);
      }
    } else {
      xPos = randomInRange(rng, cfg.xSpawnRange[0], cfg.xSpawnRange[1]);
    }

    petals.push({
      id: `${layerKey}-${i}`,
      src: `/petals/optimized/${assetName}.webp`,
      size,
      opacity,
      fallDur,
      driftAmp,
      driftPeriod,
      spinDur,
      spinRange: spinRange * spinDir,
      scale,
      delay,
      hasBlur,
      xPos: +xPos.toFixed(1),
    });
  }
  return petals;
}

/* ═══════════════════════════════════════════════════════════════
 * COMPONENT: SakuraPetals
 * ═══════════════════════════════════════════════════════════════ */
export default function SakuraPetals({
  isSettingsOpen = false,
  isSidebarMode = false,
  playerCount = 0,
  enableScatter = false, // user feedback #4: optional game-start scatter
}) {
  const breakpoint = useBreakpoint();
  const prevCountRef = useRef(playerCount);
  const [bursts, setBursts] = useState([]);
  const burstIdRef = useRef(0);

  /* ── Stable petal configs (user feedback #5: stable per mount) ── */
  const bgPetals = useMemo(
    () => generatePetals('bg', LAYER_CONFIG.bg.count[breakpoint], 42),
    [breakpoint]
  );
  const midPetals = useMemo(
    () => generatePetals('mid', LAYER_CONFIG.mid.count[breakpoint], 137),
    [breakpoint]
  );
  const fgPetals = useMemo(
    () => generatePetals('fg', LAYER_CONFIG.fg.count[breakpoint], 256),
    [breakpoint]
  );

  /* ── Player join burst (user feedback #3: compare actual prev) ── */
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = playerCount;

    // Only trigger on genuine player count increase (not initial render or rerender)
    if (prev === 0 && playerCount > 0) return; // skip initial population
    if (playerCount <= prev) return; // skip decreases or no-change

    // Spawn 2–3 burst petals
    const burstCount = 2 + Math.floor(Math.random() * 2);
    const newBursts = [];
    for (let i = 0; i < burstCount; i++) {
      newBursts.push({
        id: `burst-${++burstIdRef.current}`,
        src: `/petals/optimized/${POOL_MID[Math.floor(Math.random() * POOL_MID.length)]}.webp`,
        size: 30 + Math.random() * 15,
        xPos: 10 + Math.random() * 80,
        driftAmp: 40 + Math.random() * 60,
        dur: 5 + Math.random() * 3,
      });
    }

    setBursts(prev => [...prev, ...newBursts]);

    // Clean up burst petals after their animation completes
    const maxDur = Math.max(...newBursts.map(b => b.dur)) * 1000 + 500;
    const timer = setTimeout(() => {
      const ids = new Set(newBursts.map(b => b.id));
      setBursts(prev => prev.filter(b => !ids.has(b.id)));
    }, maxDur);

    return () => clearTimeout(timer);
  }, [playerCount]);

  /* ── Visibility API: pause when tab hidden ─────────────────── */
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const handler = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  /* ── Determine pause state ─────────────────────────────────── */
  const isPaused = !isVisible || (isSettingsOpen && !isSidebarMode);

  /* ── Determine clip state (desktop sidebar) ────────────────── */
  const isClipped = isSettingsOpen && isSidebarMode;

  /* ── Render helper ─────────────────────────────────────────── */
  const renderPetal = (petal) => (
    <div
      key={petal.id}
      className={`${styles.petal} ${petal.hasBlur ? styles.petalBlurred : ''}`}
      style={{
        left: `${petal.xPos}%`,
        '--fall-dur': `${petal.fallDur}s`,
        '--fall-delay': `${petal.delay}s`,
        '--drift-amp': `${petal.driftAmp}px`,
        '--drift-period': `${petal.driftPeriod}s`,
        '--spin-dur': `${petal.spinDur}s`,
        '--spin-range': `${petal.spinRange}deg`,
        '--petal-size': `${petal.size}px`,
        '--petal-opacity': petal.opacity,
        '--petal-scale': petal.scale,
      }}
    >
      <div className={styles.petalInner}>
        <img
          src={petal.src}
          alt=""
          width={petal.size}
          height={petal.size}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );

  const renderBurst = (burst) => (
    <div
      key={burst.id}
      className={styles.burstPetal}
      style={{
        left: `${burst.xPos}%`,
        top: '-5%',
        '--petal-size': `${burst.size}px`,
        '--drift-amp': `${burst.driftAmp}px`,
        '--burst-dur': `${burst.dur}s`,
      }}
    >
      <img src={burst.src} alt="" width={burst.size} height={burst.size} />
    </div>
  );

  return (
    <>
      {/* Background Layer */}
      <div
        className={`${styles.layerBg} ${isPaused ? styles.paused : ''} ${isClipped ? styles.layerClipped : ''}`}
        aria-hidden="true"
      >
        {bgPetals.map(renderPetal)}
      </div>

      {/* Mid Layer */}
      <div
        className={`${styles.layerMid} ${isPaused ? styles.paused : ''} ${isClipped ? styles.layerClipped : ''}`}
        aria-hidden="true"
      >
        {midPetals.map(renderPetal)}
        {bursts.map(renderBurst)}
      </div>

      {/* Foreground Layer */}
      <div
        className={`${styles.layerFg} ${isPaused ? styles.paused : ''} ${isClipped ? styles.layerClipped : ''}`}
        aria-hidden="true"
      >
        {fgPetals.map(renderPetal)}
      </div>

      {/* Reduced-motion static fallback */}
      <div className={styles.staticFallback} aria-hidden="true">
        {[POOL_MID[0], POOL_MID[3], POOL_BG[1], POOL_BG[4]].map((name, i) => (
          <div
            key={`static-${i}`}
            className={styles.staticPetal}
            style={{
              left: `${15 + i * 22}%`,
              top: `${20 + i * 18}%`,
              '--petal-size': `${22 + i * 6}px`,
              '--petal-opacity': 0.15 + i * 0.03,
              transform: `rotate(${i * 45 + 15}deg)`,
            }}
          >
            <img
              src={`/petals/optimized/${name}.webp`}
              alt=""
              width={22 + i * 6}
              height={22 + i * 6}
            />
          </div>
        ))}
      </div>
    </>
  );
}
