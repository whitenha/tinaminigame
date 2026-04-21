import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface UseMultiplayerStudentProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

export function useMultiplayerStudent({ roomId, playerId, playerName }: UseMultiplayerStudentProps) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId) return;

    // 1. Initialize channel for the specific room
    // ack: false có nghĩa là chế độ "Fire and Forget" để tối đa hóa tốc độ, không cần chờ Server xác nhận.
    const channel = supabase.channel(`room-${roomId}`, {
      config: {
        broadcast: { ack: false } 
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Joined multiplayer room:', roomId);
        // Có thể tích hợp Presence ở đây trong tương lai để báo cho Host biết học sinh đã vào Lobby
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, playerId, playerName]);

  // 2. Action method (Sử dụng song song với Optimistic UI)
  const broadcastScore = (scoreDelta: number, matchType: string = 'unknown') => {
    if (!channelRef.current) return;

    // Gửi đi gói tin dạng Data Delta (cực nhỏ)
    channelRef.current.send({
      type: 'broadcast',
      event: 'SCORE_UPDATE',
      payload: {
        p: playerId,   // Khóa rút gọn ID người chơi
        s: scoreDelta, // Delta: sự thay đổi điểm số
        t: matchType   // Thể loại hành động (ví dụ: 'PAIR_MATCH')
      }
    });

    // LƯU Ý CHO LẬP TRÌNH VIÊN: 
    // Trong file usePairingEngine của bạn, vẫn gọi setScore() như bình thường
    // Hành động gọi hàm broadcastScore() này chỉ nhằm mục báo cáo lên Tivi của Giáo viên một cách tức thì.
  };

  return {
    broadcastScore
  };
}
