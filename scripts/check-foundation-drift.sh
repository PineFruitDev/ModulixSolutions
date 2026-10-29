#!/usr/bin/env bash
# Foundation drift gate: @modulix/foundation must come from the pinned package, never a copied folder.
# Fails if any src/foundation/ copy exists or any source imports foundation code by a copied/relative path.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fail=0
copies=$(find . -path ./node_modules -prune -o -path '*/node_modules' -prune -o -path ./.git -prune -o \
  -type d -name foundation -path '*/src/foundation' -print 2>/dev/null || true)
if [ -n "$copies" ]; then echo "FAIL: vendored foundation folder(s) found:"; echo "$copies"; fail=1; fi
imports=$(grep -rnE --include='*.js' --include='*.mjs' --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  "from ['\"](\.{1,2}/)+([^'\"]*/)?(foundation|modulix-foundation/src)/[^'\"]+['\"]" . || true)
if [ -n "$imports" ]; then echo "FAIL: copied-path foundation imports (use '@modulix/foundation/<module>'):"; echo "$imports"; fail=1; fi
[ $fail -eq 0 ] && echo "PASS: no vendored @modulix/foundation copies or copied-path imports"
exit $fail
