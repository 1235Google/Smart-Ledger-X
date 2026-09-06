import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface AnimatedPageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
}

const pageVariants = {
  initial: { opacity: 0, y: 15, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' }
};

const staggerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  },
  exit: {}
};

export const AnimatedPage: React.FC<AnimatedPageProps> = ({
  children,
  className = '',
  delay = 0,
  stagger = false,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger ? staggerVariants : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn('w-full', className)}
      {...(props as any)}
    >
      {stagger ? children : (
        <motion.div variants={pageVariants} className="w-full">
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

export const AnimatedPageSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const shouldReduceMotion = useReducedMotion();
  
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div variants={pageVariants} className={className}>
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
