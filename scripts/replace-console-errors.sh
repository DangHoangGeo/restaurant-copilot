#!/bin/bash

# Script to replace console.error with logger.error in API routes
# This script will systematically update all console.error calls to use structured logging

echo "Replacing console.error with logger.error in API routes..."

# Find all TypeScript files in the API routes directory
find web/app/api/v1/owner -name "*.ts" -type f | while read file; do
    echo "Processing $file..."
    
    # Check if the file contains console.error
    if grep -q "console.error" "$file"; then
        # Check if logger is already imported
        if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
            echo "  Adding logger import to $file"
            # Add logger import after other imports
            sed -i '' '/import.*from.*@\/lib\/supabaseAdmin/a\
import { logger } from '"'"'@/lib/logger'"'"';
' "$file"
        fi
        
        echo "  Found console.error usage in $file"
    fi
done

echo "Manual replacement still needed for console.error calls"
echo "The script added logger imports where needed"
echo "Please manually replace console.error calls with appropriate logger.error calls"
