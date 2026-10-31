import type { AppProps } from 'next/app';
import { Inter, Lato } from 'next/font/google';
import { MotionConfig } from 'framer-motion';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-inter',
});

const lato = Lato({
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
  adjustFontFallback: true,
  preload: true,
  variable: '--font-lato',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`${inter.variable} ${lato.variable} ${inter.className}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        <Component {...pageProps} />
      </div>
    </MotionConfig>
  );
}
