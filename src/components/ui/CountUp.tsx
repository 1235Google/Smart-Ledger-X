import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, useMotionValue, useReducedMotion } from 'motion/react';

interface CountUpProps {
  value: number;
  duration?: number; // Kept for API compatibility, but physics dictates timing now
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  formatter?: (val: number) => string;
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  formatter,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  
  // High-end spring physics (similar to Apple VisionOS/iOS counters)
  const springValue = useSpring(motionValue, { 
    damping: 30, 
    stiffness: 150, 
    mass: 0.8,
    restDelta: 0.001 
  });

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue, shouldReduceMotion]);

  const display = useTransform(shouldReduceMotion ? motionValue : springValue, (current) => {
    return formatter 
      ? formatter(current) 
      : `${prefix}${current.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
  });

  return <motion.span className={className}>{display}</motion.span>;
};

export default CountUp;
