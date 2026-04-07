'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelectionEngine } from '@/lib/engines/useSelectionEngine';
import { CountdownScreen, GameTopBar, ResultScreen, ConfettiOverlay } from '@/components/GameShell';
import styles from './OpenBoxPlayer.module.css';

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

      {status === 'correct' && (
        <g transform="translate(60, 80)" className={styles.badgePop}>
          <circle cx="0" cy="0" r="20" fill="#00b894" filter="drop-shadow(0 4px 8px rgba(0,184,148,0.5))" />
          <path d="M-6 0 L-2 4 L8 -6" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {status === 'wrong' && (
        <g transform="translate(60, 80)" className={styles.badgePop}>
          <circle cx="0" cy="0" r="20" fill="#ff7675" filter="drop-shadow(0 4px 8px rgba(255,118,117,0.5))" />
          <path d="M-6 -6 L6 6 M6 -6 L-6 6" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
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

export default function OpenBoxPlayer({ items, activity, playerName }) {
  const engine = useSelectionEngine(items, {
    musicType: 'fun',
    scoringPolicy: 'time-speed',
    defaultTimeLimit: 20,
    feedbackDelay: 1800,
    enableTTS: activity?.settings?.read_question || false,
    autoAdvance: true,
  });

  const [activeBoxIndex, setActiveBoxIndex] = useState(null);
  const [boxStates, setBoxStates] = useState(items.map(() => 'locked')); // 'locked', 'correct', 'wrong'
  const answersLengthRef = useRef(0);

  // 1. Initial pause: when countdown ends, pause timer by setting phase to 'grid'
  useEffect(() => {
    if (engine.phase === 'playing' && activeBoxIndex === null) {
      engine.setPhase('grid');
    }
  }, [engine.phase, activeBoxIndex, engine]);

  // 2. Capture answer feedback to update box state
  useEffect(() => {
    if (engine.answers.length > answersLengthRef.current) {
      const lastAns = engine.answers[engine.answers.length - 1];
      setBoxStates(prev => {
        const next = [...prev];
        if (activeBoxIndex !== null) {
          next[activeBoxIndex] = lastAns.correct ? 'correct' : 'wrong';
        }
        return next;
      });
      answersLengthRef.current = engine.answers.length;
    }
  }, [engine.answers, activeBoxIndex]);

  // 3. Auto-advance completes -> return to grid
  const wasFeedbackRef = useRef(false);
  useEffect(() => {
    if (engine.showFeedback) {
      wasFeedbackRef.current = true;
    } else if (wasFeedbackRef.current) {
      setActiveBoxIndex(null);
      wasFeedbackRef.current = false;
      if (engine.phase === 'playing') {
        engine.setPhase('grid');
      }
    }
  }, [engine.showFeedback, engine.phase, engine]);

  // ── Particles for Box Open ──────────────────────────────────────
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
  }

  // ── RENDER DELEGATION ───────────────────────────────────────────

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label="Mở Hộp Bí Ẩn" emoji="🎁" />;
  }

  if (engine.phase === 'result') {
    return (
      <div className={styles.pageWrap}>
         <div className={styles.bgTheme} />
         <ResultScreen
           playerName={playerName}
           score={engine.score}
           answers={engine.answers}
           items={items}
           title="Hoàn Thành!"
         />
      </div>
    );
  }

  const cols = items.length <= 4 ? 2 : items.length <= 9 ? 3 : items.length <= 16 ? 4 : 5;

  const handleBoxClick = (e, idx) => {
    if (boxStates[idx] !== 'locked') return;
    spawnBoxParticles(e);
    engine.emit(engine.GameEvent.BOX_OPEN);
    setActiveBoxIndex(idx);
    engine.setPhase('playing');
    engine.shuffleOptionsForQuestion(engine.currentQ); 
  };

  const item = engine.currentItem;

  return (
    <div className={styles.pageWrap}>
      <div className={styles.bgTheme} />
      
      <GameTopBar
        counter={`${engine.answers.length}/${engine.totalQ}`} 
        playerName={playerName}
        score={engine.score}
        streak={engine.streak}
      />

      {/* BOX GRID */}
      <main className={styles.gridContainer}>
        <div className={styles.boxGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {items.map((_, i) => {
            const state = boxStates[i];
            let bClass = styles.box;
            if (activeBoxIndex === i) bClass += ` ${styles.boxActive}`;
            if (state === 'correct') bClass += ` ${styles.boxCorrect}`;
            if (state === 'wrong') bClass += ` ${styles.boxWrong}`;

            return (
              <button 
                key={i} 
                className={bClass} 
                onClick={(e) => handleBoxClick(e, i)}
                disabled={state !== 'locked' || activeBoxIndex !== null}
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

      {/* QUESTION MODAL */}
      {activeBoxIndex !== null && item && (
        <div className={`${styles.modalOverlay} ${engine.showFeedback ? styles.modalOverlayFeedback : ''}`}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <div className={styles.timerRing}>
                 <svg viewBox="0 0 36 36" className={styles.circularChart}>
                   <path className={styles.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                   <path className={styles.circleLine} strokeDasharray={`${engine.timerPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                         style={{ stroke: engine.isTimerDanger ? '#ff7675' : '#55efc4' }} />
                 </svg>
                 <span className={`${styles.timerText} ${engine.isTimerDanger ? styles.timerTextDanger : ''}`}>{engine.timeLeft}</span>
              </div>
              <h2 className={styles.questionText}>{item.question || item.term}</h2>
            </div>
            
            {item.image_url && (
                <div className={styles.questionImgWrap}>
                    <img src={item.image_url} alt="" className={styles.questionImg} />
                </div>
            )}

            <div className={styles.optionsGrid}>
              {engine.shuffledOptions.map((opt, i) => {
                const isSelected = engine.selectedAnswer === opt.originalIndex;
                const isCorrect = opt.originalIndex === 0;
                let optClass = styles.optionBtn;

                if (engine.showFeedback) {
                  if (isCorrect) optClass += ` ${styles.optCorrect}`;
                  else if (isSelected && !isCorrect) optClass += ` ${styles.optWrong}`;
                  else optClass += ` ${styles.optDimmed}`;
                }

                const labels = ['A', 'B', 'C', 'D'];
                const colors = [styles.optColorA, styles.optColorB, styles.optColorC, styles.optColorD];

                return (
                  <button
                    key={i}
                    className={`${optClass} ${!engine.showFeedback ? colors[i] : ''}`}
                    onClick={() => {
                       engine.emit(engine.GameEvent.CLICK);
                       engine.submitAnswer(opt.originalIndex);
                    }}
                    disabled={engine.showFeedback}
                  >
                    <span className={styles.optLabel}>{labels[i]}</span>
                    <span className={styles.optText}>{opt.text}</span>
                    {engine.showFeedback && isCorrect && <span className={styles.feedbackIcon}>✓</span>}
                    {engine.showFeedback && isSelected && !isCorrect && <span className={styles.feedbackIcon}>✗</span>}
                  </button>
                )
              })}
            </div>
          </div>
          
          {engine.showFeedback && engine.selectedAnswer === 0 && (
             <ConfettiOverlay active={true} />
          )}
        </div>
      )}
    </div>
  );
}
