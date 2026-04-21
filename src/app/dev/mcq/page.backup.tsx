'use client';

import React, { useState } from 'react';
import ActiveMultiplayerRoom from '@/components/Multiplayer/ActiveMultiplayerRoom';

export default function MockMCQPage() {
  const [timeLeft, setTimeLeft] = useState(20);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const mockItems = [
    {
      id: "q1",
      question: "Từ nào có nghĩa là 'Ủng hộ, tán thành (một chính sách hoặc quan điểm)'?",
      options: [
        { id: "o1", text: "Cynical", isCorrect: false },
        { id: "o2", text: "Exacerbate", isCorrect: false },
        { id: "o3", text: "Advocate", isCorrect: true },
        { id: "o4", text: "Jeopardize", isCorrect: false }
      ],
      timeLimit: 20
    }
  ];

  const mockActivity = {
    template_slug: "quiz"
  };

  const mockMp = {
    phase: 'playing',
    isHost: isHost,
    roomId: 'MOCK-1234',
    playerId: 'p1',
    myPlayer: {
      id: 'p1',
      player_name: 'Player 1',
      score: 1250,
      streak: 2,
      avatar_emoji: '/avatars/avatar_1.png'
    },
    players: [
      { id: 'h1', is_host: true, player_name: 'Host Teacher', is_online: true },
      ...Array.from({ length: 10 }).map((_, i) => ({
        id: `p${i + 1}`,
        is_host: false,
        player_name: `Người Chơi ${i + 1}`,
        is_online: true
      }))
    ],
    currentQuestion: 0,
    lastRoundPoints: Object.fromEntries(
      Array.from({ length: 10 }).map((_, i) => [`p${i + 1}`, 500])
    ),
    wrongGuesses: [],
    correctPlayers: Array.from({ length: 10 }).map((_, i) => ({
      id: `p${i + 1}`,
      name: `Người Chơi ${i + 1}`,
      avatar: `/avatars/avatar_${(i % 8) + 1}.png`,
      time: 5.2 + i * 0.1
    })),
    activeEffects: [],
    inventory: [],
    answeredThisQ: false,
    timerOffset: 0,
    roomSettings: {},
    // Mock functions
    hostStartGame: () => console.log('hostStartGame'),
    hostNextQuestion: () => console.log('hostNextQuestion'),
    hostEndGame: () => console.log('hostEndGame'),
    hostReturnToGrid: () => console.log('hostReturnToGrid'),
    submitAnswer: (ans: any) => console.log('submitAnswer', ans),
    usePowerUp: (idx: any) => console.log('usePowerUp', idx),
    broadcastEvent: (evt: any) => console.log('broadcastEvent', evt)
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9999, display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px' }}>
        <button onClick={() => setIsHost(!isHost)} style={{ padding: '4px 8px', borderRadius: '4px', background: isHost ? '#2ecc71' : '#e74c3c', color: 'white' }}>
          {isHost ? 'Host View' : 'Player View'}
        </button>
        <button onClick={() => setShowFeedback(!showFeedback)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#3498db', color: 'white' }}>
          Toggle Feedback
        </button>
        <button onClick={() => setTimeLeft(prev => prev > 0 ? prev - 5 : 20)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#f39c12', color: 'white' }}>
          Time: {timeLeft}s
        </button>
      </div>

      <ActiveMultiplayerRoom 
        mp={mockMp} 
        items={mockItems} 
        activity={mockActivity} 
        playerName="Player 1" 
      />
    </div>
  );
}
