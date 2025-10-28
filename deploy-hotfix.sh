#!/bin/bash
# Emergency hotfix deployment script
# Fixes production crash: TypeError: E?.map is not a function

set -e

echo "🚨 EMERGENCY HOTFIX DEPLOYMENT"
echo "================================"
echo ""
echo "This will fix the production crash on inspections page"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "hotfix/inspections-page-production-crash" ]; then
    echo "⚠️  Warning: You're on branch '$CURRENT_BRANCH'"
    echo "Switching to hotfix branch..."
    git checkout hotfix/inspections-page-production-crash
fi

echo "📋 Hotfix includes:"
echo "  ✅ Fix for InspectionDetailPage missing imports"
echo "  ✅ Fix for InspectionsPage data structure mismatch"
echo ""

echo "🔍 Changes to be deployed:"
git log main..HEAD --oneline
echo ""

read -p "Deploy this hotfix to main? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔀 Merging to main..."
    git checkout main
    git merge hotfix/inspections-page-production-crash --no-edit
    
    echo ""
    echo "📤 Pushing to origin/main..."
    git push origin main
    
    echo ""
    echo "✅ HOTFIX DEPLOYED SUCCESSFULLY!"
    echo ""
    echo "🎉 The inspections page crash should be fixed in production"
    echo ""
    echo "📊 Verify after deployment:"
    echo "  1. Navigate to inspections page"
    echo "  2. Check properties dropdown loads"
    echo "  3. Click on an inspection to view details"
    echo "  4. Verify no console errors"
    echo ""
else
    echo "❌ Deployment cancelled"
    echo ""
    echo "To deploy manually:"
    echo "  git checkout main"
    echo "  git merge hotfix/inspections-page-production-crash"
    echo "  git push origin main"
fi
