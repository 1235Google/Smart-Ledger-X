import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface EnterpriseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const EnterpriseCard: React.FC<EnterpriseCardProps> = ({
  children,
  className = '',
  delay = 0,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'enterprise-card p-6 transition-all duration-200',
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
};

export default EnterpriseCard;
