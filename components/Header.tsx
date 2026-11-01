import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Container from './Container';

interface HeaderProps {
  simple?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Header({ simple = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

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

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  // The drawer, the overlay and both close affordances are all md:hidden, so a
  // resize past the breakpoint would otherwise strand the menu open and leave
  // the scroll lock applied with no way to release it (phone rotated to
  // landscape, no Escape key).
  useEffect(() => {
    if (!isMenuOpen || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia('(min-width: 768px)');
    if (query.matches) {
      setIsMenuOpen(false);
      return;
    }

    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMenuOpen(false);
    };

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }

    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, [isMenuOpen]);

  // The drawer covers the page, so keyboard focus has to be moved into it,
  // held there while it is open, and handed back to the toggle on close.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !drawer.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !drawer.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      // Returning focus to the toggle keeps the tab order where the user left it.
      const target = toggleRef.current ?? previouslyFocused;
      target?.focus();
    };
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
          // A click on the section the page already rests on gives a distance,
          // and so a duration, of zero. Dividing by it yields NaN, which the
          // browser normalises to a scroll offset of 0 and throws the reader
          // back to the top of the page. Treat it as already arrived.
          const progress = duration > 0 ? Math.min(timeElapsed / duration, 1) : 1;

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

  // A bare nav link is only as tall as its line box, which measured 24px. The
  // padding here takes it to 44px in both directions; "Bot", the shortest
  // label, was 25px wide.
  //
  // The horizontal padding has to come out of the row's gap rather than on top
  // of it. At 768px the bar had 67px of slack, and six links each gaining 24px
  // would have overrun it, so `space-x-8` drops to `space-x-1`: the same dead
  // space, now inside the targets instead of between them.
  const navLinkClass = `${linkClass} inline-flex items-center px-3 py-2.5`;

  // The drawer's links are text-xl, a 28px line box, and stretch the full
  // column, so they only need height. `space-y-6` already separates them.
  const drawerLinkClass = `${linkClass} flex items-center text-left text-xl py-2`;

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

            <nav aria-label="Primary" className="flex items-center space-x-1">
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <a
                    href={item.href}
                    key={item.name}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className={navLinkClass}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href} className={navLinkClass}>
                    {item.name}
                  </Link>
                )
              ))}
            </nav>
          </div>
        </Container>
      </div>

      {/*
        While the drawer is open it is modal and covers this toggle, so the
        toggle leaves the accessibility tree rather than duplicating the
        drawer's own "Close menu" control.
      */}
      <button
        type="button"
        ref={toggleRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls={isMenuOpen ? 'mobile-nav' : undefined}
        aria-hidden={isMenuOpen || undefined}
        tabIndex={isMenuOpen ? -1 : undefined}
        className="fixed top-4 right-4 z-40 md:hidden w-12 h-12 bg-dark-navy/90 backdrop-blur-md border border-cyber-blue/30 rounded-full flex items-center justify-center text-white hover:text-cyber-blue transition-colors duration-300 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue"
      >
        {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            id="mobile-nav"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] bg-dark-navy border-l border-cyber-blue/30 z-50 md:hidden flex flex-col"
          >
            <div className="flex justify-end p-4">
              {/* The glyph is 24px; the padding is what makes this a 44px
                  target, and it is the first thing focus lands on. */}
              <button
                type="button"
                ref={closeButtonRef}
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex items-center justify-center p-2.5 text-white hover:text-cyber-blue transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue rounded-sm"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 flex flex-col justify-center px-8 space-y-6">
              {navItems.map((item) => (
                item.href.startsWith('#') ? (
                  <a
                    href={item.href}
                    key={item.name}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.href);
                    }}
                    className={drawerLinkClass}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeMenu}
                    className={drawerLinkClass}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
