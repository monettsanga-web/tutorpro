#!/usr/bin/env sh
# Upload the built site to the Hong Kong mirror (docs/CHINA-ACCESS.md, Fix A).
# Usage: scripts/sync-china-mirror.sh user@vps-ip [remote-dir]
set -eu
TARGET="${1:?usage: sync-china-mirror.sh user@vps-ip [remote-dir]}"
REMOTE="${2:-/var/www/tutorpro-mirror}"
[ -d dist ] || { echo "No dist/ folder - run npm run build first."; exit 1; }
rsync -az --delete dist/ "$TARGET:$REMOTE/"
echo "Mirror synced to $TARGET:$REMOTE"
