import React from 'react';

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
} as const;

interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

/**
 * Decorative progress ring. The surrounding status region owns the announced
 * text, so this is hidden from assistive technology. Users who ask for reduced
 * motion get the static ring instead of the rotation.
 */
export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block flex-shrink-0 rounded-full border-cyber-blue/30 border-t-cyber-blue animate-spin motion-reduce:animate-none ${sizeClasses[size]} ${className}`}
    />
  );
}
