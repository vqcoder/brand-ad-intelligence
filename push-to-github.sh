#!/bin/bash
# Run this from INSIDE the brand-ad-intelligence folder:
#   cd brand-ad-intelligence
#   bash push-to-github.sh YOUR_GITHUB_TOKEN
#
# Get a token at: https://github.com/settings/tokens/new
# Required scope: check "repo"

GITHUB_TOKEN=$1
GITHUB_USER="vqcoder"
REPO_NAME="brand-ad-intelligence"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Usage: bash push-to-github.sh YOUR_GITHUB_TOKEN"
  echo ""
  echo "Get a token at: https://github.com/settings/tokens/new"
  echo "Required scope: check 'repo'"
  exit 1
fi

# Confirm we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: Run this script from inside the brand-ad-intelligence folder."
  echo "  cd brand-ad-intelligence"
  echo "  bash push-to-github.sh YOUR_GITHUB_TOKEN"
  exit 1
fi

echo "Creating GitHub repository..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":false,\"description\":\"Brand Ad Intelligence — multi-brand creative tracker with Meta sync\"}")

echo "$RESPONSE" | grep -E '"full_name"|"html_url"|"message"'

echo ""
echo "Pushing code..."
git remote remove origin 2>/dev/null || true
git remote add origin https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git
git push -u origin main

echo ""
echo "✓ Done! Repo live at: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEP: Deploy to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://vercel.com/new"
echo "2. Import: github.com/$GITHUB_USER/$REPO_NAME"
echo "3. Add these 3 Environment Variables:"
echo ""
echo "   NEXT_PUBLIC_SUPABASE_URL"
echo "   = https://qzaygzfrsizvduqcraod.supabase.co"
echo ""
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6YXlnemZyc2l6dmR1cWNyYW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzk3NjQsImV4cCI6MjA4OTk1NTc2NH0.WaIlpII73Zq8lpDurScE8chQG-0_on5fVXqcovaSZHU"
echo ""
echo "   SUPABASE_SERVICE_ROLE_KEY"
echo "   = (get from: supabase.com → your project → Project Settings → API → service_role secret)"
echo ""
echo "4. Click Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
