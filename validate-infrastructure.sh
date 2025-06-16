#!/bin/bash

# Infrastructure validation script
# Checks that all core infrastructure components are properly set up

echo "🔍 Validating Performance Refactoring Infrastructure..."
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success_count=0
total_checks=0

check_file() {
    local file_path=$1
    local description=$2
    total_checks=$((total_checks + 1))
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ $description${NC}"
        success_count=$((success_count + 1))
    else
        echo -e "${RED}❌ $description - Missing: $file_path${NC}"
    fi
}

check_directory() {
    local dir_path=$1
    local description=$2
    total_checks=$((total_checks + 1))
    
    if [ -d "$dir_path" ]; then
        echo -e "${GREEN}✅ $description${NC}"
        success_count=$((success_count + 1))
    else
        echo -e "${RED}❌ $description - Missing: $dir_path${NC}"
    fi
}

echo "Checking directory structure..."
check_directory "web/components/ui/skeletons" "Skeletons directory"
check_directory "web/components/ui/states" "States directory"

echo ""
echo "Checking core hooks..."
check_file "web/hooks/useApiData.ts" "Data fetching hook"
check_file "web/hooks/useMutation.ts" "Mutation hook"
check_file "web/hooks/useRestaurantApi.ts" "Restaurant API hook"
check_file "web/hooks/usePerformanceMonitor.ts" "Performance monitoring hook"
check_file "web/hooks/index.ts" "Hooks index file"

echo ""
echo "Checking state components..."
check_file "web/components/ui/states/error-state.tsx" "Error state component"
check_file "web/components/ui/states/empty-state.tsx" "Empty state component"
check_file "web/components/ui/states/index.ts" "States index file"

echo ""
echo "Checking skeleton components..."
check_file "web/components/ui/skeletons/skeleton.tsx" "Base skeleton component"
check_file "web/components/ui/skeletons/orders-skeleton.tsx" "Orders skeleton"
check_file "web/components/ui/skeletons/dashboard-skeleton.tsx" "Dashboard skeleton"
check_file "web/components/ui/skeletons/tables-skeleton.tsx" "Tables skeleton"
check_file "web/components/ui/skeletons/menu-skeleton.tsx" "Menu skeleton"
check_file "web/components/ui/skeletons/index.ts" "Skeletons index file"

echo ""
echo "Checking utility components..."
check_file "web/components/ui/loading-button.tsx" "Loading button component"
check_file "web/components/ui/page-template.tsx" "Page template component"

echo ""
echo "=================================================="
echo "Infrastructure Validation Results:"
echo -e "✅ Successful checks: ${GREEN}$success_count${NC}"
echo -e "❌ Failed checks: ${RED}$((total_checks - success_count))${NC}"
echo -e "📊 Success rate: ${GREEN}$(( success_count * 100 / total_checks ))%${NC}"

if [ $success_count -eq $total_checks ]; then
    echo ""
    echo -e "${GREEN}🎉 All infrastructure components are properly set up!${NC}"
    echo -e "${GREEN}Ready to proceed with page refactoring.${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some infrastructure components are missing.${NC}"
    echo -e "${YELLOW}Please run the setup commands to create missing files.${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Run TypeScript compilation check: npm run type-check"
echo "2. Start refactoring high-priority pages (Orders, Dashboard)"
echo "3. Test performance improvements"
