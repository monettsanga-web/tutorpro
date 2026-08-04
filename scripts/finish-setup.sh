#!/usr/bin/env bash
#
# TutorPro Online English — one-shot setup for the pieces that cannot be
# deployed from the app itself.
#
# Run it from the project folder:
#
#     bash scripts/finish-setup.sh
#
# It is safe to run more than once: every step checks whether the work is
# already done and skips it. Nothing is deleted, and no existing data is
# touched.

set -u

PROJECT_REF="losmkvvwzijipqrlelyt"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

echo
bold "TutorPro setup — finishing the parts that need your account"
echo "Project: ${PROJECT_REF}"

# ---------------------------------------------------------------------------
step "1. Checking the Supabase CLI"

if command -v supabase >/dev/null 2>&1; then
  ok "Supabase CLI found ($(supabase --version 2>/dev/null | head -1))"
else
  warn "Supabase CLI not installed. Installing it now..."
  if command -v npm >/dev/null 2>&1; then
    npm install -g supabase || {
      fail "Could not install automatically."
      echo "    Install it manually: https://supabase.com/docs/guides/cli"
      exit 1
    }
    ok "Installed"
  else
    fail "npm is not available, so the CLI cannot be installed automatically."
    echo "    Install it manually: https://supabase.com/docs/guides/cli"
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
step "2. Signing in and linking the project"

if supabase projects list >/dev/null 2>&1; then
  ok "Already signed in"
else
  warn "Not signed in. A browser window will open."
  supabase login || { fail "Sign-in failed."; exit 1; }
  ok "Signed in"
fi

if [ -f "supabase/.temp/project-ref" ] && grep -q "$PROJECT_REF" supabase/.temp/project-ref 2>/dev/null; then
  ok "Project already linked"
else
  supabase link --project-ref "$PROJECT_REF" || {
    warn "Link failed. You may be asked for the database password;"
    warn "find it in Supabase → Settings → Database → Reset database password."
  }
fi

# ---------------------------------------------------------------------------
step "3. Deploying the edge functions"

deploy_function() {
  local name="$1"
  local why="$2"
  printf '  Deploying %-22s (%s)\n' "$name" "$why"
  if supabase functions deploy "$name" --project-ref "$PROJECT_REF" >/dev/null 2>&1; then
    ok "$name deployed"
  else
    fail "$name failed — run this to see why:"
    echo "      supabase functions deploy $name --project-ref $PROJECT_REF"
  fi
}

deploy_function "turn-credentials" "fixes video that will not connect"
deploy_function "follow-up-email"  "enables the Send button in Follow-ups"

# ---------------------------------------------------------------------------
step "4. Checking the database"

echo "  These two need to be run by hand in the SQL editor:"
echo
echo "    https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo
echo "  Open each file, copy everything, paste it in, press Run:"
echo "    • supabase/site_settings.sql    → the Website controls switch"
echo "    • supabase/public_teachers.sql  → the public teacher directory"
echo
warn "Both are safe to run more than once."

# ---------------------------------------------------------------------------
step "5. Secrets you still need to add"

cat <<'NOTE'
  For video relay (Cloudflare — free, ~3,000 lessons/month):

    1. https://dash.cloudflare.com  →  Realtime  →  Create  →  TURN
    2. Copy the TURN Key ID and API Token
    3. Supabase → Edge Functions → Secrets → add:

         CLOUDFLARE_TURN_KEY_ID
         CLOUDFLARE_TURN_API_TOKEN

  For follow-up emails, confirm this secret already exists:

         RESEND_API_KEY

  Full walkthrough: docs/turn-server-setup.md
NOTE

# ---------------------------------------------------------------------------
step "6. Verifying"

check_function() {
  local name="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${SUPABASE_URL}/functions/v1/${name}" \
    -H "Content-Type: application/json" -d '{}' 2>/dev/null)
  case "$code" in
    404) fail "$name is NOT deployed" ;;
    401|400|200|546) ok "$name is live (HTTP $code)" ;;
    *)   warn "$name returned HTTP $code" ;;
  esac
}

check_function "turn-credentials"
check_function "follow-up-email"

echo
bold "Done."
echo "Re-run this script any time to check the current state."
echo
