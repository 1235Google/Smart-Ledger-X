import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export interface PageTransitionWrapperProps {
  children: React.ReactNode;
  /** Optional custom key to trigger transition. Defaults to current route pathname */
  routeKey?: string;
  /** Optional container class names */
  className?: string;
}

// Cubic bezier for natural, responsive feel with zero layout jank (iOS-like deceleration)
const TRANSITION_EASE = [0.22, 1, 0.36, 1] as const;
const EXIT_EASE = [0.4, 0, 1, 1] as const;

// GPU-accelerated variants strictly using transform and opacity (no layout recalculations or blur filters)
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: {
      duration: 0.15,
      ease: EXIT_EASE,
    },
  },
};

/**
 * PageTransitionWrapper
 * Uses framer-motion AnimatePresence to orchestrate smooth, GPU-accelerated
 * entry and exit animations across route transitions.
 */
export function PageTransitionWrapper({
  children,
  routeKey,
  className = 'w-full relative',
}: PageTransitionWrapperProps) {
  const location = useLocation();
  const activeKey = routeKey ?? location.pathname;
  const [isTransitioning, setIsTransitioning] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onAnimationStart={() => setIsTransitioning(true)}
        onAnimationComplete={() => setIsTransitioning(false)}
        style={{
          transform: 'translate3d(0, 0, 0)', // Force GPU hardware acceleration
          contain: 'content', // CSS containment to prevent reflow cascading to parent layouts
        }}
        className={`${className} ${isTransitioning ? 'will-change-transform will-change-opacity' : ''}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransitionWrapper;
