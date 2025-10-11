#!/bin/bash
# Verification script to check if all required files exist for build

echo "🔍 Verifying build requirements..."
echo ""

# Check frontend files
echo "📁 Checking frontend files..."
files=(
  "frontend/src/main.jsx"
  "frontend/src/i18n.js"
  "frontend/src/App.jsx"
  "frontend/src/api.js"
  "frontend/package.json"
  "frontend/vite.config.js"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - MISSING!"
    missing=$((missing + 1))
  fi
done

echo ""

# Check backend files
echo "📁 Checking backend files..."
backend_files=(
  "backend/src/index.js"
  "backend/src/utils/session.js"
  "backend/src/utils/pci.js"
  "backend/src/middleware/validate.js"
  "backend/src/data/memoryStore.js"
  "backend/package.json"
)

for file in "${backend_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - MISSING!"
    missing=$((missing + 1))
  fi
done

echo ""

# Check for CommonJS syntax in backend
echo "🔍 Checking for CommonJS syntax in backend..."
commonjs_count=$(grep -r "module.exports\|require(" backend/src --include="*.js" 2>/dev/null | wc -l)
if [ "$commonjs_count" -eq 0 ]; then
  echo "✅ No CommonJS syntax found (ES modules only)"
else
  echo "⚠️  Found $commonjs_count instances of CommonJS syntax"
  grep -r "module.exports\|require(" backend/src --include="*.js" 2>/dev/null | head -5
fi

echo ""

# Check for ES module syntax
echo "🔍 Checking for ES module syntax..."
esm_count=$(grep -l "^import\|^export" backend/src/**/*.js 2>/dev/null | wc -l)
echo "✅ Found $esm_count files using ES modules"

echo ""

# Summary
if [ "$missing" -eq 0 ]; then
  echo "✅ All required files present!"
  echo "✅ Build should succeed"
  exit 0
else
  echo "❌ $missing files missing!"
  echo "❌ Build will fail"
  exit 1
fi
