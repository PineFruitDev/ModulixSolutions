# ModulixSolutions runbook

Run commands from the repository root. This guide targets the current upstream
`main` static-export application; it does not assume the changes in open PR #3
have landed. No credentials or environment values are needed for these local checks.
Never put secrets in source, command output, screenshots, or PR evidence.

## Install and build

The Pages workflow specifies Node 20. Local verification on 2026-11-01 used
Node 22.22.3, npm 11.17.0, and Python 3.15.0; this is not a Node 20 CI result.
Python is needed only for the static preview below.

```sh
node --version
npm --version
python3 --version
npm ci --ignore-scripts
npm run type-check
NEXT_TELEMETRY_DISABLED=1 npm run build
```

The lockfile controls installation. Ignoring install lifecycle scripts worked for
this baseline. Next.js `output: 'export'` writes the deployable site to `out/`.
The build generated `/`, `/404`, and `/contact-confirmed` successfully.
Do not use the legacy export script: Next 14 exports as part of the build.
The start script is for a Next server and is unsuitable for this export configuration.

## Local preview

For editing, start the development server:

```sh
NEXT_TELEMETRY_DISABLED=1 npm run dev -- --hostname 127.0.0.1 --port 4317
```

For the built site, after a successful build, start this in a separate terminal:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory out
```

Open http://127.0.0.1:4317 for development or http://127.0.0.1:4173 for the export.
Stop each server with Ctrl-C. Both bind only to loopback. Python's server is a
local file preview; it does not emulate hosting headers or custom 404 routing.
Do not submit real contact data during checks.

## Tests and checks

Type checking and the production build above are the available automated checks
on this baseline. These smoke commands must print `200` and exit successfully
while the corresponding servers are running:

```sh
curl --fail --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:4317/
curl --fail --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:4173/
curl --fail --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:4173/contact-confirmed/
```

There is no test script or committed automated test suite on this baseline.
Invoking npm's test command was checked and returned `Missing script: "test"`.
The lint script was also checked: without an ESLint configuration it prompts for
setup, so it is not a passing lint gate. PR #3 owns the CI/README work; reassess
these gaps when it lands. HTTP smoke checks do not prove visual, keyboard,
contact-delivery, accessibility, or production behavior. Manually inspect the
home page, navigation, narrow layout, and contact validation without sending data.

## Troubleshooting

- **Install fails:** check registry connectivity and Node/npm versions. Retry the
  documented clean install; it replaces dependencies without changing the lockfile.
  Do not delete the lockfile or apply forced dependency upgrades as a repair.
- **Dependency warnings:** the verified install reported 16 affected packages
  (3 moderate, 12 high, 1 critical). This is not a clean security audit; handle
  dependency remediation separately. Never paste registry credentials into reports.
- **Type/build errors:** preserve the first file/line diagnostic, correct the source,
  then rerun type checking and build. A successful build is not a standalone lint pass.
- **Stale browser-data warnings:** baseline build warned about Browserslist and
  baseline-browser-mapping data but completed. Dependency updates belong in a
  separate reviewed change.
- **Port in use:** port 3000 was occupied during verification. Use the documented
  port 4317, or choose another free local port and adjust the smoke URL. Do not
  stop an unknown process.
- **Missing preview pages:** build first and serve `out/` from the repository root.
  Use trailing-slash URLs. Stop development before rebuilding to avoid concurrent
  writes to `.next/`.

## Rollback procedure

1. Identify the bad change and last known-good revision using the repository's
   commit/PR history and the successful Pages deployment record. Preserve any
   uncommitted work; do not reset or force-push shared history.
2. Prepare a revert of the offending commit(s) on a dedicated repair branch,
   reviewing merge commits carefully. Open a rollback PR against `main`.
3. Run the install, type-check, build, and local preview checks above on that
   candidate. Confirm the diff reverses only the intended behavior.
4. Have the release owner approve the rollback. The existing Pages workflow runs
   on pushes to `main`; merging is therefore a production-affecting action.
   An authorized release owner can instead restore a known-good artifact through
   the hosting workflow if supported, recording its revision and deployment ID.
5. After an authorized release, verify the live routes and record the outcome.

Rollback is an operational procedure, not a command exercised against production
in this docs change. No merge, deployment, history rewrite on the remote, or live
rollback was performed. Local smoke evidence cannot establish production recovery.
