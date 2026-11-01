'use client';

import React, { useEffect, useRef } from 'react';

/** Particles closer than this get a connecting line drawn between them. */
const LINK_DISTANCE = 150;
const LINK_DISTANCE_SQUARED = LINK_DISTANCE * LINK_DISTANCE;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (motionQuery?.matches) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;
    const context = ctx;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Handled synchronously on purpose. Deferring this into requestAnimationFrame
    // to "coalesce" it was tried and reverted: resize already fires at most once
    // per rendering update, and the animation callback is registered first, so a
    // queued resize ran after the frame had been drawn and cleared it, blanking
    // the canvas for the length of a window drag.
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles: Particle[] = [];
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 15 : 50;
    const colors = ['#00D4FF', '#A855F7', '#FFFFFF'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame = 0;
    let running = true;

    const animate = () => {
      if (!running || document.hidden) {
        frame = requestAnimationFrame(animate);
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      // Indexed loops rather than forEach/slice. The old inner pass called
      // particles.slice(index + 1), which allocated a fresh array for every
      // particle on every frame: 50 throwaway arrays per frame, ~3000 a second,
      // all of it garbage for the collector to walk.
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.globalAlpha = 0.6;
        context.fill();
      }

      // Links are a second pass so the fill style is set once rather than
      // being swapped back and forth between dots and lines.
      context.strokeStyle = '#00D4FF';
      context.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const otherParticle = particles[j];
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distanceSquared = dx * dx + dy * dy;

          // Compared squared, so the ~1200 pairs a frame skip Math.sqrt
          // entirely; the root is only needed for the ones that actually draw.
          if (distanceSquared >= LINK_DISTANCE_SQUARED) continue;

          const distance = Math.sqrt(distanceSquared);

          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(otherParticle.x, otherParticle.y);
          context.globalAlpha = (LINK_DISTANCE - distance) / LINK_DISTANCE * 0.2;
          context.stroke();
        }
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="particles-canvas" aria-hidden="true" />;
}
