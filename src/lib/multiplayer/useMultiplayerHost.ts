import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UseMultiplayerHostProps {
  roomId: string;
  tickRateMs?: number; // Mặc định là 100ms (10 frames / s)
}

export function useMultiplayerHost({ roomId, tickRateMs = 100 }: UseMultiplayerHostProps) {
  // Trạng thái Bảng xếp hạng. Thay vì cập nhật liên tục, nó sẽ ngắt quãng xử lý (Batching).
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});
  
  // HÀNG ĐỢI (BUFFER): Nơi chứa tạm thời tất cả các gói tin đến từ hàng trăm học sinh.
  const pendingUpdates = useRef<any[]>([]);

  useEffect(() => {
    if (!roomId) return;

    // 1. Kích hoạt tai nghe Supabase Channel
    const channel = supabase.channel(`room-${roomId}`);

    channel
      .on('broadcast', { event: 'SCORE_UPDATE' }, (message) => {
        // NGUYÊN TẮC VÀNG: Tuyệt đối KHÔNG gọi setLeaderboard() ở đây.
        // Việc ném dữ liệu vào mảng tạm giúp ứng dụng không bị crash khi 100 người chơi bấm cùng lúc.
        pendingUpdates.current.push(message.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Host channel is ready. Listening on room:', roomId);
        }
      });

    // 2. VÒNG LẶP TRÒ CHƠI (The Game Tick Loop)
    const tickInterval = setInterval(() => {
      // Chỉ khi nào có luồng dữ liệu chờ xử lý
      if (pendingUpdates.current.length > 0) {
        
        // Hợp nhất (Batch) thông tin và tính tổng điểm 1 lần duy nhất trong chu kì 100ms
        setLeaderboard((prevBoard) => {
          const newBoard = { ...prevBoard };
          
          pendingUpdates.current.forEach((update) => {
            const playerId = update.p;
            const scoreDelta = update.s || 0;
            
            if (!newBoard[playerId]) {
              newBoard[playerId] = 0;
            }
            newBoard[playerId] += scoreDelta;
          });

          return newBoard;
        });

        // Hốt rác (Xóa hàng chờ sau khi đã xử lý xong kết quả khung hình hiện tại)
        pendingUpdates.current = [];
      }
    }, tickRateMs);

    return () => {
      clearInterval(tickInterval);
      channel.unsubscribe();
    };
  }, [roomId, tickRateMs]);

  return {
    leaderboard
  };
}
