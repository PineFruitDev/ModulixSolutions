import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Container from './Container';

interface HeaderProps {
  simple?: boolean;
}

export default function Header({ simple = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fullNavItems = [
    { name: 'Home', href: '#hero' },
    { name: 'About', href: '#about' },
    { name: 'Bot', href: '#modulix-bot' },
    { name: 'Services', href: '#services' },
    { name: 'Contact', href: '#contact' },
    { name: 'FAQ', href: '#faq' }
  ];

  const simpleNavItems = [
    { name: 'Home', href: '/' }
  ];

  const navItems = simple ? simpleNavItems : fullNavItems;

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      // Anchor link for same page scrolling
      const element = document.querySelector(href);
      if (element) {
        // Calculate header offset for desktop (hidden on mobile)
        const isDesktop = window.innerWidth >= 768; // md breakpoint
        const headerElement = document.querySelector('header');
        const headerOffset = isDesktop && headerElement ? headerElement.offsetHeight : 0; // Header height only

        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        // Ultra-smooth scrolling with custom easing
        const startPosition = window.pageYOffset;
        const distance = offsetPosition - startPosition;
        const duration = Math.min(Math.abs(distance) * 0.8, 1000); // Dynamic duration based on distance, max 1s
        let startTime: number | null = null;

        const easeInOutCubic = (t: number): number => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const animation = (currentTime: number) => {
          if (startTime === null) startTime = currentTime;
          const timeElapsed = currentTime - startTime;
          const progress = Math.min(timeElapsed / duration, 1);

          const easeProgress = easeInOutCubic(progress);
          const currentPosition = startPosition + (distance * easeProgress);

          window.scrollTo(0, currentPosition);

          if (progress < 1) {
            requestAnimationFrame(animation);
          }
        };

        requestAnimationFrame(animation);
      }
    }
    // For regular links, let the browser handle navigation
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-dark-navy/80 backdrop-blur-md border-b border-cyber-blue/30 hidden md:flex"
      >
        <Container className="py-4">
          <div className="flex items-center justify-between">
              <Link href="/">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <img src="/modulix-icon.png" alt="Modulix Icon" className="w-14 h-14 object-contain" />
                  <span className="text-4xl font-bold logo-font text-white">
                    MODULIX
                  </span>
                </motion.div>
              </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <motion.a
                    href={item.href}
                    key={item.name}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className={`text-white hover:text-cyber-blue transition-colors duration-300 ${item.name === 'Testimonials' ? 'hidden lg:block' : ''}`}
                  >
                    {item.name}
                  </motion.a>
                ) : (
                  <Link key={item.name} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-white hover:text-cyber-blue transition-colors duration-300 cursor-pointer"
                    >
                      {item.name}
                    </motion.div>
                  </Link>
                )
              ))}
            </nav>
          </div>
        </Container>
      </motion.header>

      {/* Floating Mobile Menu Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-4 right-4 z-40 md:hidden w-12 h-12 bg-dark-navy/90 backdrop-blur-md border border-cyber-blue/30 rounded-full flex items-center justify-center text-white hover:text-cyber-blue transition-colors duration-300 shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu */}
          <motion.nav
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] bg-dark-navy border-l border-cyber-blue/30 z-50 md:hidden flex flex-col"
          >
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-white hover:text-cyber-blue transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Navigation items */}
            <div className="flex-1 flex flex-col justify-center px-8 space-y-6">
              {navItems.map((item) => (
                item.href.startsWith('#') && item.name !== 'Testimonials' ? (
                  <motion.a
                    href={item.href}
                    key={item.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className="text-left text-xl text-white hover:text-cyber-blue transition-colors duration-300"
                  >
                    {item.name}
                  </motion.a>
                ) : (
                  <Link key={item.name} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-left text-xl text-white hover:text-cyber-blue transition-colors duration-300 cursor-pointer"
                    >
                      {item.name}
                    </motion.div>
                  </Link>
                )
              ))}
            </div>
          </motion.nav>
        </>
      )}
    </>
  );
}