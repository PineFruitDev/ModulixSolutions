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
- **Performance Optimized** - Self-hosted fonts, sized images, and a hero that paints without waiting on animation
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

### Built-page link and image check

Run `npm ci`, `npm run build`, then `npm run check:pages` (Python 3.9+ required). CI runs the same check after the smoke suite builds the export. Every HTML file under `out/`, including error pages, is discovered automatically. Failures identify the source page and broken destination or image. Local links, same-site absolute URLs, fragments, and image `src` files are checked without network requests. External destinations are skipped. Every image must have an `alt` attribute; `alt=""` is allowed for decorative images. This checks attribute presence, not the quality of alternative text or dynamically inserted content.
