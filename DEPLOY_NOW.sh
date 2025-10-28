#!/bin/bash
# Script to deploy all inspection workflow fixes
# Run this after resolving the failed migration in the database

set -e  # Exit on error

echo "🚀 Deploying Inspection Workflow Fixes"
echo "======================================="
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'main'"
    echo "Switching to main..."
    git checkout main
fi

echo "📥 Fetching latest changes..."
git fetch origin

echo ""
echo "🔀 Merging fix branches..."
echo ""

# Merge fix branches
echo "1/3 Merging fix/inspection-detail-missing-imports..."
git merge fix/inspection-detail-missing-imports --no-edit

echo "2/3 Merging fix/inspections-page-data-structure-mismatch..."
git merge fix/inspections-page-data-structure-mismatch --no-edit

echo "3/3 Merging fix/inspection-migration-column-order..."
git merge fix/inspection-migration-column-order --no-edit

echo ""
echo "✅ All fixes merged successfully!"
echo ""

# Show what will be pushed
echo "📋 Changes to be pushed:"
git log origin/main..HEAD --oneline

echo ""
echo "🚀 Ready to push to origin/main"
echo ""
read -p "Push to origin/main now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing to origin/main..."
    git push origin main
    echo ""
    echo "✅ Successfully pushed to main!"
    echo ""
    echo "🎉 Deployment will start automatically"
    echo ""
    echo "⚠️  IMPORTANT: Make sure you've resolved the failed migration first!"
    echo "   Run one of these commands against your production database:"
    echo ""
    echo "   Option A (SQL):"
    echo "   psql \$DATABASE_URL -c \"UPDATE \\\"_prisma_migrations\\\" SET rolled_back_at = NOW() WHERE migration_name = '20251115000000_create_missing_inspection_tables' AND finished_at IS NULL;\""
    echo ""
    echo "   Option B (Prisma CLI):"
    echo "   npx prisma migrate resolve --rolled-back 20251115000000_create_missing_inspection_tables"
    echo ""
else
    echo "❌ Push cancelled"
    echo ""
    echo "To push manually later, run:"
    echo "  git push origin main"
fi

echo ""
echo "📚 Documentation:"
echo "  - FIXES_SUMMARY.md - Overview of all fixes"
echo "  - QUICK_FIX.md - Quick resolution commands"
echo "  - DEPLOYMENT_RECOVERY.md - Detailed recovery guide"
echo ""
