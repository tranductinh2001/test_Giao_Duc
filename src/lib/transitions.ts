// Framer Motion transition presets

export const transitions = {
  // Spring transitions for natural feel
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 24,
  },
  springBouncy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 15,
  },
  springStiff: {
    type: 'spring' as const,
    stiffness: 700,
    damping: 30,
  },

  // Tween transitions for precise timing
  smooth: {
    type: 'tween' as const,
    duration: 0.3,
    ease: 'easeInOut' as const,
  },
  snappy: {
    type: 'tween' as const,
    duration: 0.15,
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  },
  gentle: {
    type: 'tween' as const,
    duration: 0.5,
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  },
};

// Stagger configurations for list animations
export const staggerConfig = {
  fast: {
    staggerChildren: 0.05,
    delayChildren: 0.1,
  },
  medium: {
    staggerChildren: 0.08,
    delayChildren: 0.15,
  },
  slow: {
    staggerChildren: 0.12,
    delayChildren: 0.2,
  },
};
