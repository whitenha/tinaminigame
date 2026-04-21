'use client';

import React from 'react';
import PodiumScreen from '@/components/Multiplayer/PodiumScreen';

export default function MockPodiumPage() {
  const mockLeaderboard = [
    { id: '1', player_name: 'Minh Thúy', avatar_emoji: '/avatars/avatar_1.png', score: 24500 },
    { id: '2', player_name: 'Hoàng Bách', avatar_emoji: '/avatars/avatar_4.png', score: 22100 },
    { id: '3', player_name: 'Như Quỳnh', avatar_emoji: '/avatars/avatar_3.png', score: 21850 },
    { id: '4', player_name: 'Quang Đại', avatar_emoji: '/avatars/avatar_6.png', score: 19500 },
    { id: '5', player_name: 'Bảo Trâm', avatar_emoji: '/avatars/avatar_8.png', score: 18200 }
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#130f40' }}>
      <PodiumScreen 
        leaderboard={mockLeaderboard} 
        myPlayerId="1"
        onRematch={() => alert('Bấm chơi lại!')}
        onExit={() => alert('Bấm thoát!')}
      />
    </div>
  );
}
