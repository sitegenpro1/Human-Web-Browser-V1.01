#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Human Web Browser — OTA Update Pusher
# Run this after any JS/UI code changes to push instantly
# to all installed APKs without a full rebuild.
#
# Usage:
#   bash scripts/push-ota.sh                   (auto message)
#   bash scripts/push-ota.sh "Fix login bug"   (custom message)
# ═══════════════════════════════════════════════════════════

set -e

MSG="${1:-Update $(date '+%Y-%m-%d %H:%M')}"

# Sync latest source to EAS build dir
echo "📦 Syncing latest code..."
cp -r /home/runner/workspace/artifacts/mobile/app /tmp/hwb-build/
cp -r /home/runner/workspace/artifacts/mobile/components /tmp/hwb-build/
cp -r /home/runner/workspace/artifacts/mobile/context /tmp/hwb-build/
cp -r /home/runner/workspace/artifacts/mobile/hooks /tmp/hwb-build/
cp -r /home/runner/workspace/artifacts/mobile/lib /tmp/hwb-build/
cp /home/runner/workspace/artifacts/mobile/app.json /tmp/hwb-build/

# Commit to git (EAS requires it)
cd /tmp/hwb-build
git add -A
git -c user.email="build@hwb.app" -c user.name="HWB Build" commit -m "$MSG" --quiet || true

# Push OTA update
echo "🚀 Pushing update: $MSG"
EXPO_TOKEN=$EXPO_TOKEN /home/runner/workspace/artifacts/mobile/node_modules/.bin/eas update \
  --channel preview \
  --message "$MSG" \
  --non-interactive

echo ""
echo "✅ Done! App will update automatically on next launch."
