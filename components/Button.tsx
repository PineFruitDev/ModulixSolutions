'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue focus-visible:ring-offset-2 focus-visible:ring-offset-dark-navy disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden',
  {
    variants: {
      variant: {
        primary: 'bg-blue-800 bg-gradient-to-r from-purple-800 to-blue-800 text-white hover:shadow-neon-purple hover:scale-105 active:scale-95',
        secondary: 'bg-blue-800 bg-gradient-to-r from-blue-800 to-cyan-800 text-white hover:shadow-neon-blue hover:scale-105 active:scale-95',
        outline: 'border border-purple-300 text-purple-300 hover:bg-purple-300/10 hover:shadow-neon-purple',
        ghost: 'text-gray-300 hover:text-white hover:bg-white/5',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-6',
        lg: 'h-14 px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface NeonButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  external?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<NeonButtonProps> = ({
  children,
  className,
  variant,
  size,
  disabled = false,
  onClick,
  type = 'button',
  href,
  external = false,
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const buttonClasses = buttonVariants({ variant, size, className });

  const buttonContent = (
    <>
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-0 bg-gradient-to-r from-purple-600 to-blue-600"
        whileHover={{ opacity: 0.2 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
      </span>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        whileHover={{
          translateX: '200%',
          transition: { duration: 0.6, ease: "easeInOut" }
        }}
      />
    </>
  );

  if (href) {
    if (external) {
      return (
        <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          {...props}
        >
          {buttonContent}
        </motion.a>
      );
    }

    return (
      <Link href={href} passHref legacyBehavior>
        <motion.a
          className={buttonClasses}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          {...props}
        >
          {buttonContent}
        </motion.a>
      </Link>
    );
  }

  return (
    <motion.button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
};

export default Button;