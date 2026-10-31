import React from 'react';
import { motion } from 'framer-motion';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  reveal?: boolean;
}

export default function SectionWrapper({
  children,
  className = '',
  id,
  reveal = true,
}: SectionWrapperProps) {
  if (!reveal) {
    return (
      <section id={id} className={`relative ${className}`}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`relative ${className}`}
    >
      {children}
    </motion.section>
  );
}
