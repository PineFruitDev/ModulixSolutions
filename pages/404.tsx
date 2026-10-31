import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, AlertTriangle } from 'lucide-react';

import Header from '../components/Header';
import Footer from '../components/Footer';
import ParticleBackground from '../components/ParticleBackground';
import Container from '../components/Container';
import Button from '../components/Button';

export default function Custom404() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, follow" />
        <meta property="og:type" content="website" />
        <title>404 Error - Page Not Found | Modulix Solutions</title>
        <meta name="description" content="Sorry, the page you're looking for doesn't exist. Return to Modulix Solutions for Discord community management and engagement solutions." />
        <meta property="og:title" content="404 Error - Page Not Found | Modulix Solutions" />
        <meta property="og:description" content="Sorry, the page you're looking for doesn't exist. Return to Modulix Solutions for Discord community management and engagement solutions." />
        <meta property="og:image" content="https://modulixsolutions.com/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="404 Error - Page Not Found | Modulix Solutions" />
        <meta name="twitter:description" content="Sorry, the page you're looking for doesn't exist. Return to Modulix Solutions for Discord community management and engagement solutions." />
        <meta name="twitter:image" content="https://modulixsolutions.com/og-image.jpg" />
      </Head>

      <div className="h-screen bg-darkest-navy relative overflow-hidden flex flex-col">
        <div className="absolute inset-0">
          <ParticleBackground />
        </div>
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{
          backgroundImage: "url('/hex-bg.png')",
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'fixed',
          WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 12.5%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0.3) 87.5%, rgba(0,0,0,0.5) 100%)',
          maskImage: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 12.5%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0.3) 87.5%, rgba(0,0,0,0.5) 100%)',
          opacity: 1
        }}></div>

        <div className="relative z-10 flex flex-col h-full">
          <Header simple={true} />

        <main className="relative z-10 flex-1 flex items-center justify-center px-4">
          <Container className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* 404 Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
                className="mb-8"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyber-blue to-neon-purple rounded-full flex items-center justify-center shadow-2xl shadow-cyber-blue/30">
                  <AlertTriangle className="w-16 h-16 text-white" />
                </div>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-4xl md:text-6xl font-bold mb-6"
              >
                404 Error - Page Not Found!
              </motion.h1>

              {/* Flavor Text */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto"
              >
                Looks like you've ventured into uncharted digital territory. This page seems to have gone the way of dial-up internet—lost in the void of cyberspace.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <Link href="/" passHref>
                  <Button size="lg" className="text-lg px-10 py-5">
                    <Home className="w-5 h-5 mr-2" />
                    Return to Homepage
                  </Button>
                </Link>
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
