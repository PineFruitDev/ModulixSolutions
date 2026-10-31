# Modulix Solutions

[![Live Demo](https://img.shields.io/badge/Live%20Demo-modulixsolutions.com-blue)](https://modulixsolutions.com)
[![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red)](#license)

Marketing site for Modulix Solutions LLC. The company builds community, creator, and user-generated content products across the UGC space.

---

## Repository note

This repository is **public only because GitHub Pages requires a public repository**. This is not an open source project.

- **No contributions** will be accepted
- **No issues or pull requests** should be opened
- **Code reuse** is not permitted

---

## Setup

Requires Node.js 22 and npm. Pull-request checks use the same Node version.

```bash
npm ci
npm run dev
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| Dev server | `npm run dev` | Next.js in development |
| Lint | `npm run lint` | ESLint via `next lint` |
| Typecheck | `npm run type-check` | `tsc --noEmit` |
| Unit tests | `npm test` | Jest component tests |
| Watch tests | `npm run test:watch` | Jest in watch mode |
| Production build | `npm run build` | Static export into `out/` |
| Browser smoke | `npm run test:smoke` | Build, then Playwright against `out/` |
| Start | `npm start` | `next start` (the published site is the static export, not this server) |
| Legacy export | `npm run export` | `next build && next export` (build already exports) |
| Manual publish | `npm run deploy` | Push `out/` with `gh-pages` |

`npm run deploy` needs a GitHub credential on the machine that runs it. The production path does not use that script.

## Deployment

`next.config.js` sets `output: 'export'`, so `npm run build` writes a static site to `out/`.

A push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). That workflow installs dependencies, builds, and deploys `out/` to GitHub Pages with the built-in `GITHUB_TOKEN`. It does not use repository secrets. The live site is [https://modulixsolutions.com](https://modulixsolutions.com).

Pull requests run [`.github/workflows/test.yml`](.github/workflows/test.yml): lint, typecheck, unit tests, production build, then browser smoke tests against `out/`. That workflow does not deploy and does not use secrets.

## Project structure

```
├── components/          # React components
├── pages/               # Next.js pages
├── public/              # Static assets and crawl files
├── styles/              # Global CSS
├── tests/               # Jest unit tests and Playwright smoke tests
├── scripts/             # Repo checks (foundation drift)
├── out/                 # Static export (generated, not committed)
└── .github/workflows/   # PR checks and Pages deploy
```

---

## License

© 2026 Modulix Solutions LLC. All rights reserved.
