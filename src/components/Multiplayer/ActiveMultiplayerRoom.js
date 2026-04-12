'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WaitingRoom, LiveLeaderboard, PodiumScreen, ReactionOverlay } from '@/components/Multiplayer';
import HostLiveFeeds from './HostLiveFeeds';
import MultipleChoiceBoard from './MultipleChoiceBoard';
import TypeAnswerForm from './TypeAnswerForm';
import MultiplayerUnjumbleBoard from './MultiplayerUnjumbleBoard';
import MultiplayerGroupSortBoard from './MultiplayerGroupSortBoard';
import MultiplayerSpellBoard from './MultiplayerSpellBoard';
import MultiplayerMatchingPairsBoard from './MultiplayerMatchingPairsBoard';
import MultiplayerMatchupBoard from './MultiplayerMatchupBoard';
import MultiplayerOpenBoxGrid from './MultiplayerOpenBoxGrid';
import MultiplayerHangmanBoard from './MultiplayerHangmanBoard';
import { CountdownScreen, GameTopBar, TimerBar } from '@/components/GameShell';
import PowerUpInventory from '@/components/Multiplayer/PowerUpInventory';
import { getScoreMessage } from '@/lib/scoringEngine';
import { getTemplateBySlug } from '@/data/templates';
import { getEditDistance } from '@/lib/stringUtils';
import { resolvePlayerType } from '@/lib/gameRegistry';
import styles from './MultiplayerRoom.module.css';

export default function ActiveMultiplayerRoom({ mp, items: rawItems, activity, playerName }) {
  const templateSlug = activity?.template_slug || activity?.template_id || '';
  const playerType = templateSlug ? resolvePlayerType(templateSlug) : 'quiz';

  const items = useMemo(() => {
    let finalItems = rawItems;
    if (playerType === 'matchup' || playerType === 'matchingpairs') {
      if (rawItems.length > 0 && !rawItems[0].pairs) {
        finalItems = [{ pairs: rawItems, time_limit: rawItems[0].time_limit || 60 }];
      }
    }
    
    // Map globally if host generated a shuffled map
    if (mp.roomSettings?.shuffledMap && mp.roomSettings.shuffledMap.length === finalItems.length) {
       finalItems = mp.roomSettings.shuffledMap.map(idx => finalItems[idx]);
    }
    
    return finalItems;
  }, [rawItems, playerType, mp.roomSettings?.shuffledMap]);

  // ── Local game state ──────────────────────────────────────
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [maxTime, setMaxTime] = useState(-1);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [eliminatedOptions, setEliminatedOptions] = useState([]);
  const [showReveal, setShowReveal] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [fastForwardQ, setFastForwardQ] = useState(-1);
  const [countdownTick, setCountdownTick] = useState(3);
  const [nearMissHint, setNearMissHint] = useState(false);
  const timerRef = useRef(null);
  const autoFlowRef = useRef(null);
  const answerStatsRef = useRef(null);

  // ── ROBUST type-answer detection (3 layers) ───────────────
  const templateInfo = templateSlug ? getTemplateBySlug(templateSlug) : null;
  const engineInputMode = templateInfo?.engine?.inputMode;
  const slugIsTypeAnswer = ['typeanswer', 'type-the-answer', 'flashcard', 'flash-cards'].some(s => templateSlug.toLowerCase().includes(s));
  const currentItem = items[mp.currentQuestion] || null;
  const validOptionCount = currentItem?.options
    ? (Array.isArray(currentItem.options) ? currentItem.options : [])
        .filter(opt => {
          const text = typeof opt === 'string' ? opt : (opt?.text || '');
          return text.trim() !== '';
        }).length
    : 0;
  const itemHasMultipleOptions = validOptionCount >= 2;
  const isTypeAnswer = engineInputMode === 'type' || slugIsTypeAnswer || !itemHasMultipleOptions;
  const hasOptions = !isTypeAnswer && shuffledOptions.length >= 2;
  const isShareScreen = mp.shareScreen && !mp.isHost;

  // ── Listen for power-up events ────────────────────────────
  useEffect(() => {
    const handleEliminate = () => {
      const wrongOpts = shuffledOptions.filter(o => o.originalIndex !== 0 && !eliminatedOptions.includes(o.originalIndex));
      if (wrongOpts.length > 0) {
        const toRemove = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
        setEliminatedOptions(prev => [...prev, toRemove.originalIndex]);
      }
    };
    const handleReveal = (e) => {
      setShowReveal(true);
      setTimeout(() => setShowReveal(false), (e.detail || 1) * 1000);
    };
    const handleTimeExtend = (e) => {
      setTimeLeft(prev => prev + (e.detail || 5));
    };
    window.addEventListener('tina_eliminate_wrong', handleEliminate);
    window.addEventListener('tina_reveal_answer', handleReveal);
    window.addEventListener('tina_time_extend', handleTimeExtend);
    return () => {
      window.removeEventListener('tina_eliminate_wrong', handleEliminate);
      window.removeEventListener('tina_reveal_answer', handleReveal);
      window.removeEventListener('tina_time_extend', handleTimeExtend);
    };
  }, [shuffledOptions, eliminatedOptions]);

  // ── Shuffle options when question changes ─────────────────
  useEffect(() => {
    if (mp.currentQuestion < 0 || !items[mp.currentQuestion]) return;
    const item = items[mp.currentQuestion];
    if (item.options) {
      const opts = (Array.isArray(item.options) ? item.options : [])
        .map((opt, i) => ({ text: typeof opt === 'string' ? opt : (opt?.text || ''), originalIndex: i }))
        .filter(o => o.text.trim() !== '');
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      setShuffledOptions(opts);
    }
    setSelectedAnswer(null);
    setShowFeedback(false);
    setRoundResult(null);
    setTypedAnswer('');
    setEliminatedOptions([]);
    setShowReveal(false);
    setAnswerRevealed(false);
    setFastForwardQ(-1);
    setNearMissHint(false);
    answerStatsRef.current = { distribution: [0, 0, 0, 0], total: 0, correct: 0, fastest: null };

    // Clear any auto-flow timers
    if (autoFlowRef.current) clearTimeout(autoFlowRef.current);

    // Start timer
    const tl = item.extra_data?.time_limit || 20;
    setMaxTime(tl);
    
    const calculateTimeLeft = () => {
      if (!mp.questionStartTime) return tl;
      let elapsed = Date.now() - mp.questionStartTime;
      
      // Delay timer for spelltheword memorize phase
      if (playerType === 'spelltheword' && item.term) {
        const spellDelay = 400 + (item.term.length * 1200) + 1000 + 2000;
        elapsed = Math.max(0, elapsed - spellDelay);
      }
      
      const remainingMs = (tl * 1000) - elapsed;
      return Math.max(0, Math.ceil(remainingMs / 1000));
    };

    setTimeLeft(calculateTimeLeft());
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Sync using real-time calculation to prevent throttling issues
    timerRef.current = setInterval(() => {
      const currentLeft = calculateTimeLeft();
      setTimeLeft(currentLeft);
      if (currentLeft <= 0) {
        clearInterval(timerRef.current);
      }
    }, 250);

    return () => {
      clearInterval(timerRef.current);
      if (autoFlowRef.current) {
        clearTimeout(autoFlowRef.current);
        autoFlowRef.current = null;
      }
    };
  }, [mp.currentQuestion, mp.questionStartTime, items]);

  // ── Countdown Timer (3-2-1) ───────────────────────────────
  useEffect(() => {
    if (mp.phase === 'countdown') {
      setCountdownTick(3);
      const iv = setInterval(() => {
        setCountdownTick(prev => prev - 1);
      }, 1000);
      return () => clearInterval(iv);
    }
  }, [mp.phase]);
  // ── Auto Flow: answer → 5s leaderboard → 5s next ─────────
  const startAutoFlow = useCallback(() => {
    if (!mp.isHost) return;
    if (autoFlowRef.current) clearTimeout(autoFlowRef.current);

    // ONLY for groupsort: single round, go straight to end game (as it has no "round" score concept)
    if (playerType === 'groupsort') {
      autoFlowRef.current = setTimeout(() => {
        autoFlowRef.current = null;
        mp.hostEndGame();
      }, 3000);
      return;
    }

    // 5s after answer reveal → show leaderboard (or end game if last)
    autoFlowRef.current = setTimeout(() => {
      autoFlowRef.current = null; // Clear so we know it finished

      const isLastQuestion = mp.currentQuestion >= items.length - 1;

      if (isLastQuestion) {
        mp.hostEndGame();
      } else {
        mp.hostShowLeaderboard({
          answerStats: answerStatsRef.current,
          roundPoints: mp.lastRoundPoints,
        });

        // 5s after leaderboard → next question (or return to grid for openbox)
        autoFlowRef.current = setTimeout(() => {
          autoFlowRef.current = null;
          if (playerType === 'openbox') {
            const opened = mp.roomSettings?.openedBoxes || [];
            if (opened.length + 1 >= items.length) {
              mp.hostEndGame();
            } else {
              mp.hostReturnToGrid(mp.currentQuestion);
            }
          } else {
            mp.hostNextQuestion(mp.currentQuestion + 1);
          }
        }, 5000);
      }
    }, 5000);
  }, [mp, items, playerType]);

  // ── Handle Timeout ────────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    if (mp.answeredThisQ || selectedAnswer !== null) return;

    setSelectedAnswer(-1);
    setShowFeedback(true);

    const item = items[mp.currentQuestion];
    const result = await mp.submitAnswer(-1, false, item, items.length);
    setRoundResult(result);

    // Show answer reveal
    setTimeout(() => setAnswerRevealed(true), 500);

    // AUTO FLOW: 5s → leaderboard → 5s → next question
    startAutoFlow();
  }, [mp, selectedAnswer, items]);

  // ── Watch for Time's Up ──────────────────────────────────
  useEffect(() => {
    if (mp.currentQuestion === -1) return; // DO NOT watch for time up in Grid Phase

    if (timeLeft === 0 && mp.phase === 'playing') {
      const qItem = items[mp.currentQuestion];
      const tl = qItem?.extra_data?.time_limit || 20;
      
      let expectedTimeLeft = tl;
      if (mp.questionStartTime) {
         let elapsed = Date.now() - mp.questionStartTime;
         if (playerType === 'spelltheword' && qItem?.term) {
            const spellDelay = 400 + (qItem.term.length * 1200) + 1000 + 2000;
            elapsed = Math.max(0, elapsed - spellDelay);
         }
         expectedTimeLeft = Math.max(0, Math.ceil(((tl * 1000) - elapsed) / 1000));
      }
      
      // Ignore stale `timeLeft === 0` caused by React state lag or previous question
      const isFastForwarded = fastForwardQ === mp.currentQuestion;
      if (expectedTimeLeft > 2 && !isFastForwarded) return;

      // REVEAL ANSWERS FOR EVERYONE
      setShowFeedback(true);
      setTimeout(() => setAnswerRevealed(true), 500);

      const isInteractiveGame = playerType === 'groupsort' || playerType === 'matchingpairs' || playerType === 'matchup';

      if (isInteractiveGame) {
        // For groupsort/matchingpairs: Host triggers end game flow. Players auto-submit via Board.
        if (mp.isHost && !autoFlowRef.current) {
          startAutoFlow();
        }
      } else if (!mp.answeredThisQ && selectedAnswer === null) {
        handleTimeout();
      } else if (mp.isHost && !autoFlowRef.current) {
        startAutoFlow();
      }
    }
  }, [timeLeft, mp.answeredThisQ, selectedAnswer, mp.phase, handleTimeout, mp.isHost, startAutoFlow, items, mp.currentQuestion, mp.questionStartTime, playerType, fastForwardQ]);

  // ── Handle Answer ─────────────────────────────────────────
  const handleAnswer = useCallback(async (originalIndex, overridePoints = null) => {
    if (mp.answeredThisQ || selectedAnswer !== null) return;

    const isCorrect = originalIndex === 0 || (overridePoints !== null && overridePoints > 0);
    setSelectedAnswer(originalIndex);
    // Don't show feedback yet! Wait for time's up.

    const item = items[mp.currentQuestion];
    const result = await mp.submitAnswer(originalIndex, isCorrect, item, items.length, overridePoints);
    setRoundResult(result);

    // Auto flow for players (host controls via Continue)
    if (!mp.isHost) {
      // Players just wait for host's broadcast
    }
  }, [mp, selectedAnswer, items]);

  // ── Host: Continue (skip timer to 0) ──────────────────────
  const handleHostContinue = useCallback(() => {
    if (!mp.isHost) return;
    setFastForwardQ(mp.currentQuestion);
    
    // Broadcast for students
    mp.hostFastForwardTimer?.();

    // Fast-forward timer bar animation: drop to 0 over 0.5s
    clearInterval(timerRef.current);
    const steps = 10;
    const currentTime = timeLeft;
    let step = 0;
    timerRef.current = setInterval(() => {
      step++;
      const newTime = Math.max(0, Math.round(currentTime * (1 - step / steps)));
      setTimeLeft(newTime);
      if (step >= steps) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        // Trigger timeout if not already answered
        if (!mp.answeredThisQ && selectedAnswer === null) {
          handleTimeout();
        } else {
          // Already answered, start auto flow
          startAutoFlow();
        }
      }
    }, 50); // 10 steps × 50ms = 500ms total
  }, [mp, timeLeft, handleTimeout, startAutoFlow, selectedAnswer]);

  // ── Client: Listen to Fast Forward ────────────────────────
  useEffect(() => {
    const handleFastForward = () => {
      if (mp.isHost) return;
      setFastForwardQ(mp.currentQuestion);
      if (timerRef.current) clearInterval(timerRef.current);
      const steps = 10;
      const currentTime = timeLeft;
      let step = 0;
      timerRef.current = setInterval(() => {
        step++;
        const newTime = Math.max(0, Math.round(currentTime * (1 - step / steps)));
        setTimeLeft(newTime);
        if (step >= steps) {
          clearInterval(timerRef.current);
          setTimeLeft(0);
        }
      }, 50);
    };

    window.addEventListener('tina_fast_forward_timer', handleFastForward);
    return () => window.removeEventListener('tina_fast_forward_timer', handleFastForward);
  }, [mp.isHost, timeLeft, mp.currentQuestion]);

  // ── Auto-forward when all players answered ────────────────
  useEffect(() => {
    const isFastForwarded = fastForwardQ === mp.currentQuestion;
    if (!mp.isHost || mp.phase !== 'playing' || timeLeft <= 0 || isFastForwarded) return;
    
    // Count active players (exclude host, must be online)
    const activePlayers = mp.players.filter(p => !p.is_host && p.is_online);
    
    // Count how many have answered THIS round
    const answersCount = Object.keys(mp.lastRoundPoints || {}).length;
    
    // If all active players have answered, skip the timer
    if (activePlayers.length > 0 && answersCount >= activePlayers.length) {
      console.log('🏁 AUTO-FORWARD TRIGGERED! answersCount:', answersCount, 'activePlayers:', activePlayers.length, 'lastRoundPoints:', mp.lastRoundPoints);
      handleHostContinue();
    }
  }, [mp.isHost, mp.phase, mp.players, mp.lastRoundPoints, timeLeft, fastForwardQ, mp.currentQuestion, handleHostContinue]);

  const item = items[mp.currentQuestion] || null;

  // ── Active effect checks ──────────────────────────────────
  const hasReverseEffect = mp.activeEffects.some(e => e.effectType === 'reverse_controls');
  const hasShrinkEffect = mp.activeEffects.some(e => e.effectType === 'shrink_text');

  const handleBroadcastWrongGuess = useCallback((word) => {
    if (mp.channelRef?.current) {
      mp.channelRef.current.send({
        type: 'broadcast', event: 'wrong_guess', payload: { word }
      });
    }
  }, [mp]);

  // ── WAITING ROOM ──────────────────────────────────────────
  if (mp.phase === 'waiting' || mp.phase === 'idle') {
    return (
      <WaitingRoom
        roomId={mp.roomId}
        players={mp.players}
        isHost={mp.isHost}
        onStart={(settings) => mp.hostStartGame({ ...settings, initialQuestion: playerType === 'openbox' ? -1 : 0 })}
        playerId={mp.playerId}
        myPlayer={mp.myPlayer}
        mp={mp}
        shareCode={activity?.share_code}
      />
    );
  }

  // ── COUNTDOWN ─────────────────────────────────────────────
  if (mp.phase === 'countdown') {
    return <CountdownScreen num={countdownTick} label="Chuẩn bị!" />;
  }

  // ── LEADERBOARD ───────────────────────────────────────────
  if (mp.phase === 'leaderboard') {
    return (
      <LiveLeaderboard
        leaderboard={mp.leaderboard}
        previousLeaderboard={mp.previousLeaderboard}
        roundPoints={mp.lastRoundPoints}
        myPlayerId={mp.playerId}
        // Handle Next Click internally
        onNext={() => {
          const nextQ = mp.currentQuestion + 1;
          if (playerType === 'groupsort' || playerType === 'matchingpairs' || playerType === 'matchup' || nextQ >= items.length) {
            mp.hostEndGame();
          } else if (playerType === 'openbox') {
            const opened = mp.roomSettings?.openedBoxes || [];
            if (opened.length + 1 >= items.length) {
              mp.hostEndGame();
            } else {
              mp.hostReturnToGrid(mp.currentQuestion);
            }
          } else {
            mp.hostNextQuestion(nextQ);
          }
        }}
        onEnd={() => mp.hostEndGame()}
        currentQ={mp.currentQuestion}
        totalQ={items.length}
      />
    );
  }

  // ── PODIUM ────────────────────────────────────────────────
  if (mp.phase === 'podium') {
    return (
      <PodiumScreen
        leaderboard={mp.leaderboard}
        myPlayerId={mp.playerId}
        totalQ={items.length}
        onRematch={mp.isHost ? () => window.location.reload() : null}
      />
    );
  }
  // ── GRID PHASE (Open The Box) ───────────────────────────────────────
  if (mp.phase === 'playing' && playerType === 'openbox' && mp.currentQuestion === -1) {
    return (
      <div className={styles.gamePage}>
        <GameTopBar counter={`Đã mở: ${mp.roomSettings?.openedBoxes?.length || 0}/${items.length}`} score={mp.myPlayer?.score || 0} streak={mp.myPlayer?.streak || 0} />
        <MultiplayerOpenBoxGrid 
           items={items} 
           mp={mp} 
        />
      </div>
    );
  }

  // ── PLAYING RENDERING ───────────────────────────────────────────────
  if (mp.phase === 'playing' && item) {
    const scoreMsg = roundResult ? getScoreMessage(roundResult.points) : null;
    const hasReverseEffect = mp.activeEffects?.includes('reverse_screen');
    const hasShrinkEffect = mp.activeEffects?.includes('shrink_text');
    const isSpectatingHost = mp.isHost && (!mp.myPlayer || mp.myPlayer.player_name === 'Host Teacher');

    return (
      <div className={styles.gamePage} style={hasReverseEffect ? { transform: 'scaleX(-1)' } : {}}>
        <GameTopBar counter={playerType === 'groupsort' ? 'Phân Nhóm' : playerType === 'matchup' ? 'Nối Nghĩa' : playerType === 'matchingpairs' ? 'Tìm Đáp Án' : playerType === 'openbox' ? `Hộp ${mp.currentQuestion + 1}` : `${mp.currentQuestion + 1}/${items.length}`} score={mp.myPlayer?.score || 0} streak={mp.myPlayer?.streak || 0} />
        <TimerBar timeLeft={timeLeft} maxTime={maxTime} showBubble={false} />

        {mp.isHost && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', padding: '8px 24px 0' }}>
            <button onClick={handleHostContinue} className={styles.hostContinueBtn} style={{ margin: 0, padding: '8px 24px', fontSize: 14 }}>
              Continue ⏭
            </button>
          </div>
        )}

        {false && !mp.isHost && (
          <PowerUpInventory inventory={mp.inventory} onUseItem={(idx) => mp.usePowerUp(idx)} activeEffects={mp.activeEffects} itemMultiplier={mp.itemMultiplier} />
        )}

        {/* Component Live Feeds - Rất gọn */}
        <HostLiveFeeds 
          isHost={mp.isHost} 
          wrongGuesses={mp.wrongGuesses} 
          correctPlayers={
            (playerType === 'unjumble' || playerType === 'spelltheword' || !hasOptions)
              ? mp.correctPlayers?.filter(p => p.correct)
              : mp.correctPlayers
          } 
          answerRevealed={showFeedback || answerRevealed}
        />

        {(!isShareScreen || mp.isHost) && !['groupsort', 'matchingpairs', 'matchup', 'hangman', 'minionhangman'].includes(playerType) && (
          <div className={styles.questionSection}>
            <div className={styles.questionCard}>
              {item.image_url && <img src={item.image_url} alt="" className={styles.questionImage} />}
              <h2 className={styles.questionText} style={hasShrinkEffect ? { fontSize: 12, opacity: 0.4 } : {}}>
                {playerType === 'unjumble' 
                  ? (item.definition || 'Sắp xếp lại các từ sau để tạo thành câu hoàn chỉnh:') 
                  : playerType === 'spelltheword'
                  ? (item.definition || 'Lắng nghe và Đánh vần chữ này') 
                  : (item.term || item.question || 'Câu hỏi')
                }
              </h2>
              {playerType === 'spelltheword' && item.definition && (
                <div style={{ fontSize: 24, marginTop: 12, color: 'rgba(255,255,255,0.7)' }}>💡 Gợi ý đã hiển thị</div>
              )}
            </div>
          </div>
        )}

        {isShareScreen && !mp.isHost && !['matchingpairs', 'matchup', 'hangman', 'minionhangman'].includes(playerType) && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>
            Look at the screen
          </div>
        )}

        {showReveal && hasOptions && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
            <div style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)', padding: '24px 48px', borderRadius: 20, fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', boxShadow: '0 0 40px rgba(46, 204, 113, 0.5)' }}>
              {shuffledOptions.find(o => o.originalIndex === 0)?.text || ''}
            </div>
          </div>
        )}

        {/* ── ANSWER AREA Tách Gọi Components ───────────────── */}
        <div style={{ marginTop: 'auto', width: '100%', paddingBottom: '24px', flex: (['groupsort', 'matchingpairs', 'matchup', 'hangman', 'minionhangman'].includes(playerType)) ? 1 : 'none', display: 'flex', justifyContent: 'center' }}>
          {playerType === 'groupsort' ? (
            <MultiplayerGroupSortBoard 
              items={items}
              mp={mp}
              timeLeft={timeLeft}
              isSpectatingHost={isSpectatingHost}
              isShareScreen={isShareScreen && mp.isHost}
            />
          ) : playerType === 'matchingpairs' ? (
            <MultiplayerMatchingPairsBoard
              items={items}
              mp={mp}
              timeLeft={timeLeft}
              isSpectatingHost={isSpectatingHost}
              isShareScreen={isShareScreen}
            />
          ) : playerType === 'matchup' ? (
            <MultiplayerMatchupBoard
              items={items}
              mp={mp}
              timeLeft={timeLeft}
              isSpectatingHost={isSpectatingHost}
              isShareScreen={isShareScreen}
            />
          ) : playerType === 'hangman' || playerType === 'minionhangman' ? (
            <MultiplayerHangmanBoard
              item={item}
              mp={mp}
              timeLeft={timeLeft}
              isSpectatingHost={isSpectatingHost}
              isShareScreen={isShareScreen}
              showFeedback={showFeedback}
            />
          ) : playerType === 'unjumble' ? (
            <MultiplayerUnjumbleBoard 
              item={item}
              handleAnswer={handleAnswer}
              answeredThisQ={mp.answeredThisQ || isSpectatingHost}
              isShareScreen={isShareScreen}
              showFeedback={showFeedback}
            />
          ) : playerType === 'spelltheword' ? (
            <MultiplayerSpellBoard
              item={item}
              handleAnswer={handleAnswer}
              answeredThisQ={mp.answeredThisQ || isSpectatingHost}
              isShareScreen={isShareScreen}
              showFeedback={showFeedback}
            />
          ) : hasOptions ? (
            <MultipleChoiceBoard 
              shuffledOptions={shuffledOptions}
              eliminatedOptions={eliminatedOptions}
              selectedAnswer={selectedAnswer}
              showFeedback={showFeedback}
              answerRevealed={answerRevealed}
              answeredThisQ={mp.answeredThisQ || isSpectatingHost}
              isShareScreen={isShareScreen}
              handleAnswer={handleAnswer}
            />
          ) : (
            <TypeAnswerForm
              showFeedback={showFeedback}
              item={item}
              handleAnswer={handleAnswer}
              answeredThisQ={mp.answeredThisQ || isSpectatingHost}
              isHostShareScreen={mp.isHost && isShareScreen}
              onBroadcastWrongGuess={handleBroadcastWrongGuess}
            />
          )}
        </div>

        {showFeedback && roundResult && roundResult.points > 0 && (
          <div className={styles.scoreFeedback}>
            <div>
              <div className={styles.scoreFeedbackTitle} style={{ color: scoreMsg?.color || '#2ecc71' }}>{scoreMsg?.text || 'CORRECT!'}</div>
              <div className={styles.scoreFeedbackPoints}>+{roundResult.points.toLocaleString()}</div>
              {(roundResult.newStreak || 0) >= 3 && <div style={{ fontSize: 16, color: '#ff6b6b', marginTop: 4, fontWeight: 800 }}>Streak x{roundResult.breakdown?.streakMultiplier}</div>}
            </div>
          </div>
        )}

        {timeLeft <= 5 && timeLeft > 0 && !showFeedback && <div className={styles.hurryUpBadge}>Hurry Up!</div>}
      </div>
    );
  }

  return null;
}
