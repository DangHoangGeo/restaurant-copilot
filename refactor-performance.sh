#!/bin/bash

# Restaurant Copilot Performance Refactoring Script
# This script helps automate the refactoring process from server-heavy to client-optimized architecture

set -e

echo "🚀 Restaurant Copilot Performance Refactoring Assistant"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the web app root directory (where package.json is located)"
    exit 1
fi

# Function to create API endpoint
create_api_endpoint() {
    local endpoint_path=$1
    local endpoint_name=$2
    
    mkdir -p "app/api/v1/$(dirname $endpoint_path)"
    
    cat > "app/api/v1/${endpoint_path}/route.ts" << EOF
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement your data fetching logic here
    // Example:
    // const { data, error } = await supabaseAdmin
    //   .from('your_table')
    //   .select('*')
    //   .eq('restaurant_id', user.restaurantId);
    
    // if (error) throw error;
    
    const data = []; // Replace with actual data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ${endpoint_name} API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // TODO: Implement your create logic here
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating ${endpoint_name}:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
EOF

    print_status "Created API endpoint: /api/v1/${endpoint_path}/route.ts"
}

# Function to create skeleton component
create_skeleton_component() {
    local component_name=$1
    
    cat > "components/ui/skeletons/${component_name,,}-skeleton.tsx" << EOF
import React from 'react';

export function ${component_name}Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>
      
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF

    print_status "Created skeleton component: ${component_name}Skeleton"
}

# Function to create client component template
create_client_component() {
    local page_name=$1
    local page_path=$2
    
    cat > "${page_path}/${page_name,,}-client-content.tsx" << EOF
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ${page_name}Skeleton } from '@/components/ui/skeletons/${page_name,,}-skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface ${page_name}Data {
  // TODO: Define your data interface
}

export function ${page_name}ClientContent() {
  const [data, setData] = useState<${page_name}Data | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Admin${page_name}');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/${page_name,,}', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching ${page_name,,} data:', err);
      setError(err instanceof Error ? err.message : t('errors.fetch_failed'));
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isInitialLoading) return <${page_name}Skeleton />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;
  if (!data) return <div>No data available</div>;
  
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </header>
      
      {/* TODO: Implement your page content here */}
      <div>
        <p>Page content will go here</p>
        <button 
          onClick={loadData}
          disabled={isLoading}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
EOF

    print_status "Created client component: ${page_name}ClientContent"
}

# Function to backup original file
backup_file() {
    local file_path=$1
    if [ -f "$file_path" ]; then
        cp "$file_path" "${file_path}.backup"
        print_status "Backed up original file: ${file_path}.backup"
    fi
}

# Function to refactor page to minimal server component
refactor_server_component() {
    local page_path=$1
    local page_name=$2
    
    backup_file "${page_path}/page.tsx"
    
    cat > "${page_path}/page.tsx" << EOF
import { setRequestLocale } from 'next-intl/server';
import { ${page_name}ClientContent } from './${page_name,,}-client-content';

export default async function ${page_name}Page({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <${page_name}ClientContent />
    </div>
  );
}
EOF

    print_status "Refactored server component: ${page_path}/page.tsx"
}

# Main menu
show_menu() {
    echo ""
    echo "Select an option:"
    echo "1. 🏗️  Set up infrastructure (hooks, skeletons, error components)"
    echo "2. 📦 Refactor Orders Page (High Priority)"
    echo "3. 📊 Refactor Dashboard Page (High Priority)"
    echo "4. 🪑 Refactor Tables Page"
    echo "5. ⚙️  Refactor Settings Page"
    echo "6. 📈 Refactor Reports Page"
    echo "7. 👥 Refactor Employees Page"
    echo "8. 📅 Refactor Bookings Page"
    echo "9. 🔧 Create custom API endpoint"
    echo "10. 📝 Generate refactoring checklist"
    echo "11. 🧪 Run performance test"
    echo "0. Exit"
    echo ""
}

# Set up infrastructure
setup_infrastructure() {
    print_info "Setting up infrastructure components..."
    
    # Create directories
    mkdir -p components/ui/skeletons
    mkdir -p hooks
    mkdir -p components/ui
    
    # Create custom hooks
    cat > "hooks/useApiData.ts" << 'EOF'
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseApiDataOptions {
  endpoint: string;
  autoRefresh?: number; // milliseconds
  dependencies?: any[];
}

export function useApiData<T>(options: UseApiDataOptions) {
  const [data, setData] = useState<T | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(options.endpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(`Error fetching ${options.endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [options.endpoint]);

  useEffect(() => {
    loadData();
  }, [loadData, ...(options.dependencies || [])]);

  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(loadData, options.autoRefresh);
      return () => clearInterval(interval);
    }
  }, [loadData, options.autoRefresh]);

  return {
    data,
    isInitialLoading,
    isLoading,
    error,
    refetch: loadData
  };
}
EOF

    # Create error state component
    cat > "components/ui/error-state.tsx" << 'EOF'
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title = "Something went wrong" }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          {error}
        </AlertDescription>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </Alert>
    </div>
  );
}
EOF

    print_status "Infrastructure setup complete!"
    print_info "Created:"
    print_info "- Custom hooks (useApiData)"
    print_info "- Error state component"
    print_info "- Directory structure"
}

# Refactor specific pages
refactor_orders_page() {
    print_info "Refactoring Orders Page..."
    
    # Create API endpoints
    create_api_endpoint "orders" "Orders"
    create_api_endpoint "tables" "Tables"
    create_api_endpoint "menu-for-orders" "Menu for Orders"
    
    # Create skeleton
    create_skeleton_component "Orders"
    
    # Create client component
    create_client_component "Orders" "app/[locale]/(restaurant)/dashboard/orders"
    
    # Refactor server component
    refactor_server_component "app/[locale]/(restaurant)/dashboard/orders" "Orders"
    
    print_status "Orders page refactoring complete!"
    print_warning "Don't forget to:"
    print_warning "- Implement the API endpoint logic in route.ts files"
    print_warning "- Update the client component with your specific UI"
    print_warning "- Test the refactored page"
}

refactor_dashboard_page() {
    print_info "Refactoring Dashboard Page..."
    
    # Create API endpoints
    create_api_endpoint "dashboard/metrics" "Dashboard Metrics"
    create_api_endpoint "dashboard/recent-orders" "Recent Orders"
    
    # Create skeleton
    create_skeleton_component "Dashboard"
    
    # Create client component
    create_client_component "Dashboard" "app/[locale]/(restaurant)/dashboard"
    
    # Refactor server component
    refactor_server_component "app/[locale]/(restaurant)/dashboard" "Dashboard"
    
    print_status "Dashboard page refactoring complete!"
}

# Generate checklist
generate_checklist() {
    cat > "REFACTORING_CHECKLIST.md" << 'EOF'
# Performance Refactoring Checklist

## Pre-Refactoring
- [ ] Backup original files
- [ ] Document current performance issues
- [ ] Set up performance monitoring

## Infrastructure Setup
- [ ] Create custom hooks (useApiData, useMutation)
- [ ] Create skeleton loading components
- [ ] Create error state components
- [ ] Set up directory structure

## Page Refactoring (Priority Order)

### 1. Orders Page ⭐⭐⭐
- [ ] Create API endpoints (/api/v1/orders, /api/v1/tables, /api/v1/menu-for-orders)
- [ ] Implement API logic with restaurant authentication
- [ ] Create OrdersSkeleton component
- [ ] Build OrdersClientContent with progressive loading
- [ ] Refactor server component to minimal version
- [ ] Test navigation speed (target: <200ms)
- [ ] Test error handling and retry functionality

### 2. Dashboard Page ⭐⭐⭐  
- [ ] Create API endpoints (/api/v1/dashboard/metrics, /api/v1/dashboard/recent-orders)
- [ ] Implement real-time metrics calculation
- [ ] Create DashboardSkeleton component
- [ ] Build DashboardClientContent with auto-refresh
- [ ] Add live data updates (30-second intervals)
- [ ] Test performance with multiple metrics

### 3. Tables Page ⭐⭐
- [ ] Create API endpoints (/api/v1/tables, /api/v1/restaurant/settings)
- [ ] Create TablesSkeleton component  
- [ ] Build TablesClientContent
- [ ] Implement CRUD operations
- [ ] Test table management functionality

### 4. Settings Page ⭐⭐
- [ ] Create API endpoints for settings management
- [ ] Build progressive settings loading
- [ ] Implement form validation and submission
- [ ] Test settings persistence

### 5. Reports Page ⭐
- [ ] Create API endpoints for report data
- [ ] Implement data visualization loading states
- [ ] Add export functionality with progress indicators
- [ ] Test with large datasets

### 6. Employees & Bookings Pages ⭐
- [ ] Follow same refactoring pattern
- [ ] Create respective API endpoints
- [ ] Implement client components
- [ ] Test functionality

## Testing & Validation
- [ ] Navigation speed test (all pages <200ms)
- [ ] Network simulation (slow 3G, offline)
- [ ] Error scenario testing
- [ ] User experience testing
- [ ] Performance metrics collection

## Post-Refactoring
- [ ] Remove .backup files after validation
- [ ] Update documentation
- [ ] Monitor real-world performance
- [ ] Collect user feedback
- [ ] Plan next optimizations

## Performance Targets
- ✅ Navigation time: <200ms (was 2-5 seconds)
- ✅ First contentful paint: <300ms
- ✅ Time to interactive: <500ms  
- ✅ Error rate: <1%
- ✅ User satisfaction: >90%
EOF

    print_status "Generated REFACTORING_CHECKLIST.md"
}

# Performance test
run_performance_test() {
    print_info "Running basic performance check..."
    
    if command -v curl &> /dev/null; then
        echo "Testing dashboard page load time..."
        time curl -s -o /dev/null "http://localhost:3000/en/dashboard" || print_warning "Server not running or dashboard not accessible"
    else
        print_warning "curl not available. Install curl to run performance tests."
    fi
    
    print_info "Performance test complete. For comprehensive testing:"
    print_info "1. Use Chrome DevTools Lighthouse"
    print_info "2. Test with slow network simulation"  
    print_info "3. Monitor Real User Metrics (RUM)"
}

# Main script loop
while true; do
    show_menu
    read -p "Enter your choice: " choice
    
    case $choice in
        1) setup_infrastructure ;;
        2) refactor_orders_page ;;
        3) refactor_dashboard_page ;;
        4) 
            print_info "Refactoring Tables Page..."
            create_api_endpoint "tables" "Tables"
            create_skeleton_component "Tables" 
            create_client_component "Tables" "app/[locale]/(restaurant)/dashboard/tables"
            refactor_server_component "app/[locale]/(restaurant)/dashboard/tables" "Tables"
            print_status "Tables page refactoring complete!"
            ;;
        5)
            print_info "Refactoring Settings Page..."
            create_api_endpoint "settings" "Settings"
            create_skeleton_component "Settings"
            create_client_component "Settings" "app/[locale]/(restaurant)/dashboard/settings" 
            refactor_server_component "app/[locale]/(restaurant)/dashboard/settings" "Settings"
            print_status "Settings page refactoring complete!"
            ;;
        6)
            print_info "Refactoring Reports Page..."
            create_api_endpoint "reports" "Reports"
            create_skeleton_component "Reports"
            create_client_component "Reports" "app/[locale]/(restaurant)/dashboard/reports"
            refactor_server_component "app/[locale]/(restaurant)/dashboard/reports" "Reports"
            print_status "Reports page refactoring complete!"
            ;;
        7)
            print_info "Refactoring Employees Page..."
            create_api_endpoint "employees" "Employees" 
            create_skeleton_component "Employees"
            create_client_component "Employees" "app/[locale]/(restaurant)/dashboard/employees"
            refactor_server_component "app/[locale]/(restaurant)/dashboard/employees" "Employees"
            print_status "Employees page refactoring complete!"
            ;;
        8)
            print_info "Refactoring Bookings Page..."
            create_api_endpoint "bookings" "Bookings"
            create_skeleton_component "Bookings"
            create_client_component "Bookings" "app/[locale]/(restaurant)/dashboard/bookings"
            refactor_server_component "app/[locale]/(restaurant)/dashboard/bookings" "Bookings"
            print_status "Bookings page refactoring complete!"
            ;;
        9)
            read -p "Enter API endpoint path (e.g., 'custom/endpoint'): " endpoint_path
            read -p "Enter endpoint description: " endpoint_desc
            create_api_endpoint "$endpoint_path" "$endpoint_desc"
            ;;
        10) generate_checklist ;;
        11) run_performance_test ;;
        0) 
            echo ""
            print_status "Refactoring assistant completed!"
            print_info "Next steps:"
            print_info "1. Review generated files and implement specific logic"
            print_info "2. Test each refactored page thoroughly"
            print_info "3. Monitor performance improvements"
            print_info "4. Collect user feedback"
            echo ""
            exit 0 
            ;;
        *) print_error "Invalid option. Please try again." ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
