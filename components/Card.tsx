import React from 'react';
import { m } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glowColor?: 'blue' | 'purple' | 'mixed';
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = '',
  hover = true,
  glowColor = 'blue',
  onClick,
  onMouseEnter,
  onMouseLeave
}: CardProps) {
  const glowClasses = {
    blue: 'hover:shadow-cyber-blue/20',
    purple: 'hover:shadow-neon-purple/20',
    mixed: 'hover:shadow-cyber-blue/10 hover:shadow-neon-purple/10'
  };

  const borderClasses = {
    blue: 'border-cyber-blue/20',
    purple: 'border-neon-purple/20',
    mixed: 'border-cyber-blue/20'
  };

  return (
    <m.div
      whileHover={hover ? { y: -5, scale: 1.02 } : {}}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        bg-deeper-blue/50 backdrop-blur-sm border ${borderClasses[glowColor]} rounded-lg p-6
        ${hover ? `card-hover ${glowClasses[glowColor]}` : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </m.div>
  );
}

export function SectionContainer({
  children,
  className = ''
}: SectionContainerProps) {
  return (
    <div className={`
      bg-deeper-blue/50 backdrop-blur-sm border border-cyber-blue/20 rounded-lg p-6
      ${className}
    `}>
      {children}
    </div>
  );
}
