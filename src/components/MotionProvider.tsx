'use client';

import React from 'react';
import { LazyMotion, domMax, MotionConfig } from 'framer-motion';

/**
 * domMax (no domAnimation) porque el navbar y los tabs usan layoutId
 * para la pastilla deslizante — eso requiere animaciones de layout,
 * que domAnimation no incluye.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
