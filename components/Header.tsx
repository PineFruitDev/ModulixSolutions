import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        const isDesktop = window.innerWidth >= 768;
        const headerElement = document.querySelector('.site-header');
        const headerOffset = isDesktop && headerElement instanceof HTMLElement ? headerElement.offsetHeight : 0;

        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        const startPosition = window.pageYOffset;
        const distance = offsetPosition - startPosition;
        const duration = Math.min(Math.abs(distance) * 0.8, 1000);
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
    setIsMenuOpen(false);
  };

  const linkClass = 'rounded-sm text-white hover:text-cyber-blue transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue';

  return (
    <header>
      <div className="site-header fixed top-0 left-0 right-0 z-50 bg-dark-navy/80 backdrop-blur-md border-b border-cyber-blue/30 hidden md:block">
        <Container className="py-4">
          <div className="flex items-center justify-between">
              <Link href="/" className={`${linkClass} flex items-center gap-3`}>
                  <img src="/modulix-icon-128.png" alt="" width={56} height={56} className="w-14 h-14 object-contain" />
                  <span className="text-4xl font-bold logo-font text-white">
                    MODULIX
                  </span>
              </Link>

            <nav aria-label="Primary" className="flex space-x-8">
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <a
                    href={item.href}
                    key={item.name}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className={linkClass}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href} className={linkClass}>
                    {item.name}
                  </Link>
                )
              ))}
            </nav>
          </div>
        </Container>
      </div>

      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls={isMenuOpen ? 'mobile-nav' : undefined}
        className="fixed top-4 right-4 z-40 md:hidden w-12 h-12 bg-dark-navy/90 backdrop-blur-md border border-cyber-blue/30 rounded-full flex items-center justify-center text-white hover:text-cyber-blue transition-colors duration-300 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue"
      >
        {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          <nav
            id="mobile-nav"
            aria-label="Primary"
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] bg-dark-navy border-l border-cyber-blue/30 z-50 md:hidden flex flex-col"
          >
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                className="text-white hover:text-cyber-blue transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue rounded-sm"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center px-8 space-y-6">
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <a
                    href={item.href}
                    key={item.name}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className={`text-left text-xl ${linkClass}`}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-left text-xl ${linkClass}`}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
