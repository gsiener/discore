#!/bin/bash

# Script to set up branch protection for main branch
# Requires GitHub CLI (gh) to be installed and authenticated
# Install: https://cli.github.com/

set -e

echo "Setting up branch protection for main branch..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Configuring branch protection for: $REPO"

# Set up branch protection
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/main/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=test" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews=null" \
  -f "restrictions=null"

echo "✅ Branch protection configured successfully!"
echo ""
echo "Main branch now requires:"
echo "  - Status check 'test' to pass"
echo "  - Branches to be up to date before merging"
echo ""
echo "To enable PR reviews, go to:"
echo "  https://github.com/$REPO/settings/branches"
