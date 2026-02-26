#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

rm -rf public
mkdir -p public

wget --mirror --page-requisites --convert-links --adjust-extension --no-parent --no-host-directories \
  --domains idastuudio.ee --directory-prefix public https://idastuudio.ee/

# Common wget layout normalization: sometimes files end up in public/idastuudio.ee/
if [[ -d public/idastuudio.ee ]]; then
  shopt -s dotglob nullglob
  mv public/idastuudio.ee/* public/
  rm -rf public/idastuudio.ee
fi

# Ensure homepage ends up at public/index.html even with wget naming quirks.
if [[ ! -f public/index.html ]]; then
  if [[ -f public/idastuudio.ee.html ]]; then
    mv public/idastuudio.ee.html public/index.html
  else
    candidate="$(find public -type f -name 'index.html' | head -n 1 || true)"
    if [[ -n "$candidate" ]]; then
      cp "$candidate" public/index.html
    fi
  fi
fi

if [[ ! -f public/index.html ]]; then
  echo "Error: public/index.html was not created after cloning." >&2
  exit 1
fi

echo "Clone complete: public/index.html is ready."
