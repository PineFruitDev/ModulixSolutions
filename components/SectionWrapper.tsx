import React from 'react';
import { m } from 'framer-motion';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  reveal?: boolean;
  /**
   * id of the heading that names this section.
   *
   * A bare `<section>` is not a landmark. Assistive technology only exposes it
   * as a `region` once it has an accessible name, so without this the sections
   * are invisible to the rotor and "jump to next landmark" skips the whole
   * page body. Pointing at the heading already on screen names them without
   * inventing duplicate label text.
   */
  labelledBy?: string;
}

export default function SectionWrapper({
  children,
  className = '',
  id,
  reveal = true,
  labelledBy,
}: SectionWrapperProps) {
  if (!reveal) {
    return (
      <section id={id} aria-labelledby={labelledBy} className={`relative ${className}`}>
        {children}
      </section>
    );
  }

  return (
    <m.section
      id={id}
      aria-labelledby={labelledBy}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`relative ${className}`}
    >
      {children}
    </m.section>
  );
}
