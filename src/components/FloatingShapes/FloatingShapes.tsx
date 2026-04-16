'use client';

import { useEffect, useState } from 'react';

const shapes = [
  { emoji: '⭐', size: 24, duration: 15, delay: 0 },
  { emoji: '🔵', size: 18, duration: 20, delay: 2 },
  { emoji: '🟡', size: 20, duration: 18, delay: 4 },
  { emoji: '💜', size: 16, duration: 22, delay: 1 },
  { emoji: '🔺', size: 22, duration: 16, delay: 3 },
  { emoji: '🟢', size: 14, duration: 25, delay: 5 },
  { emoji: '🧡', size: 18, duration: 19, delay: 6 },
  { emoji: '✨', size: 20, duration: 17, delay: 2.5 },
];

export default function FloatingShapes() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {shapes.map((shape, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            fontSize: shape.size,
            left: `${10 + (i * 12) % 80}%`,
            top: `${5 + (i * 17) % 70}%`,
            animation: `float ${shape.duration}s ease-in-out infinite`,
            animationDelay: `${shape.delay}s`,
            opacity: 0.12,
          }}
        >
          {shape.emoji}
        </div>
      ))}
    </div>
  );
}
