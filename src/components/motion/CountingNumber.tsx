'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

interface CountingNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

export function CountingNumber({
  value,
  duration = 1.5,
  className,
}: CountingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isInView) {
      if (shouldReduceMotion) {
        // Skip animation, just set the value
        if (ref.current) {
          ref.current.textContent = String(value);
        }
      } else {
        motionValue.set(value);
      }
    }
  }, [isInView, value, motionValue, shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion) return;

    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toLocaleString('vi-VN');
      }
    });
  }, [springValue, shouldReduceMotion]);

  return <span ref={ref} className={className}>0</span>;
}
