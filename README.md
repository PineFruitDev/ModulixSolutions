# Modulix Solutions

[![Live Demo](https://img.shields.io/badge/Live%20Demo-modulixsolutions.com-blue)](https://modulixsolutions.com)
[![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red)](#license)

A modern, immersive website for Modulix Solutions LLC - Discord community solutions company specializing in authentic engagements and gaming integrations.

---

## 📝 Repository Note

This repository is **public only because GitHub Pages requires public repositories for hosting**. This is not an open source project and contributions are not accepted. The code is provided for portfolio demonstration purposes only.

- **No contributions** will be accepted
- **No issues or pull requests** should be opened
- **Code reuse** is not permitted

---

## ✨ Features

- **Responsive Design** - Optimized for all devices
- **Smooth Animations** - Framer Motion with scroll-triggered effects, paused when reduced motion is requested
- **Interactive Effects** - Particle background
- **Modern UI/UX** - Dark theme with neon cyber/gaming accents
- **Accessible** - Skip link, landmarks, named controls, keyboard FAQ, and contrast-safe text
- **Performance Optimized** - Self-hosted variable fonts, lossless WebP images, a framer-motion feature set trimmed to what is used, and a hero that paints without waiting on animation
- **Visibility Assets** - Static `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` for search and answer engines
- **Hardened Delivery** - Content Security Policy, Referrer-Policy, nosniff, Permissions-Policy and framing refusal, generated from one module and enforced in the browser suite
- **Type Safe** - Full TypeScript implementation

## 🛠 Tech Stack

- **Framework**: Next.js 14, React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Yup

### Project Structure
```
modulix-solutions/
├── components/          # Reusable React components
├── pages/              # Next.js pages (_app.tsx, index.tsx)
├── public/             # Static assets plus SEO/AEO/GEO visibility files
├── styles/             # Global CSS and Tailwind config
├── out/                # Generated static files (after build)
└── .github/workflows/  # GitHub Actions for deployment
```

---

## ⚡ Front-end Weight

`npm run build && npm run perf` prints the numbers that decide the first paint,
read straight off `.next/` and `out/`: First Load JS per route, render-blocking
CSS and `@font-face` count, preloaded font bytes, parser-blocking scripts,
image weight split by eager versus lazy, images missing `width`/`height`, and
any asset published but referenced by no built page. `npm run perf -- --json`
emits the same data for a script to read.

It reports; it does not gate. The command always exits 0 and CI does not run
it, so a regression shows up when someone looks. Wiring a budget threshold
into the Tests workflow would be the obvious next step and has not been done.

It is deliberately not a Lighthouse run. Lighthouse scores move by several
points between runs on identical bytes, so they cannot tell a regression from
noise; these are the inputs Lighthouse measures, counted exactly, so two runs
of one commit agree and a before/after is a diff of the output.

The decisions it is measuring:

- **Fonts.** Inter loads as the variable font Google actually serves, with no
  `weight` list. Listing weights fetched no extra files; it repeated the same
  seven subset faces once per weight, 28 `@font-face` rules in the
  render-blocking stylesheet instead of 7. Lato keeps `weight: '700'`, having
  no variable version.
- **Images.** The client marks are lossless WebP, re-encoded from interlaced
  PNGs that cost three times as much for the same pixels. They are `lazy` and
  `decoding="async"`; the header wordmark is deliberately eager, being the only
  image above the fold.
- **Scripts.** Next already emits every bundle with `defer`, so there was
  nothing parser-blocking to fix. The report counts them so the claim can be
  rechecked rather than assumed, and currently prints zero on every page.
- **Bundle.** Components animate with framer-motion's `m` plus an explicit
  `domAnimation` feature set in `pages/_app.tsx`. Importing `motion` registers
  every feature eagerly, including the layout projection engine, which nothing
  here uses. `LazyMotion` is `strict`, so a stray `motion.*` is a development
  error rather than a silent 10 kB.

`tests/unit/perf-budget.test.tsx` pins the parts visible in the source, and
`tests/smoke/motion-features.spec.ts` is the only thing that catches a broken
feature set, since a missing provider leaves the page blank without throwing.

---

## 🔒 Security Headers

`lib/security-headers.ts` is the only definition of the policy. Two things are
generated from it, because the site has two possible delivery paths:

- `public/_headers`, the full header set, read by Cloudflare Pages and Netlify
  style hosts. Being a real response header, it is the only path that can carry
  `frame-ancestors`, `X-Content-Type-Options`, `Permissions-Policy` or HSTS.
- a `<meta http-equiv="Content-Security-Policy">` and a referrer meta in
  `pages/_document.tsx`. This is the only path that does anything on GitHub
  Pages, which is where the site is deployed today and which serves static
  files with no way to configure a response header.

**Known gap:** on GitHub Pages, `_headers` is ignored, so the directives that
exist only as headers are not applied. In practice that means the CSP (minus
`frame-ancestors`) and the referrer policy are enforced, while
`X-Content-Type-Options`, `Permissions-Policy`, HSTS and framing refusal are
not. Closing it needs a host that honours `_headers`; the file is already
correct for that move. It is recorded here rather than left to look covered.

The policy allows only what the built output was checked to need:
`script-src 'self'` with no `'unsafe-inline'` (the only inline scripts are the
non-executable `__NEXT_DATA__` and JSON-LD blocks), `style-src` with it
(Framer Motion's server-rendered initial values are inline `style` attributes),
first-party fonts and images plus `data:`, and `connect-src` naming the contact
form endpoint. `tests/unit/security-headers.test.tsx` byte-compares
`public/_headers` against the generator, and
`tests/smoke/security-headers.spec.ts` loads the export in Chromium with the
policy enforced and fails on any violation report.

---

## 📄 License

© 2025 Modulix Solutions LLC. All rights reserved.
