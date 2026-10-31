import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Inter, Lato } from 'next/font/google';
import { MotionConfig } from 'framer-motion';
import ErrorBoundary from '../components/ErrorBoundary';
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
      {/* Site-wide head: these are identical on every page, so they live here
          instead of being repeated (and eventually forgotten) per page.
          Per-page titles, descriptions, canonicals and cards come from <Seo>. */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A0B18" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="128x128" href="/modulix-icon-128.png" />
        <link rel="apple-touch-icon" href="/modulix-icon-128.png" />
      </Head>

      <div className={`${inter.variable} ${lato.variable} ${inter.className}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        {/* Inside the font wrapper so the fallback keeps the site's typography,
            and inside the skip link so that target survives a render error. */}
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </div>
    </MotionConfig>
  );
}
