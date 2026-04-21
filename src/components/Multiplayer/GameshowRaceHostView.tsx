import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import useRoomStore from '@/lib/multiplayer/roomStore';
import { itemLabel as itemLabelFn } from '@/lib/multiplayer/itemCatalog';
import AvatarDisplay from './AvatarDisplay';
import styles from './GameshowRace.module.css';

/** Helper: get the live Supabase channel from Zustand store */
function getChannel(): any {
  const store = useRoomStore.getState() as any;
  return store._refs?.channel || null;
}

/** Clear all race session storage for a room */
function clearRaceSession(roomId: string) {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`tina_race_${roomId}`)) sessionStorage.removeItem(key);
    }
  } catch {}
}

interface RacePlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  currentQ: number;
  correctCount: number;
  isFinished: boolean;
  streak: number;
}

export default function GameshowRaceHostView({ mp, items }: any) {
  const [racePlayers, setRacePlayers] = useState<Record<string, RacePlayer>>({});
  const racePlayersRef = useRef(racePlayers);
  racePlayersRef.current = racePlayers;
  const [raceStartedAt, setRaceStartedAt] = useState<number>(mp.questionStartTime || Date.now());
  const [timeLeft, setTimeLeft] = useState(mp.roomSettings?.raceDuration || 300);
  const [devLogs, setDevLogs] = useState<{ id: string, msg: string }[]>([]);
  const players = useRoomStore((state: any) => state.players) as any[];
  const raceDuration = mp.roomSettings?.raceDuration || 300;

  // ── Listen for race_state_update broadcasts (BATCHED path) ────
  const pendingUpdates = useRef<Record<string, any>>({});

  useEffect(() => {
    const ch = getChannel();
    if (!ch) return;

    // 1. Tích lũy các thay đổi trạng thái (points/progress) vào kho tạm
    const handleStateUpdate = ({ payload }: any) => {
      if (!payload?.playerId) return;
      
      pendingUpdates.current[payload.playerId] = {
        ...pendingUpdates.current[payload.playerId],
        ...payload
      };
    };

    // Lắng nghe các event từ kênh mạng hiện tại
    ch.on('broadcast', { event: 'race_state_update' }, handleStateUpdate);
    ch.on('broadcast', { event: 'race_progress' }, handleStateUpdate); // Legacy fallback

    // 2. Chế độ Bơm định kỳ mỗi 100ms (Ngăn chặn Over-rendering / Quá tải luồng UI)
    const tickInterval = setInterval(() => {
      if (Object.keys(pendingUpdates.current).length === 0) return;

      setRacePlayers(prev => {
        const nextState = { ...prev };
        
        for (const [pId, payload] of Object.entries(pendingUpdates.current)) {
          nextState[pId] = {
            id: pId,
            name: payload.playerName || nextState[pId]?.name || '?',
            avatar: payload.avatar || nextState[pId]?.avatar || '',
            score: payload.score ?? nextState[pId]?.score ?? 0,
            currentQ: payload.currentQuestionIndex ?? nextState[pId]?.currentQ ?? 0,
            correctCount: payload.correctCount ?? nextState[pId]?.correctCount ?? 0,
            isFinished: payload.isFinished ?? nextState[pId]?.isFinished ?? false,
            streak: payload.streak ?? nextState[pId]?.streak ?? 0,
          };
        }
        
        return nextState;
      });

      // Làm sạch kho tạm để đón kỳ kế tiếp
      pendingUpdates.current = {};
    }, 100);

    // Ghi nhận nhật ký Dev (Giữ nguyên luồng xử lý riêng vì nó không làm hại giao diện)
    ch.on('broadcast', { event: 'dev_item_log' }, ({ payload }: any) => {
      if (process.env.NODE_ENV !== 'development') return;
      const tName = payload.target_player_id ? (racePlayersRef.current[payload.target_player_id]?.name || payload.target_player_id) : '';
      setDevLogs(prev => {
        if (payload.log_id && prev.some(l => l.id === payload.log_id)) return prev;
        const itemReadable = itemLabelFn(payload.item_id);
        let msg = `Câu ${payload.question}: ${payload.from_player} dùng ${itemReadable}`;
        if (tName) msg += ` → ${tName}`;
        if (payload.effect) msg += ` [${payload.effect}]`;
        return [...prev, { id: payload.log_id || Math.random().toString(36).substr(2, 9), msg }].slice(-20); // Keep last 20 logs
      });
    });

    return () => clearInterval(tickInterval);
  }, []);

  // ── Host: beforeunload confirmation ────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Bạn có chắc muốn thoát? Dữ liệu game sẽ bị mất!';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ── Initialize player list from room players on mount ──────
  useEffect(() => {
    const HOST_NAMES = ['Host Teacher', 'Giáo viên'];
    const nonHostPlayers = players.filter((p: any) => !HOST_NAMES.includes(p.player_name) && !p.is_host);
    
    setRacePlayers(prev => {
      const updated = { ...prev };
      nonHostPlayers.forEach((p: any) => {
        if (!updated[p.id]) {
          updated[p.id] = {
            id: p.id,
            name: p.player_name,
            avatar: p.avatar_emoji,
            score: 0,
            currentQ: 0,
            correctCount: 0,
            isFinished: false,
            streak: 0,
          };
        }
      });
      return updated;
    });
  }, [players]);

  // ── Countdown timer ────────────────────────────────────────
  useEffect(() => {
    const baseTime = raceStartedAt;

    const getRemaining = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      return Math.max(0, raceDuration - elapsed);
    };

    setTimeLeft(getRemaining());

    const iv = setInterval(() => {
      const remaining = getRemaining();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(iv);
        // Auto end race
        fetch('/api/race', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end_race', room_id: mp.roomId }),
        }).then(() => {
          // Build final scores map to broadcast to players
          const currentRacePlayers = racePlayersRef.current;
          const finalScores: Record<string, { score: number, correctCount: number }> = {};
          Object.values(currentRacePlayers).forEach((rp: any) => {
            finalScores[rp.id] = { score: rp.score || 0, correctCount: rp.correctCount || 0 };
          });
          getChannel()?.send({ type: 'broadcast', event: 'race_end', payload: { finalScores } });
          clearRaceSession(mp.roomId);
          // Sync racePlayers scores to store for podium
          const store = useRoomStore.getState() as any;
          store.setPlayers((prev: any) => 
            [...prev].map((p: any) => {
              const rp = currentRacePlayers[p.id];
              return rp ? { ...p, score: rp.score, correct_count: rp.correctCount } : p;
            }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
          );
          store.setPhase('podium');
        });
      }
    }, 1000);

    return () => clearInterval(iv);
  }, [raceStartedAt, raceDuration, mp.roomId]);

  // ── Build sorted ranking ───────────────────────────────────
  const ranking = useMemo(() => {
    return Object.values(racePlayers)
      .sort((a, b) => b.score - a.score);
  }, [racePlayers]);

  const handleEndRace = useCallback(() => {
    if (!window.confirm('Kết thúc trò chơi ngay bây giờ?')) return;
    
    fetch('/api/race', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end_race', room_id: mp.roomId }),
    }).then(() => {
      // Build final scores map to broadcast to players
      const finalScores: Record<string, { score: number, correctCount: number }> = {};
      Object.values(racePlayers).forEach((rp: any) => {
        finalScores[rp.id] = { score: rp.score || 0, correctCount: rp.correctCount || 0 };
      });
      getChannel()?.send({ type: 'broadcast', event: 'race_end', payload: { finalScores } });
      // Clear all session data for this room
      clearRaceSession(mp.roomId);
      // Transition to podium with final scores
      const store = useRoomStore.getState() as any;
      store.setPlayers((prev: any) => 
        [...prev].map((p: any) => {
          const rp = racePlayers[p.id];
          return rp ? { ...p, score: rp.score, correct_count: rp.correctCount } : p;
        }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      );
      store.setPhase('podium');
    });
  }, [mp.roomId, racePlayers]);

  const totalQuestions = items.length;
  const avgQ = ranking.length > 0 ? ranking.reduce((acc, p) => acc + p.currentQ, 0) / ranking.length : 0;
  const finishedCount = ranking.filter(p => p.isFinished).length;
  
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeStr = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

  return (
    <div className={styles.hostContainer}>
      <div className={styles.hostHeader}>
        <div className={styles.hostTitle}>
           <span>🏁 GAMESHOW RACE</span>
           <span className={`${styles.hostTimer} ${timeLeft <= 60 ? styles.hostTimerWarning : ''}`}>{timeStr}</span>
           <span style={{ fontSize: '1rem', opacity: 0.7 }}>
             ({finishedCount}/{ranking.length} đã hoàn thành)
           </span>
        </div>
        <button className={styles.endRaceBtn} onClick={handleEndRace}>
           ⏹ Kết thúc sớm
        </button>
      </div>
      
      <div className={styles.hostMain}>
        {/* Left Ranking Panel */}
        <div className={styles.rankingPanel}>
           <h3>LIVE RANKING</h3>
           <div className={styles.rankingList}>
              {ranking.map((p, index) => (
                 <div key={p.id} className={styles.rankingItem}>
                    <div className={`${styles.rankBadge} ${index === 0 ? styles.rank1 : index === 1 ? styles.rank2 : index === 2 ? styles.rank3 : ''}`}>
                       {index + 1}
                    </div>
                    <div style={{ width: 32, height: 32 }}>
                       <AvatarDisplay avatar={p.avatar} />
                    </div>
                    <div className={styles.rankName}>
                      {p.name}
                      {p.streak >= 3 && <span style={{ marginLeft: 4, color: '#f59e0b' }}>🔥{p.streak}</span>}
                      {p.isFinished && <span style={{ marginLeft: 8, color: '#10b981' }}>✓</span>}
                    </div>
                    <div className={styles.rankScore}>{p.score.toLocaleString()}đ</div>
                 </div>
              ))}
              {ranking.length === 0 && <p style={{ opacity: 0.5 }}>Đang chờ người chơi...</p>}
           </div>
        </div>
        
        {/* Right Progress Map */}
        <div className={styles.progressPanel}>
           <div className={styles.progressStats}>
              <div className={styles.statCard}>
                 <h4>Tiến độ trung bình</h4>
                 <div className={styles.statValue}>Câu {Math.floor(avgQ)} / {totalQuestions}</div>
              </div>
              <div className={styles.statCard}>
                 <h4>Tỉ lệ hoàn thành chung</h4>
                 <div className={styles.statValue}>{Math.round((avgQ / totalQuestions) * 100) || 0}%</div>
              </div>
           </div>
           
           <h3>PROGRESS MAP</h3>
           <div className={styles.progressBars}>
              {ranking.map(p => {
                 const percent = Math.min(100, Math.max(0, (p.currentQ / totalQuestions) * 100));
                 return (
                    <div key={p.id} className={styles.progressBarItem}>
                       <div className={styles.progressAvatar}>
                          <AvatarDisplay avatar={p.avatar} />
                       </div>
                       <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                       </div>
                       <div className={styles.progressText}>
                          {p.currentQ} / {totalQuestions}
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* Dev-only Event Log */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', bottom: 30, left: 30, background: 'rgba(0,0,0,0.85)', padding: 20, borderRadius: 12, color: '#10b981', fontFamily: 'monospace', zIndex: 9999, maxWidth: 600, minWidth: 450, border: '2px solid #10b981', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', paddingBottom: 10, fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>🛠 DEV LOG: Item Usage</h4>
          {devLogs.length === 0 ? <div style={{ fontSize: 14, opacity: 0.5, fontStyle: 'italic' }}>Chờ người chơi sử dụng vật phẩm...</div> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devLogs.map(log => (
              <div key={log.id} style={{ fontSize: 15, lineHeight: 1.4 }}>{log.msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
