# Dependency audit

Observed 2026-11-01T03:55:04.924Z against origin/main c7a1bdd. Registry results are a point-in-time inventory, not proof of exploitability.

Updated Next.js nested PostCSS to 8.5.32 and Next ESLint plugin glob to the compatible 10.5 series using narrowly scoped overrides. Direct dependencies already match npm wanted; no major upgrades or force fixes applied. Glob CVE-2025-64756 affects the CLI command option; this repository does not invoke it.

Remaining findings: {"info":0,"low":1,"moderate":35,"high":1,"critical":1,"total":38}. Counts include inherited dependency findings, not unique CVEs. Next.js remains critical in the registry. Source uses Pages Router, output: export and unoptimized images; exported hosting has no Next server/image optimizer/Server Actions. This reduces runtime exposure but does not make vulnerable packages safe for next start or dev servers. Major Next/ESLint migrations require separate compatibility work. Toolchain glob/minimatch denial of service and deepmerge prototype poisoning remain risks for untrusted build inputs; do not expose build tools as services. No exploit reproduction or deployed validation was performed.

## Remaining direct advisories

- deepmerge: **low**, [deepmerge mergeObject() allows prototype poisoning of returned objects](https://github.com/advisories/GHSA-gcqx-w48m-w2h4); affected >=4.2.0 <=4.3.1. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.
- glob: **moderate**, [Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4); affected >=9.0.0 <=14.0.1. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.
- minimatch: **moderate**, [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249); affected <11.0.1. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.
- next: **moderate**, [Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f); affected >=10.0.0 <15.5.10. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components](https://github.com/advisories/GHSA-h25m-26qc-wcjf); affected >=13.0.0 <15.0.8. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js: HTTP request smuggling in rewrites](https://github.com/advisories/GHSA-ggv3-7p47-pfv8); affected >=9.5.0 <15.5.13. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js: Unbounded next/image disk cache growth can exhaust storage](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8); affected >=10.0.0 <15.5.14. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js has a Denial of Service with Server Components](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3); affected >=13.0.0 <15.5.15. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js Vulnerable to Denial of Service with Server Components](https://github.com/advisories/GHSA-8h8q-6873-q5fj); affected >=13.0.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **low**, [Next.js's Middleware / Proxy redirects can be cache-poisoned](https://github.com/advisories/GHSA-3g8h-86w9-wvmq); affected >=12.2.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q); affected >=13.4.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **low**, [Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting](https://github.com/advisories/GHSA-vfv6-92ff-j949); affected >=13.4.6 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js has cross-site scripting in beforeInteractive scripts with untrusted input](https://github.com/advisories/GHSA-gx5p-jg67-6x7h); affected >=13.0.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js has a Denial of Service in the Image Optimization API](https://github.com/advisories/GHSA-h64f-5h5j-jqjh); affected >=10.0.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades](https://github.com/advisories/GHSA-c4j6-fc7j-m34r); affected >=13.4.13 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js vulnerable to cache poisoning in React Server Component responses](https://github.com/advisories/GHSA-wfc6-r584-vfw7); affected >=14.2.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n](https://github.com/advisories/GHSA-36qx-fr4f-26g5); affected >=12.2.0 <15.5.16. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-m99w-x7hq-7vfj); affected >=13.0.0 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js: Server-Side Request Forgery in Server Actions on custom servers](https://github.com/advisories/GHSA-89xv-2m56-2m9x); affected >=14.1.1 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js: Cache confusion of response bodies for requests with bodies](https://github.com/advisories/GHSA-68g3-v927-f742); affected >=13.0.0 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences](https://github.com/advisories/GHSA-4633-3j49-mh5q); affected >=13.0.0 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js: Unbounded Server Action payload in Edge runtime](https://github.com/advisories/GHSA-4c39-4ccg-62r3); affected >=13.0.0 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname](https://github.com/advisories/GHSA-p9j2-gv94-2wf4); affected >=12.0.0 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **moderate**, [Next.js: Unauthenticated disclosure of internal Server Function endpoints](https://github.com/advisories/GHSA-955p-x3mx-jcvp); affected >=13.0.0 <15.5.21. Major framework migration required; static-export exposure qualification above.
- next: **critical**, [Next.js: Unauthenticated Remote Code Execution on windows-hosted servers](https://github.com/advisories/GHSA-p293-qw3h-jr36); affected >=13.4.0 <15.5.24. Major framework migration required; static-export exposure qualification above.
- next: **critical**, [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4); affected >=10.0.0 <15.5.24. Major framework migration required; static-export exposure qualification above.
- next: **critical**, [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used](https://github.com/advisories/GHSA-2464-fhr4-w9xw); affected >=10.0.0 <=15.5.27. Major framework migration required; static-export exposure qualification above.
- next: **high**, [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r); affected >=13.0.0 <=15.5.27. Major framework migration required; static-export exposure qualification above.
- postcss: **moderate**, [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93); affected <8.5.10. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.
- postcss: **high**, [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q); affected <=8.5.11. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.
- postcss: **moderate**, [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp); affected <=8.5.22. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.
- postcss: **high**, [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849); affected <=8.5.17. Build/test toolchain exposure; compatible resolution did not eliminate this finding. Major transitive overrides deferred to avoid API breakage.

## Outdated direct packages

| Package | Installed / wanted | Latest | Deferred risk |
|---|---|---|---|
| @types/node | 20.19.43 / 20.19.43 | 26.6.6 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| @types/react | 18.3.31 / 18.3.31 | 19.3.0 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| @types/react-dom | 18.3.7 / 18.3.7 | 19.3.0 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| eslint | 8.57.1 / 8.57.1 | 10.14.0 | Outside declared semver range; migration may change APIs/configuration. Known advisories above. |
| eslint-config-next | 14.2.35 / 14.2.35 | 16.4.3 | Outside declared semver range; migration may change APIs/configuration. Known advisories above. |
| framer-motion | 10.18.0 / 10.18.0 | 14.9.0 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| lucide-react | 0.292.0 / 0.292.0 | 1.66.0 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| next | 14.2.35 / 14.2.35 | 16.4.3 | Outside declared semver range; migration may change APIs/configuration. Known advisories above. |
| react | 18.3.1 / 18.3.1 | 19.3.1 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| react-dom | 18.3.1 / 18.3.1 | 19.3.1 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| tailwindcss | 3.4.19 / 3.4.19 | 4.3.3 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |
| typescript | 5.9.3 / 5.9.3 | 7.0.2 | Outside declared semver range; migration may change APIs/configuration. No direct advisory in this audit; maintenance lag remains. |

## CI policy

Dependency audit runs independently on PRs and main pushes, including dev dependencies. Exact advisory URL, package, severity and affected range form the reviewed baseline. New or changed advisories and registry failures fail CI. Existing findings remain visible in the totals; this is a regression gate, not a clean audit claim. Review this inventory before enabling server hosting and during the next major framework migration. Baseline edits require risk review.

## Validation

Type-check and lint passed (existing lint warnings). Unit coverage: 152 passed, one pre-existing security-header generator mismatch failed. Open PR #13 already fixes that mismatch; no duplicate fix included. Application source and tests are unchanged from origin/main.

Production static build and the live registry CI audit gate passed locally. No deployment performed.

Playwright smoke checks: 42 passed (32.5s).
