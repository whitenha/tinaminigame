'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MazeChaseHostMockup = dynamic(
  () => import('@/games/mazechase/MazeChaseHostMockup'),
  { ssr: false }
);

export default function MazeHostPage() {
  return <MazeChaseHostMockup />;
}
