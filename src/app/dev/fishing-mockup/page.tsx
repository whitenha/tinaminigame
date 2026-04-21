'use client';

import dynamic from 'next/dynamic';

const FishingPlayerMockup = dynamic(() => import('@/games/fishing/FishingPlayerMockup'), { ssr: false });

export default function FishingMockupPage() {
  return (
    <div style={{ width: '100%', height: '100dvh', background: '#000' }}>
      <FishingPlayerMockup />
    </div>
  );
}
