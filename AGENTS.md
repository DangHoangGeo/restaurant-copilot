# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Development Commands

### Web Application (Next.js)
```bash
cd web
npm install           # Install dependencies
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### iOS Application (Swift/SwiftUI)
```bash
cd mobile/SOder
# Build the project
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug build

# Run all tests (unit + UI)
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug test

# Clean build folder
xcodebuild -project SOder.xcodeproj -scheme SOder clean

# Build for simulator
xcodebuild -project SOder.xcodeproj -scheme SOder -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' build
```

### Database Management
```bash
# Migration files are in infra/migrations/
# Run migrations manually in Supabase SQL editor
# Production scripts are in infra/production/
```

## Architecture Overview

### Multi-Tenant SaaS Platform
- **Web Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Mobile App**: SwiftUI iOS app for staff operations
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase Realtime for live order updates
- **Internationalization**: next-intl (Japanese, English, Vietnamese)

### Project Structure
```
├── web/                    # Next.js admin dashboard & customer site
│   ├── app/               # App Router pages
│   │   ├── [locale]/     # Internationalized routes
│   │   └── api/          # API routes (v1)
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and services
│   ├── messages/         # i18n translation files
│   └── shared/           # Shared types and schemas
├── mobile/SOder/          # SwiftUI iOS app
│   ├── SOder/            # Main app source
│   │   ├── views/        # SwiftUI views
│   │   ├── services/     # API and business logic
│   │   ├── models/       # Data models
│   │   └── localization/ # iOS localization files
│   ├── SOderTests/       # Unit tests
│   └── SOderUITests/     # UI tests
├── infra/                # Database and infrastructure
│   ├── migrations/       # Database migration scripts
│   └── production/       # Production deployment scripts
└── docs/                 # Documentation and plans
```

### Key Technical Patterns

**Multi-Tenant Data Isolation**: Every database table includes `restaurant_id` with RLS policies ensuring complete tenant isolation.

**Real-time Synchronization**: Uses Supabase Realtime subscriptions for live order updates between web dashboard and iOS app.

**Feature Flags**: Controlled via `/web/config/feature-flags.ts` for gradual rollout of payments, AI features, etc.

**Internationalization**: 
- Web uses next-intl with namespaced JSON files in `/web/messages/`
- iOS uses standard `Localizable.strings` files
- Supports Japanese, English, Vietnamese

**API Versioning**: All production APIs are under `/api/v1/` with planned v2 migration path.

### Authentication Flow
1. Restaurant owner signs up and gets subdomain (e.g., `restaurant.coorder`)
2. Staff members receive invite links to join restaurant
3. JWT tokens include `restaurant_id` for RLS enforcement
4. Customers access restaurant via subdomain without authentication

### Order Management Workflow
1. **Customer**: Scans QR code → creates session → places order
2. **Web Dashboard**: Shows real-time order status and management
3. **iOS App**: Receives orders via Realtime → processes → prints receipts
4. **Kitchen Board**: Groups identical items across orders for efficiency

### Key Services Integration
- **Supabase**: Database, auth, realtime, storage, edge functions
- **Bluetooth Printing**: ESC/POS thermal printers for kitchen tickets and receipts
- **AI Integration**: Google Gemini for menu descriptions and customer chat
- **Payment Processing**: Stripe (feature-flagged for future release)

## Development Notes

### Database Schema
- All tables use UUIDs and include RLS policies
- Audit logging via triggers on critical tables
- Session management for customer ordering flow
- Employee attendance tracking with QR code check-in

### Testing Strategy
- **Web**: No test framework currently configured
- **iOS**: Unit tests with XCTest, UI tests with XCUIApplication
- **Database**: RLS policy tests in `/infra/test_data/`

### Performance Considerations
- Uses SWR for client-side caching
- Supabase connection pooling
- Image optimization via Next.js
- Bluetooth printing queue management

### Security Features
- Row-Level Security (RLS) for complete tenant isolation
- Rate limiting on auth endpoints
- CAPTCHA on signup/login flows
- Audit logging for all critical operations
- Environment-based feature flags

### Deployment
- **Web**: Vercel with wildcard subdomain support
- **iOS**: Manual Xcode builds (no CI/CD configured)
- **Database**: Supabase hosted with migration scripts