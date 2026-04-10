import React, { useState } from 'react';
import styles from '@/games/openbox/OpenBoxPlayer.module.css';

const CustomGiftBox = ({ number, status, isActive }) => {
  return (
    <svg viewBox="0 0 120 120" className={styles.boxVector}>
      {/* Shadow */}
      <ellipse cx="60" cy="110" rx="40" ry="10" fill="rgba(0,0,0,0.3)" filter="blur(4px)" className={styles.boxShadow} />
      
      {/* Base of the box */}
      <g className={styles.boxBase}>
        <path d="M20 50 L100 50 L95 100 C95 105 85 110 60 110 C35 110 25 105 25 100 Z" fill="url(#boxBody)" />
        <path d="M20 50 L100 50 L95 100 C95 105 85 110 60 110 C35 110 25 105 25 100 Z" fill="url(#boxBodyInner)" />
        <rect x="52" y="50" width="16" height="60" fill="url(#ribbonBody)" />
      </g>
      
      {/* Lid and Bow (Animated during active) */}
      <g className={`${styles.boxLid} ${isActive ? styles.lidActive : ''}`}>
        <rect x="52" y="30" width="16" height="20" fill="url(#ribbonBody)" />
        <rect x="15" y="40" width="90" height="15" rx="3" fill="url(#boxLidGrad)" />
        <rect x="15" y="52" width="90" height="3" fill="rgba(0,0,0,0.2)" />
        
        {/* Bow Loops */}
        <path d="M60 35 C45 10 25 15 35 30 C40 38 55 35 60 35 Z" fill="url(#ribbonLoops)" />
        <path d="M60 35 C75 10 95 15 85 30 C80 38 65 35 60 35 Z" fill="url(#ribbonLoops)" />
        <circle cx="60" cy="35" r="6" fill="url(#ribbonKnot)" />
      </g>

      {/* Badges */}
      {status === 'locked' && !isActive && (
        <g transform="translate(60, 80)">
          <circle cx="0" cy="0" r="16" fill="rgba(255,255,255,0.95)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))" />
          <text x="0" y="6" fontFamily="var(--font-display)" fontSize="18" fontWeight="900" fill="#6c5ce7" textAnchor="middle">{number}</text>
        </g>
      )}

      {status === 'opened' && (
        <g transform="translate(60, 80)" className={styles.badgePop}>
          <circle cx="0" cy="0" r="20" fill="#2d3436" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))" />
          <path d="M-6 0 L-2 4 L8 -6" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      <defs>
        <linearGradient id="boxBody" x1="0" y1="50" x2="0" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6C5CE7"/>
          <stop offset="1" stopColor="#4834D4"/>
        </linearGradient>
        <radialGradient id="boxBodyInner" cx="40" cy="65" r="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.25)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        
        <linearGradient id="boxLidGrad" x1="15" y1="30" x2="15" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A29BFE"/>
          <stop offset="1" stopColor="#6C5CE7"/>
        </linearGradient>
        
        <linearGradient id="ribbonBody" x1="0" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDCB6E"/>
          <stop offset="0.5" stopColor="#FFEAA7"/>
          <stop offset="1" stopColor="#E17055"/>
        </linearGradient>

        <linearGradient id="ribbonLoops" x1="30" y1="10" x2="90" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFEAA7"/>
          <stop offset="1" stopColor="#E17055"/>
        </linearGradient>

        <radialGradient id="ribbonKnot" cx="58" cy="26" r="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFEAA7" />
          <stop offset="1" stopColor="#E17055" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default function MultiplayerOpenBoxGrid({ items, mp }) {
  const isHost = mp.isHost;
  const openedBoxes = mp.roomSettings?.openedBoxes || [];
  const [activeBoxIndex, setActiveBoxIndex] = useState(null);

  const cols = items.length <= 4 ? 2 : items.length <= 9 ? 3 : items.length <= 16 ? 4 : 5;

  const spawnBoxParticles = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = styles.boxParticle;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        const vx = (Math.random() - 0.5) * 150;
        const vy = (Math.random() - 1) * 150;
        p.style.setProperty('--vx', `${vx}px`);
        p.style.setProperty('--vy', `${vy}px`);
        p.style.background = `hsl(${Math.random() * 60 + 40}, 100%, 70%)`; // yellow/gold
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
  };

  const handleBoxClick = (e, idx) => {
    if (!isHost) return;
    if (openedBoxes.includes(idx)) return;
    if (activeBoxIndex !== null) return;

    spawnBoxParticles(e);
    setActiveBoxIndex(idx);

    // Give it a tiny bit of animation time before asking all players to go to that question
    setTimeout(() => {
      mp.hostNextQuestion(idx);
    }, 500);
  };

  return (
    <div className={styles.pageWrap} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className={styles.bgTheme} />
      
      {!isHost && (
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.6)', padding: '12px 24px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 800, fontSize: 20 }}>
            👀 Chọn Đáp Án Trên Màn Hình Của Giáo Viên!
          </div>
        </div>
      )}

      {isHost && (
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)', padding: '12px 24px', borderRadius: 20, boxShadow: '0 8px 24px rgba(108,92,231,0.5)', color: 'white', fontWeight: 800, fontSize: 20 }}>
            👇 Mời Thầy Cô Click Chọn Hộp!
          </div>
        </div>
      )}

      {/* BOX GRID */}
      <main className={styles.gridContainer} style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className={styles.boxGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {items.map((_, i) => {
            const isOpened = openedBoxes.includes(i);
            const state = isOpened ? 'opened' : 'locked';

            let bClass = styles.box;
            if (activeBoxIndex === i) bClass += ` ${styles.boxActive}`;
            if (isOpened) bClass += ` ${styles.boxOpened}`;

            return (
              <button 
                key={i} 
                className={bClass} 
                onClick={(e) => handleBoxClick(e, i)}
                disabled={state !== 'locked' || activeBoxIndex !== null || !isHost}
                style={{ '--delay': `${i * 0.05}s` }}
              >
                <div className={styles.boxGlow} />
                <div className={styles.boxVectorWrap}>
                  <CustomGiftBox number={i + 1} status={state} isActive={activeBoxIndex === i} />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
