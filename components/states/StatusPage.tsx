import React from 'react';
import { m } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import Header from '../Header';
import Footer from '../Footer';
import ParticleBackground from '../ParticleBackground';
import Container from '../Container';
import Seo from '../Seo';

interface StatusPageProps {
  /** Document title and the basis for the social card title. */
  pageTitle: string;
  metaDescription: string;
  /** Exported path of this page, used for its canonical URL and og:url. */
  path: string;
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
  path,
  robots = 'noindex, follow',
  icon: Icon,
  heading,
  children,
  actions,
}: StatusPageProps) {
  return (
    <>
      {/* noindex keeps these out of search results; the self-referencing
          canonical is inert alongside it and gives the social card a complete
          URL, which these pages previously shipped without. */}
      <Seo
        title={pageTitle}
        description={metaDescription}
        path={path}
        robots={robots}
      />

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
              <m.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center max-w-4xl mx-auto"
              >
                <m.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 100 }}
                  className="mb-8"
                >
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyber-blue to-neon-purple rounded-full flex items-center justify-center shadow-2xl shadow-cyber-blue/30">
                    <Icon className="w-16 h-16 text-white" aria-hidden="true" />
                  </div>
                </m.div>

                <m.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-4xl md:text-6xl font-bold mb-6"
                >
                  {heading}
                </m.h1>

                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto"
                >
                  {children}
                </m.div>

                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="flex flex-wrap items-center justify-center gap-4"
                >
                  {actions}
                </m.div>
              </m.div>
            </Container>
          </main>

          <Footer />
        </div>
      </div>
    </>
  );
}
