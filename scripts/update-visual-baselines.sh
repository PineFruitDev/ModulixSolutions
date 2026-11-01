#!/usr/bin/env bash
#
# Regenerates the committed visual baselines.
#
# The baselines in tests/visual/__screenshots__/linux are Linux amd64 Chromium,
# because that is what the Tests workflow runs on. Generating them on a
# developer's machine instead would produce a set CI could never match:
# Chromium rasterises text and gradients through the host's graphics and font
# stack, and the gap between macOS and Linux there is far wider than the
# per-pixel tolerance in playwright.visual.config.ts.
#
# So the suite runs inside Microsoft's Playwright image, pinned to the version
# resolved in package-lock.json so the browser build matches the one
# `npx playwright install` puts on the runner, and forced to linux/amd64 so an
# Apple Silicon machine does not quietly produce arm64 output.
#
# Any extra arguments are passed through to Playwright, so a single baseline
# can be redone without redoing all of them:
#
#   npm run test:visual:baselines -- --project=w360 -g "#faq section"
#
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "error: this needs a running Docker daemon to produce Linux baselines." >&2
  echo "       See tests/visual/README.md." >&2
  exit 1
fi

version="$(node -p "require('@playwright/test/package.json').version")"
image="mcr.microsoft.com/playwright:v${version}-noble"

# Built on the host, not in the container: node_modules is bind-mounted, and
# the platform-specific Next.js compiler binary in there is the host's.
# Playwright itself is pure JavaScript and finds its browsers through
# PLAYWRIGHT_BROWSERS_PATH, which the image sets.
echo "==> Building the static export"
npm run build

echo "==> Regenerating baselines in ${image} (linux/amd64)"
docker run --rm --init \
  --platform linux/amd64 \
  --ipc=host \
  --user "$(id -u):$(id -g)" \
  --volume "$PWD:/work" \
  --workdir /work \
  --env HOME=/tmp \
  "$image" \
  npx playwright test --config=playwright.visual.config.ts --update-snapshots "$@"
