'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CountdownScreen, GameTopBar, TimerBar, ResultScreen } from '@/components/GameShell';
import { useGameEvents } from '@/lib/engines/useGameEvents';
import styles from './WhackAMolePlayer.module.css';

// ── CUSTOM SLIDE ENGINE FOR WHACK-A-MOLE ──────────────
function useWhackSlideEngine({ item, timePerSlide, heartsConfig, onSlideComplete, isFirstSlide, onGameStart }) {
  const { emit, GameEvent } = useGameEvents('none');

  const [phase, setPhase] = useState('countdown'); // countdown -> playing
  const [countdownNum, setCountdownNum] = useState(isFirstSlide ? 6 : 3);
  
  const [timeLeft, setTimeLeft] = useState(timePerSlide);
  const [hearts, setHearts] = useState(heartsConfig);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  
  const [entities, setEntities] = useState([]);
  const [tappedEntities, setTappedEntities] = useState(new Set());
  const [showHitEffect, setShowHitEffect] = useState(null);

  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const entityIdCounter = useRef(0);
  
  const stateRef = useRef({ phase, timeLeft, hearts, combo, score, hits, misses });
  stateRef.current = { phase, timeLeft, hearts, combo, score, hits, misses };

  // 1. Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      emit(GameEvent.GAME_START);
      if (onGameStart) onGameStart();
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum === 1) emit(GameEvent.COUNTDOWN_GO);
      else emit(GameEvent.COUNTDOWN_TICK);
      setCountdownNum(c => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum, emit, GameEvent, onGameStart]);

  // 2. Play Timer & Hearts Checker
  useEffect(() => {
    if (phase !== 'playing') return;

    // Check hearts fail condition early
    if (heartsConfig > 0 && stateRef.current.hearts <= 0) {
      handleComplete();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 5 && prev > 1) emit(GameEvent.TIMER_WARNING);
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, heartsConfig, emit, GameEvent]);

  // 3. Spawner
  useEffect(() => {
    if (phase !== 'playing') return;

    const spawn = () => {
      setEntities(prev => {
        if (prev.length >= 6) return prev; // max 6 moles at once

        // Find available slot (0-8)
        const usedSlots = prev.map(e => e.slot);
        let slot;
        do {
          slot = Math.floor(Math.random() * 9);
        } while (usedSlots.includes(slot));

        const isCorrect = Math.random() < 0.5; // 50/50 chance
        const entityId = entityIdCounter.current++;
        
        const lifetime = isCorrect ? 2500 + Math.random() * 1000 : 3500; // correct disappears faster to make it harder

        const newEntity = {
          id: entityId,
          slot,
          isCorrect,
          lifetime
        };

        // Schedule auto-removal
        setTimeout(() => {
          setEntities(current => current.filter(e => e.id !== entityId));
        }, lifetime);

        return [...prev, newEntity];
      });
    };

    spawn(); // first spawn instantly
    spawnRef.current = setInterval(spawn, 1200);

    return () => clearInterval(spawnRef.current);
  }, [phase]);

  const handleComplete = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(spawnRef.current);
    setPhase('done');
    emit(GameEvent.GAME_COMPLETE);
    onSlideComplete({
      score: stateRef.current.score,
      hits: stateRef.current.hits,
      misses: stateRef.current.misses,
      survived: stateRef.current.timeLeft > 0 || heartsConfig === 0
    });
  }, [onSlideComplete, emit, GameEvent, heartsConfig]);

  const tapEntity = useCallback((entityId) => {
    if (phase !== 'playing') return;
    if (tappedEntities.has(entityId)) return;

    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;

    setTappedEntities(prev => new Set([...prev, entityId]));

    if (entity.isCorrect) {
      emit(GameEvent.CORRECT);
      const base = 100;
      const comboBonus = stateRef.current.combo >= 3 ? 50 * stateRef.current.combo : 0;
      setScore(s => s + base + comboBonus);
      setCombo(c => c + 1);
      setHits(h => h + 1);
      
      if ((stateRef.current.combo + 1) % 5 === 0) emit(GameEvent.STREAK_BONUS);
      setShowHitEffect({ slot: entity.slot, correct: true, val: `+${base+comboBonus}` });
    } else {
      emit(GameEvent.WRONG);
      setCombo(0);
      setMisses(m => m + 1);
      
      if (heartsConfig > 0) {
        setHearts(h => {
          const newH = Math.max(0, h - 1);
          if (newH === 0) {
             // End slide handled by next effect tick
          }
          return newH;
        });
      }
      setShowHitEffect({ slot: entity.slot, correct: false, val: heartsConfig > 0 ? '-1 ❤️' : '❌' });
    }

    setTimeout(() => {
      setEntities(prev => prev.filter(e => e.id !== entityId));
      setShowHitEffect(null);
    }, 400); // Wait for whack animation
  }, [phase, tappedEntities, entities, emit, GameEvent, heartsConfig]);

  return {
    phase, countdownNum,
    timeLeft, hearts, score, combo, hits, misses,
    entities, tappedEntities, tapEntity, showHitEffect
  };
}

// ── RENDERER FOR A SINGLE SLIDE ──────────────
function WhackAMoleSlide({ item, slideIndex, totalSlides, timePerSlide, heartsConfig, onSlideComplete, globalScore, isFirstSlide, onGameStart }) {
  const engine = useWhackSlideEngine({ item, timePerSlide, heartsConfig, onSlideComplete, isFirstSlide, onGameStart });

  if (engine.phase === 'countdown') {
    return <CountdownScreen num={engine.countdownNum} label={`Câu hỏi ${slideIndex + 1}/${totalSlides}`} emoji="🔨" />;
  }
  if (engine.phase === 'done') {
    return null; // Awaiting parent state update
  }

  const gridSlots = Array.from({ length: 9 }, (_, i) => i);
  const currentQuestion = item.term || item.question || 'Câu hỏi';

  // Heart Rendering
  const heartsArr = Array.from({ length: heartsConfig }, (_, i) => i);

  return (
    <>
      <GameTopBar
        counter={`⏱ ${engine.timeLeft}s`}
        playerName="" // Kept minimal at slide level if desired
        score={globalScore + engine.score}
        streak={0}
        extra={
          <div className={styles.topStatsRow}>
            <div className={styles.slideCounter}>Câu {slideIndex + 1}/{totalSlides}</div>
            {heartsConfig > 0 && (
              <div className={styles.heartsContainer}>
                {heartsArr.map(i => (
                  <span key={i} className={`${styles.heart} ${i >= engine.hearts ? styles.heartLost : ''}`}>❤️</span>
                ))}
              </div>
            )}
            {heartsConfig === 0 && (
              <div className={styles.infiniteHearts}>💖 Vô hạn tim</div>
            )}
            {engine.combo >= 3 && <span className={styles.comboBadge}>🔥×{engine.combo}</span>}
          </div>
        }
      />
      
      <TimerBar timeLeft={engine.timeLeft} maxTime={timePerSlide} />

      {/* Question Banner */}
      <div className={styles.questionBanner}>
        <div className={styles.questionIcon}>🎯</div>
        <div className={styles.questionContent}>
          <span className={styles.questionLabel}>Tìm đáp án đúng:</span>
          <span className={styles.questionText}>{currentQuestion}</span>
        </div>
      </div>

      {/* Main Responsive Game Stage */}
      <div className={styles.gameAreaWrapper}>
        <div className={styles.gameStage}>
          {/* Mole Grid Perfectly Aligned Over Baked Holes */}
          <div className={styles.moleGrid}>
            {[
              { id: 0, top: 61, left: 40.5, scale: 0.65 },
              { id: 1, top: 61, left: 52.5, scale: 0.65 },
              { id: 2, top: 61, left: 64.5, scale: 0.65 },
              { id: 3, top: 74, left: 39.5, scale: 0.65 },
              { id: 4, top: 74, left: 52.5, scale: 0.65 },
              { id: 5, top: 74.5, left: 65, scale: 0.65 },
              { id: 6, top: 89.5, left: 39, scale: 0.65 },
              { id: 7, top: 89.5, left: 53, scale: 0.65 },
              { id: 8, top: 89.5, left: 67, scale: 0.65 }
            ].map((slotConfig) => {
              const slot = slotConfig.id;
              const entity = engine.entities.find(e => e.slot === slot);
              const isTapped = entity ? engine.tappedEntities.has(entity.id) : false;

              return (
                <div 
                  key={slot} 
                  className={styles.holeContainer}
                  style={{
                     top: `${slotConfig.top}%`,
                     left: `${slotConfig.left}%`,
                     transform: `translate(-50%, -50%) scale(${slotConfig.scale})`
                  }}
                >
                  <div className={styles.hole}></div>

                  {entity && !isTapped && (
                    <button
                      className={`${styles.mole} ${entity.isCorrect ? styles.moleCorrect : styles.moleWrong}`}
                      onClick={() => engine.tapEntity(entity.id)}
                    >
                      <div className={styles.signBoard}>
                        <span className={styles.signText}>
                          {entity.isCorrect 
                            ? (item.options?.[0] || item.term || '✓').slice(0, 20) 
                            : (item.options?.[(entity.id % 3) + 1] || item.options?.[1] || '✗').slice(0, 20)
                          }
                        </span>
                      </div>

                      <div className={styles.moleBody}>
                        <img src="/sprites/mole-sign.png" alt="" className={styles.moleImg} />
                      </div>
                    </button>
                  )}

                  {isTapped && entity && (
                    <div className={`${styles.splatEffect} ${entity.isCorrect ? styles.splatCorrect : styles.splatWrong}`}>
                      <span className={styles.splatEmoji}>{entity.isCorrect ? '💥' : '💨'}</span>
                    </div>
                  )}

                  {engine.showHitEffect?.slot === slot && (
                    <div className={`${styles.hitEffect} ${engine.showHitEffect.correct ? styles.hitCorrect : styles.hitWrong}`}>
                      <span className={styles.hitScore}>{engine.showHitEffect.val}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </>
  );
}

// ── PLAY PAGE WRAPPER ─────────────────────────────────────────
export default function WhackAMolePlayer({ items, activity, playerName }) {
  // Parse configs with fallbacks constraints
  const rawTime = parseInt(activity?.settings?.timePerSlide, 10);
  const timePerSlide = (!isNaN(rawTime) && rawTime >= 60 && rawTime <= 300) ? rawTime : 60; 
  
  const rawHearts = parseInt(activity?.settings?.heartsPerSlide, 10);
  // Default to 3, if deliberately set to 0, it means infinite.
  const heartsConfig = !isNaN(rawHearts) ? rawHearts : 3;

  // Global State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [globalScore, setGlobalScore] = useState(0);
  const [globalHits, setGlobalHits] = useState(0);
  const [globalMisses, setGlobalMisses] = useState(0);
  
  const [gameResult, setGameResult] = useState(null);

  const openerAudioRef = useRef(null);
  const bgmAudioRef = useRef(null);

  useEffect(() => {
    openerAudioRef.current = new window.Audio('/sounds/Whack-a-Mole-opener-music.mp3');
    bgmAudioRef.current = new window.Audio('/sounds/Whack-a-Mole-playgame-music.mp3');
    bgmAudioRef.current.loop = true;

    // Phát nhạc Opening ngay khi mount
    openerAudioRef.current.play().catch(e => console.warn('BGM AutoPlay blocked:', e));

    return () => {
      openerAudioRef.current?.pause();
      bgmAudioRef.current?.pause();
    };
  }, []);

  const handleGameStart = useCallback(() => {
    if (currentSlideIndex === 0 && bgmAudioRef.current) {
      bgmAudioRef.current.play().catch(e => console.warn('BGM Blocked:', e));
    }
  }, [currentSlideIndex]);

  const handleSlideComplete = (slideStats) => {
    const nextGlobalScore = globalScore + slideStats.score;
    const nextHits = globalHits + slideStats.hits;
    const nextMisses = globalMisses + slideStats.misses;

    setGlobalScore(nextGlobalScore);
    setGlobalHits(nextHits);
    setGlobalMisses(nextMisses);

    // Check if next slide exists
    if (currentSlideIndex + 1 < items.length) {
      setCurrentSlideIndex(idx => idx + 1);
    } else {
      // Game Over
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
      setGameResult({
        score: nextGlobalScore,
        hits: nextHits,
        misses: nextMisses
      });
    }
  };

  if (gameResult) {
    const accuracy = gameResult.hits + gameResult.misses > 0 
      ? Math.round((gameResult.hits / (gameResult.hits + gameResult.misses)) * 100) 
      : 0;

    const dummyAnswers = Array.from({ length: gameResult.hits }, (_, i) => ({ questionIndex: i, correct: true }));

    return (
      <ResultScreen
        playerName={playerName || 'Bạn'}
        score={gameResult.score}
        answers={dummyAnswers}
        items={items.slice(0, Math.min(items.length, gameResult.hits))}
        title="Thử thách Hoàn Tất!"
        extraStats={
          <>
            <div className={styles.extraStat}>
              <span className={styles.statVal}>🎯 {accuracy}%</span>
              <span className={styles.statLabel}>Độ chính xác</span>
            </div>
            <div className={styles.extraStat}>
              <span className={styles.statVal}>✓ {gameResult.hits}</span>
              <span className={styles.statLabel}>Đập trúng</span>
            </div>
          </>
        }
      />
    );
  }

  const currentItem = items[currentSlideIndex];

  return (
    <div className={styles.gamePage}>
      <WhackAMoleSlide 
        key={`slide-${currentSlideIndex}`} 
        item={currentItem}
        slideIndex={currentSlideIndex}
        totalSlides={items.length}
        timePerSlide={timePerSlide}
        heartsConfig={heartsConfig}
        onSlideComplete={handleSlideComplete}
        globalScore={globalScore}
        isFirstSlide={currentSlideIndex === 0}
        onGameStart={handleGameStart}
      />
    </div>
  );
}
