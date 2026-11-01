import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Inter, Lato } from 'next/font/google';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/globals.css';

/**
 * No `weight` on purpose. Inter ships from Google as a variable font covering
 * the whole 100-900 axis in one file, so naming the four weights the design
 * uses (400/500/600/700) did not fetch four files: it emitted the same seven
 * subset files four times over, 28 `@font-face` rules where 7 do the job, all
 * of it parsed in the render-blocking stylesheet before the first paint.
 *
 * Lato keeps its explicit weight because it has no variable version on Google
 * Fonts, so '700' there really does pick one static file. It is only used for
 * the wordmark (`.logo-font`), which is above the fold, hence the preload.
 */
const inter = Inter({
  subsets: ['latin'],
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

/**
 * `domAnimation` is the feature set this site actually uses: animation, exit,
 * and the inView / hover / focus / tap gestures. What it leaves out is `drag`
 * and `layout`, and `layout` is the expensive one, because it drags in
 * framer-motion's whole projection engine. Nothing here sets `drag`,
 * `layout`, `layoutId` or uses AnimatePresence, so none of it was ever
 * reachable: importing `motion` pulled it in regardless, since `motion` is a
 * proxy that registers every feature eagerly. Pairing `m` with an explicit
 * feature set is what lets webpack drop the rest.
 *
 * Loaded synchronously rather than through a dynamic import. The lazy form
 * splits these ~19 kB into their own chunk, but `m` elements render their
 * `initial` styles and do not animate until that chunk arrives, and almost
 * every section on the homepage opens at `opacity: 0` and reveals on
 * `whileInView`. A slow chunk would mean a visibly blank page, which is a bad
 * trade for bytes that are already in flight behind `defer`.
 *
 * `strict` makes a stray `motion.*` throw in development instead of silently
 * re-registering the features this is here to exclude.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
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
      </LazyMotion>
    </MotionConfig>
  );
}
