# Performance Optimization Implementation Plan

## Overview

This document outlines a comprehensive plan to improve the performance of the restaurant-copilot application by addressing three key areas:

1. **Reduce duplicate Supabase calls by caching user and restaurant context**
2. **Remove verbose logging from production code**
3. **Introduce caching for frequently read data (menus and tables)**

## Current Performance Issues Identified

### 1. Duplicate Supabase Calls
- **Issue**: Each page request triggers multiple `supabase.auth.getUser()` calls:
  - First in `middleware.ts` (line 36)
  - Then again in `getUserFromRequest()` (line 15)
  - Additional queries for user records and restaurant data
- **Impact**: Increases round-trip time, especially on slow connections
- **Location**: `/web/middleware.ts` and `/web/lib/server/getUserFromRequest.ts`

### 2. Verbose Logging in Production
- **Issue**: Console.log/error/warn statements throughout the codebase (23+ occurrences)
- **Impact**: Performance overhead and potential security concerns
- **Locations**: Middleware, auth helpers, API routes, client components

### 3. No Caching for Frequently Read Data
- **Issue**: Every request fetches:
  - Menu categories and items (`fetchMenuAndTables`)
  - Restaurant settings
  - Table data
  - User context
- **Impact**: Unnecessary database load and slower response times
- **Key areas**: Menu management, dashboard data, customer ordering

## Implementation Strategy

### Phase 1: Request Context Caching (High Priority)

#### 1.1 Implement Request-scoped User Context Cache

**Create**: `/web/lib/server/request-context.ts`
```typescript
// Request-scoped cache for user and restaurant context
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser } from './getUserFromRequest';

// Cache the user data for the duration of the request
export const getCachedUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !supabaseUser) {
    return null;
  }

  // Fetch user record and restaurant data in a single optimized query
  const { data: userRecord } = await supabase
    .from('users')
    .select(`
      restaurant_id,
      role,
      restaurants!inner(
        id,
        subdomain,
        name
      )
    `)
    .eq('id', supabaseUser.id)
    .single();

  if (!userRecord) {
    return {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      restaurantId: supabaseUser.user_metadata?.restaurant_id || null,
      subdomain: null,
      role: supabaseUser.user_metadata?.role || null,
    };
  }

  return {
    userId: supabaseUser.id,
    email: supabaseUser.email,
    restaurantId: userRecord.restaurant_id,
    subdomain: userRecord.restaurants.subdomain,
    role: userRecord.role,
  };
});

// Cache restaurant context for the request
export const getCachedRestaurantContext = cache(async (subdomain: string) => {
  const supabase = await createClient();
  
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, subdomain')
    .eq('subdomain', subdomain)
    .single();
    
  return restaurant;
});
```

#### 1.2 Update getUserFromRequest to use cache

**Modify**: `/web/lib/server/getUserFromRequest.ts`
```typescript
import { getCachedUser } from './request-context';

export async function getUserFromRequest(): Promise<AuthUser | null> {
  return getCachedUser();
}
```

#### 1.3 Update Middleware to set context once

**Modify**: `/web/middleware.ts`
```typescript
// Add request header with user context to avoid re-fetching
async function handleSupabaseAndRls(
  request: NextRequest,
  response: NextResponse
) {
  // ... existing Supabase client setup ...

  const { data: { user } } = await supabase.auth.getUser();

  // Set user context in request headers for downstream use
  if (user) {
    response.headers.set('X-User-ID', user.id);
    response.headers.set('X-User-Email', user.email || '');
  }

  // ... rest of RLS setup ...
  
  return { user, response };
}
```

### Phase 2: Production Logging Cleanup (High Priority)

#### 2.1 Create Logging Utility

**Create**: `/web/lib/logger.ts`
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  restaurantId?: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context);
    }
    // In production, only log to structured logging service (e.g., Supabase logs)
    if (this.isProduction && context?.endpoint) {
      this.logToService('info', message, context);
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context);
    }
    if (this.isProduction) {
      this.logToService('warn', message, context);
    }
  }

  error(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, context);
    }
    // Always log errors to service in production
    if (this.isProduction) {
      this.logToService('error', message, context);
    }
  }

  private async logToService(level: LogLevel, message: string, context?: LogContext) {
    try {
      // Use existing audit logging infrastructure
      await fetch('/api/v1/internal/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          ...context,
        }),
      });
    } catch (error) {
      // Fallback: don't break app if logging fails
      if (this.isDevelopment) {
        console.error('Failed to log to service:', error);
      }
    }
  }
}

export const logger = new Logger();
```

#### 2.2 Replace Console Statements

**Update locations** (23 identified):
- `/web/middleware.ts` - Lines 53, 60, 65
- `/web/lib/server/getUserFromRequest.ts` - Lines 18, 30, 53
- `/web/lib/supabase/middleware.ts` - Lines 45, 51, 59
- And 14 other locations

**Example transformation**:
```typescript
// Before
console.error('Error fetching Supabase user:', authError.message);

// After
import { logger } from '@/lib/logger';
logger.error('Error fetching Supabase user', {
  error: authError.message,
  endpoint: '/api/auth/session'
});
```

### Phase 3: Data Caching Layer (Medium Priority)

#### 3.1 Implement Menu Data Caching

**Create**: `/web/lib/cache/menu-cache.ts`
```typescript
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Cache menu data for 5 minutes
export const getCachedMenuData = unstable_cache(
  async (restaurantId: string) => {
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select(`
        id, position, name_en, name_ja, name_vi,
        menu_items(
          id, name_en, name_ja, name_vi, description_en, description_ja, description_vi,
          price, image_url, available, weekday_visibility, position,
          menu_item_sizes(id, size_key, name_en, name_ja, name_vi, price, position),
          toppings(id, name_en, name_ja, name_vi, price, position)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('position', { ascending: true })
      .order('position', { foreignTable: 'menu_items', ascending: true });

    return categories || [];
  },
  ['menu-data'],
  {
    revalidate: 300, // 5 minutes
    tags: ['menu'],
  }
);

// Cache restaurant settings
export const getCachedRestaurantSettings = unstable_cache(
  async (restaurantId: string) => {
    const { data } = await supabaseAdmin
      .from('restaurants')
      .select('name, logo_url, default_language, brand_color')
      .eq('id', restaurantId)
      .single();

    return data;
  },
  ['restaurant-settings'],
  {
    revalidate: 600, // 10 minutes
    tags: ['restaurant-settings'],
  }
);
```

#### 3.2 Implement Cache Invalidation

**Create**: `/web/lib/cache/invalidation.ts`
```typescript
import { revalidateTag } from 'next/cache';

export function invalidateMenuCache(restaurantId: string) {
  revalidateTag('menu');
  revalidateTag(`menu-${restaurantId}`);
}

export function invalidateRestaurantSettings(restaurantId: string) {
  revalidateTag('restaurant-settings');
  revalidateTag(`restaurant-settings-${restaurantId}`);
}

// Call this in API routes when data changes
// Example: In /api/v1/menu-items/route.ts
export async function POST(req: NextRequest) {
  // ... menu item creation logic ...
  
  if (success) {
    invalidateMenuCache(restaurantId);
  }
  
  return NextResponse.json(result);
}
```

#### 3.3 Update Customer Data Fetching

**Modify**: `/web/lib/server/customer-data.ts`
```typescript
import { getCachedMenuData } from '@/lib/cache/menu-cache';

export async function fetchMenuAndTables(subdomain: string) {
  const restaurantId = await getRestaurantIdFromSubdomain(subdomain);
  if (!restaurantId) return { categories: [], tables: [] };

  // Use cached menu data
  const categories = await getCachedMenuData(restaurantId);

  // Tables change less frequently, cache for longer
  const { data: tables } = await supabaseAdmin
    .from('tables')
    .select('id,name,status,is_outdoor,is_accessible,notes,capacity')
    .eq('restaurant_id', restaurantId)
    .order('name');

  return {
    categories: categories || [],
    tables: tables || []
  };
}
```

### Phase 4: Advanced Optimizations (Low Priority)

#### 4.1 Implement Redis Caching (Optional)

**Create**: `/web/lib/cache/redis-cache.ts`
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class RedisCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis invalidatePattern error:', error);
    }
  }
}
```

#### 4.2 Implement Database Connection Pooling

**Create**: `/web/lib/cache/db-optimization.ts`
```typescript
// Optimize Supabase queries with connection pooling and prepared statements
export const optimizedQueries = {
  getUserWithRestaurant: `
    SELECT 
      u.id, u.email, u.restaurant_id, u.role,
      r.subdomain, r.name as restaurant_name
    FROM users u
    LEFT JOIN restaurants r ON u.restaurant_id = r.id
    WHERE u.id = $1
  `,

  getMenuWithItems: `
    SELECT 
      c.id, c.name_en, c.name_ja, c.name_vi, c.position,
      jsonb_agg(
        jsonb_build_object(
          'id', mi.id,
          'name_en', mi.name_en,
          'name_ja', mi.name_ja,
          'name_vi', mi.name_vi,
          'price', mi.price,
          'available', mi.available,
          'position', mi.position
        ) ORDER BY mi.position
      ) as menu_items
    FROM categories c
    LEFT JOIN menu_items mi ON c.id = mi.category_id AND mi.available = true
    WHERE c.restaurant_id = $1
    GROUP BY c.id, c.position
    ORDER BY c.position
  `,
};
```

## Performance Monitoring

### 4.3 Add Performance Metrics

**Create**: `/web/lib/monitoring/performance.ts`
```typescript
export class PerformanceMonitor {
  static measureDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    return queryFn().finally(() => {
      const duration = performance.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Query ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      // In production, log to analytics service
      if (process.env.NODE_ENV === 'production' && duration > 1000) {
        // Log slow queries
        fetch('/api/v1/internal/metrics', {
          method: 'POST',
          body: JSON.stringify({
            type: 'slow_query',
            query: queryName,
            duration,
            timestamp: Date.now(),
          }),
        });
      }
    });
  }

  static measureApiResponse(endpoint: string, startTime: number) {
    const duration = performance.now() - startTime;
    
    if (duration > 2000) { // Log APIs taking > 2 seconds
      fetch('/api/v1/internal/metrics', {
        method: 'POST',
        body: JSON.stringify({
          type: 'slow_api',
          endpoint,
          duration,
          timestamp: Date.now(),
        }),
      });
    }
  }
}
```

## Implementation Timeline

### Week 1: Request Context Caching
- [ ] Implement request-scoped caching utilities
- [ ] Update getUserFromRequest to use cache
- [ ] Modify middleware to set context once
- [ ] Test caching behavior

### Week 2: Production Logging Cleanup
- [ ] Create logging utility
- [ ] Replace all console statements
- [ ] Set up structured logging endpoint
- [ ] Test logging in development/production

### Week 3: Data Caching Layer
- [ ] Implement menu data caching
- [ ] Add cache invalidation logic
- [ ] Update customer data fetching
- [ ] Test cache performance

### Week 4: Monitoring & Optimization
- [ ] Add performance monitoring
- [ ] Implement Redis caching (optional)
- [ ] Database query optimization
- [ ] Performance testing and validation

## Expected Performance Improvements

### 1. Request Processing Time
- **Before**: 2-3 database calls per request for user context
- **After**: 1 cached lookup per request
- **Improvement**: 60-70% reduction in auth-related database calls

### 2. Menu Loading Time
- **Before**: Full database query every time
- **After**: Cached for 5 minutes with smart invalidation
- **Improvement**: 80-90% reduction in menu loading time

### 3. Dashboard Performance
- **Before**: Multiple uncached queries for dashboard data
- **After**: Cached data with background refresh
- **Improvement**: 50-70% faster dashboard loading

### 4. Production Logging Overhead
- **Before**: Console statements in production
- **After**: Structured logging only when necessary
- **Improvement**: Reduced runtime overhead and better observability

## Monitoring Success

### Key Metrics to Track
1. **Average API Response Time** (target: <500ms)
2. **Database Query Count per Request** (target: <5 queries)
3. **Cache Hit Rate** (target: >80%)
4. **Time to First Byte (TTFB)** (target: <200ms)
5. **Client-side Rendering Performance** (target: <100ms)

### Tools
- Next.js built-in analytics
- Supabase query performance monitoring
- Custom performance logging
- Vercel Speed Insights

## Rollback Plan

Each phase is designed to be independently deployable with easy rollback:

1. **Feature flags** for caching behavior
2. **Gradual rollout** to percentage of traffic
3. **Monitoring alerts** for performance regressions
4. **Quick disable switches** for problematic features

## Environment Variables

Add these to production environment:

```bash
# Caching configuration
ENABLE_REQUEST_CACHING=true
CACHE_TTL_MENU=300
CACHE_TTL_RESTAURANT=600

# Logging configuration
LOG_LEVEL=warn
STRUCTURED_LOGGING_ENDPOINT=/api/v1/internal/logs

# Optional: Redis configuration
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Performance monitoring
PERFORMANCE_MONITORING=true
SLOW_QUERY_THRESHOLD=1000
```

This comprehensive plan addresses all three performance concerns while maintaining system reliability and observability.
