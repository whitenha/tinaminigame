'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TileTesterMockup = dynamic(
  () => import('./TileTesterMockup'),
  { ssr: false }
);

export default function TileTesterPage() {
  return <TileTesterMockup />;
}
