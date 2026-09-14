'use client';

import { useEffect } from 'react';
import { initCardTilt, initHero3D } from '@/lib/effects';

interface EffectsProps {
  cardCount?: number;
  includeHero?: boolean;
}

export default function Effects({ cardCount, includeHero = false }: EffectsProps) {
  // Card tilt: re-run when cardCount changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      initCardTilt();
    });
    return () => cancelAnimationFrame(raf);
  }, [cardCount]);

  // Hero 3D: run once
  useEffect(() => {
    if (includeHero) {
      const raf = requestAnimationFrame(() => {
        initHero3D();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [includeHero]);

  return null;
}
