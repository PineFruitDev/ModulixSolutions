import React from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import Header from '../Header';
import Footer from '../Footer';
import ParticleBackground from '../ParticleBackground';
import Container from '../Container';

interface StatusPageProps {
  /** Document title and the basis for the social card title. */
  pageTitle: string;
  metaDescription: string;
  canonical?: string;
  robots?: string;
  icon: LucideIcon;
  heading: string;
  /** Body copy explaining what happened and what the visitor can do next. */
  children: React.ReactNode;
  /** One or more ways out. Every status page must offer at least one. */
  actions: React.ReactNode;
}

/**
 * Shared shell for the terminal pages (not found, server error, confirmation).
 * Holding the chrome, meta tags and entrance animation in one place is what
 * keeps those pages from drifting apart as they get edited separately.
 */
export default function StatusPage({
  pageTitle,
  metaDescription,
  canonical,
  robots = 'noindex, follow',
  icon: Icon,
  heading,
  children,
  actions,
}: StatusPageProps) {
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="robots" content={robots} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {canonical && <link rel="canonical" href={canonical} />}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content="https://modulixsolutions.com/og-image.jpg" />
        {canonical && <meta property="og:url" content={canonical} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content="https://modulixsolutions.com/og-image.jpg" />
      </Head>

      {/* min-h-screen rather than h-screen: the content grows with the longest
          translation, the largest default font size and the extra links. */}
      <div className="min-h-screen bg-darkest-navy relative flex flex-col">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <ParticleBackground />
        </div>
        <div className="hex-overlay" aria-hidden="true"></div>

        <div className="relative z-10 flex flex-col flex-1">
          <Header simple={true} />

          {/* id="main" is the skip link's target. */}
          <main
            id="main"
            className="relative z-10 flex-1 flex items-center justify-center px-4 py-20 md:pt-32"
          >
            <Container className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center max-w-4xl mx-auto"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 100 }}
                  className="mb-8"
                >
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyber-blue to-neon-purple rounded-full flex items-center justify-center shadow-2xl shadow-cyber-blue/30">
                    <Icon className="w-16 h-16 text-white" aria-hidden="true" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-4xl md:text-6xl font-bold mb-6"
                >
                  {heading}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto"
                >
                  {children}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="flex flex-wrap items-center justify-center gap-4"
                >
                  {actions}
                </motion.div>
              </motion.div>
            </Container>
          </main>

          <Footer />
        </div>
      </div>
    </>
  );
}
