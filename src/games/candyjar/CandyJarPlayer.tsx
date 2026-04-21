'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CandyJarPlayer.module.css';
import { getSoundManager } from '@/lib/sounds';
import { GameEvent } from '@/lib/gameEvents'; // Just using SoundManager directly is fine
import { useRouter } from 'next/navigation';

interface JarData {
  id: string;
  name: string;
  count: number;
}

interface CandyPhysics {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  targetY: number;
  targetX: number;
  jarIndex: number;
  isSettled: boolean;
  settledPos: { x: number, y: number } | null;
}

const CANDY_COLORS = [
  '#ff4757', '#ff6b81', '#ff7f50', '#ffa502', '#eccc68', 
  '#7bed9f', '#2ed573', '#1e90ff', '#70a1ff', '#5352ed', 
  '#9b59b6', '#D980FA'
];

export default function CandyJarPlayer() {
  const router = useRouter();
  
  // Setup State
  const [isSetup, setIsSetup] = useState(false);
  const [namesInput, setNamesInput] = useState('');
  const [maxSetting, setMaxSetting] = useState<number>(30);
  
  // Game State
  const [jars, setJars] = useState<JarData[]>([]);
  const [poppedBadge, setPoppedBadge] = useState<number | null>(null);
  
  // Physics State (Refs for performance)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const candiesRef = useRef<CandyPhysics[]>([]);
  const animationRef = useRef<number>(0);
  const candyIdSeq = useRef(0);
  
  const soundRef = useRef<any>(null);

  useEffect(() => {
    soundRef.current = getSoundManager();
    // Start ambient music
    soundRef.current?.startMusic('fun');
    return () => {
      soundRef.current?.stopMusic(true);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // --- PHYSICS ENGINE --- //
  useEffect(() => {
    if (!isSetup) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Setup high-DPI canvas
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
      }
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1); // cap dt
      lastTime = time;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = window.devicePixelRatio;
      
      const candies = candiesRef.current;
      const gravity = 2500 * dpr; // pixels per second squared
      const bounce = 0.4;
      
      for (let i = 0; i < candies.length; i++) {
        const c = candies[i];
        
        if (!c.isSettled) {
          // Apply physics
          c.vy += gravity * dt;
          c.y += c.vy * dt;
          
          // Funnel the candy perfectly into its honeycomb target X
          const targetX = c.targetX * dpr;
          const dx = targetX - c.x;
          c.x += dx * 8 * dt; // interpolate towards target

          const targetY = c.targetY * dpr;
          
          // Collision with bottom
          if (c.y + c.radius * dpr >= targetY) {
            c.y = targetY - c.radius * dpr;
            c.vy = -c.vy * bounce;
            
            // If velocity is small enough, mark as settled
            if (Math.abs(c.vy) < 50 * dpr) {
              c.isSettled = true;
              c.settledPos = { x: targetX, y: targetY };
            }
          }
        } else if (c.settledPos) {
           // Keep at settled pos (responsive to resize? simple enough to just trace back to targetY if targetY changed, but we won't overcomplicate)
           c.x = c.settledPos.x;
           c.y = c.settledPos.y;
        }

        // Draw Candy
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius * dpr, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        
        // Inner highlight (3D shine)
        ctx.beginPath();
        ctx.arc(c.x - c.radius*dpr*0.3, c.y - c.radius*dpr*0.3, c.radius*dpr*0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();

        // White Border
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isSetup]);


  const handleStart = () => {
    const rawNames = namesInput.split(/\r?\n|,/).map(n => n.trim()).filter(Boolean);
    if (rawNames.length === 0) {
      alert("Vui lòng nhập ít nhất 1 tên học sinh!");
      return;
    }
    
    // Remove duplicates or just use them
    const uniqueNames = Array.from(new Set(rawNames)); // optional
    const newJars: JarData[] = uniqueNames.map((name, i) => ({
      id: `jar_${i}`,
      name,
      count: 0
    }));
    
    setJars(newJars);
    candiesRef.current = [];
    setIsSetup(true);
  };

  const handleDropCandy = (jarIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    // Sound!
    soundRef.current?.boxOpen();
    soundRef.current?.click();
    
    // Find Jar DOM
    const jarDiv = e.currentTarget;
    const rect = jarDiv.getBoundingClientRect();
    
    const jarWidth = rect.width;
    const jarHeight = rect.height;
    
    // Candy Size based on Max Settings
    // 20 candies = larger radius. 40 candies = smaller radius.
    // Glass height is ~160px. We want maxCandies to fill about 70% of it.
    // Very rough math: Area = maxCandies * PI * r^2.
    // Let's just pick fixed reasonable radii:
    const radius = maxSetting <= 20 ? 14 : (maxSetting <= 30 ? 11 : 9);
    
    const currentCandyCount = jars[jarIndex].count;
    
    // Fix React 18 Strict Mode double invoke by NOT mutating the existing item
    setJars(prev => {
      const next = [...prev];
      next[jarIndex] = { ...next[jarIndex], count: next[jarIndex].count + 1 };
      return next;
    });

    // Badge Animation trigger
    setPoppedBadge(jarIndex);
    setTimeout(() => setPoppedBadge(null), 300);

    // Fix offset for Navbar/Sidebar by subtracting Canvas rect
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const cTop = canvasRect ? canvasRect.top : 0;
    const cLeft = canvasRect ? canvasRect.left : 0;

    // Spawn Physics Candy
    // Honeycomb stacking: Calculate exact target X and Y based on index
    const INNER_PADDING = 16; // 8px on each side of the glass
    const usableWidth = jarWidth - INNER_PADDING;
    const itemsPerRow = Math.max(1, Math.floor(usableWidth / (radius * 2.2)));
    
    const row = Math.floor(currentCandyCount / itemsPerRow);
    const col = currentCandyCount % itemsPerRow;
    
    const isOddRow = row % 2 === 1;
    const rowOffset = isOddRow ? radius : 0;
    
    // Center the whole block of items if there's extra space
    const blockWidth = itemsPerRow * (radius * 2.2) + (isOddRow ? radius : 0);
    const startX = (rect.left - cLeft) + (jarWidth - blockWidth) / 2 + radius;
    
    const targetXCanvas = startX + col * (radius * 2.2) + rowOffset;
    
    const bottomThickness = 16; // thickness of jar bottom
    // Multiply by 1.8 instead of 2.0 to make them interlock vertically
    const stackHeight = row * (radius * 1.8);
    const targetYCanvas = (rect.bottom - cTop) - bottomThickness - stackHeight;
    
    // Spawn X anywhere in the wide mouth, but Y way above
    const dropX = (rect.left - cLeft) + jarWidth / 2 + (Math.random() - 0.5) * (jarWidth * 0.8);
    
    const newCandy: CandyPhysics = {
      id: candyIdSeq.current++,
      x: dropX * window.devicePixelRatio,
      y: -50 * window.devicePixelRatio, // spawn above screen
      vx: (Math.random() - 0.5) * 100, // slight initial horizontal kick
      vy: 0,
      radius,
      color: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
      targetY: targetYCanvas,
      targetX: targetXCanvas, // Add new state property
      jarIndex,
      isSettled: false,
      settledPos: null
    };
    
    candiesRef.current.push(newCandy);
  };

  // --- SETUP RENDER --- //
  if (!isSetup) {
    return (
      <div className={styles.container}>
        <div className={styles.setupOverlay}>
          <div className={styles.setupCard}>
            <h2 className={styles.setupTitle}>🍭 Thiết Lập Lọ Kẹo</h2>
            <p className={styles.setupSubtitle}>Công cụ điểm danh & phát phần thưởng siêu tốc</p>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Danh sách học sinh (Mỗi dòng một tên):</label>
              <textarea 
                className={styles.textarea}
                placeholder={"Nguyen Van A\nLe Thi B\nTran Van C"}
                value={namesInput}
                onChange={e => setNamesInput(e.target.value)}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sức chứa tối đa (để căn kích thước kẹo):</label>
              <div className={styles.radioGroup}>
                {[20, 30, 40].map(val => (
                  <label key={val} className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="max" 
                      value={val} 
                      checked={maxSetting === val}
                      onChange={() => setMaxSetting(val)}
                    />
                    {val} kẹo
                  </label>
                ))}
              </div>
            </div>
            
            <button className={styles.startBtn} onClick={handleStart}>Hiển Thị Lọ Kẹo</button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline' }}>Thoát</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME RENDER --- //
  return (
    <div className={styles.container}>
      {/* Canvas Layer for falling candies */}
      <canvas ref={canvasRef} className={styles.canvasOverlay} />

      <div className={styles.header}>
        <button className={styles.resetBtn} onClick={() => {
          candiesRef.current = [];
          setJars(jars.map(j => ({ ...j, count: 0 })));
        }}>
          🔄 Làm Lại
        </button>
        <button className={styles.resetBtn} style={{ marginLeft: 16 }} onClick={() => setIsSetup(false)}>
          ⚙️ Cài Đặt
        </button>
      </div>
      
      <div className={styles.grid}>
        {jars.map((jar, i) => (
          <div key={jar.id} className={styles.jarContainer}>
             {/* The visually clickable block */}
             <div className={styles.jarGlass} onClick={(e) => handleDropCandy(i, e)}>
                {/* Point Badge */}
                {jar.count > 0 && (
                  <div className={`${styles.candyCountBadge} ${poppedBadge === i ? styles.pop : ''}`}>
                    {jar.count}
                  </div>
                )}
             </div>
             {/* Name Tag */}
             <div className={styles.jarLabel} title={jar.name}>
               {jar.name}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
