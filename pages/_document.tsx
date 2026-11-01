import { Html, Head, Main, NextScript } from 'next/document';

import { META_CSP, REFERRER_POLICY } from '../lib/security-headers';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/*
          GitHub Pages serves static files and offers no way to set a response
          header, so `public/_headers` does nothing on the live host and this
          markup is the only thing actually enforcing a policy there. On a host
          that does honour `_headers` these two are redundant with the header
          copies, which is harmless: a document meeting two policies has to
          satisfy both, and both are generated from `lib/security-headers.ts`.

          These are the first children of Head so that the policy is parsed
          before the stylesheet and font preloads Next appends after them.
          `Permissions-Policy` and `X-Content-Type-Options` have no markup
          equivalent and so remain header-only.
        */}
        <meta httpEquiv="Content-Security-Policy" content={META_CSP} />
        <meta name="referrer" content={REFERRER_POLICY} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
