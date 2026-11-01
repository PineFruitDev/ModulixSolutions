import React from 'react';
import { m } from 'framer-motion';

interface LoadingScreenProps {
  isLoading: boolean;
}

export default function LoadingScreen({ isLoading }: LoadingScreenProps) {
  if (!isLoading) return null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { scale: 0, opacity: 0 },
    show: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 10,
        stiffness: 100,
      },
    },
  };

  const hexagons = Array.from({ length: 24 }, (_, i) => i);

  return (
    <m.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isLoading ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="loading-screen"
    >
      <div className="text-center">
        <m.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold logo-font text-cyber-blue mb-8"
        >
          MODULIX
        </m.h1>

        <m.div
          variants={container}
          initial="hidden"
          animate="show"
          className="loading-grid"
        >
          {hexagons.map((index) => (
            <m.div
              key={index}
              variants={item}
              className="w-4 h-4 bg-gradient-to-r from-cyber-blue to-neon-purple rounded-sm opacity-60"
              style={{
                clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
              }}
            />
          ))}
        </m.div>

        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-gray-400 text-sm"
        >
          Loading experience...
        </m.p>
      </div>
    </m.div>
  );
}
