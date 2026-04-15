# Monitoring & Observability

This document describes the monitoring, error tracking, and notification systems for the restaurant-copilot platform.

## Error Tracking — Sentry

Sentry provides real-time error monitoring and alerting for production issues.

### Setup

1. Create a project at https://sentry.io (select Next.js template)
2. Copy your DSN from **Project Settings → Client Keys (DSN)**
3. Add to `.env.local`: `NEXT_PUBLIC_SENTRY_DSN=your_dsn_here`
4. Install the SDK:
   ```bash
   cd web
   npm install @sentry/nextjs
   ```
5. Complete the setup wizard:
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

### Configuration Files

Pre-created config files are located at:
- `sentry.client.config.ts` — client-side error tracking
- `sentry.server.config.ts` — server-side error tracking
- `sentry.edge.config.ts` — edge function error tracking

All configs are automatically disabled if `NEXT_PUBLIC_SENTRY_DSN` is not set.

### Environment Variables

Add to your `.env.local` or `.env.production`:
```
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project_id
```

### Sampling Rates

- **Traces**: 10% (captures performance data for 1 in 10 transactions)
- **Replays on Error**: 100% (always capture replay when error occurs)
- **Replays on Session**: 1% (capture replay for 1 in 100 healthy sessions)

## Email Notifications — Resend

Transactional emails are sent via Resend for critical events: new bookings, low stock alerts, and order status updates.

### Setup

1. Sign up at https://resend.com
2. Verify your sending domain (or use Resend's default domain)
3. Create an API key from the **API Keys** section
4. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Development Mode

If `RESEND_API_KEY` is not set, emails are logged to console instead of sent (helpful for local testing).

### Notifications

The system sends automated notifications for these events:

#### New Booking
- **Trigger**: Customer submits a booking request
- **Recipient**: Restaurant owner
- **Route**: `/api/v1/owner/bookings/create`
- **Content**: Customer name, booking date/time, party size

#### Low Stock Alert
- **Trigger**: Inventory item falls below threshold (critical items only)
- **Recipient**: Restaurant owner
- **Route**: `/api/v1/owner/dashboard/low-stock`
- **Condition**: Set `NOTIFY_LOW_STOCK=true` to enable
- **Content**: Item name, current stock, threshold

#### Order Ready
- **Trigger**: Kitchen marks order as ready to serve
- **Recipient**: Restaurant owner
- **Content**: Order number, table name

### Notification Service

All email logic is centralized in `/lib/server/notifications/email.ts`:

```typescript
import { 
  notifyNewBooking, 
  notifyLowStock, 
  notifyOrderReady, 
  notifyBookingConfirmed 
} from '@/lib/server/notifications/email';
```

Notifications are fire-and-forget (non-blocking), ensuring they never cause request failures.

## Application Logs

Internal application events are logged via `/lib/logger.ts` to the `logs` table in Supabase.

### Log Levels

- **INFO**: General informational messages
- **WARN**: Warning conditions
- **ERROR**: Error conditions (non-fatal and fatal)
- **DEBUG**: Debug information (development only)
- **PERF**: Performance metrics

### Querying Logs

From the Supabase dashboard, view logs with:

```sql
SELECT 
  created_at,
  level,
  endpoint,
  message,
  metadata
FROM logs
ORDER BY created_at DESC
LIMIT 100;
```

Filter by restaurant:
```sql
SELECT * FROM logs
WHERE restaurant_id = 'restaurant-uuid'
ORDER BY created_at DESC;
```

### Performance Metrics

Performance timers track:
- Request duration (ms)
- Database queries
- Cache hits/misses

Tracked via:
```typescript
import { 
  startPerformanceTimer, 
  endPerformanceTimer,
  incrementDbQuery,
  incrementCacheHit,
  incrementCacheMiss
} from '@/lib/logger';
```

## Production Checklist

Before deploying to production, ensure:

- [ ] Sentry DSN is set in environment
- [ ] Resend API key is configured
- [ ] Email domain is verified in Resend
- [ ] Low stock notifications are enabled/disabled as needed
- [ ] Log retention policy is configured in Supabase
- [ ] Error alerts are configured in Sentry (Dashboard → Alerts)
- [ ] Team members are added to Sentry project for notifications

## Debugging

### Sentry Issues Not Appearing

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check browser console for errors
3. Ensure network tab shows successful POST to `api.sentry.io`
4. Test manually: `Sentry.captureException(new Error('test'))`

### Emails Not Sending

1. Verify `RESEND_API_KEY` is set
2. Check browser/server logs for `[Email]` messages
3. Verify email domain is verified in Resend dashboard
4. Test with `NOTIFY_LOW_STOCK=true` and manually trigger low stock condition

### Logs Not Appearing in Supabase

1. Check that `logs` table exists in Supabase
2. Verify database connection is working
3. Check Supabase RLS policies allow writes from API routes
4. View error details in Supabase realtime logs

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) — Development commands and architecture overview
- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Resend Docs](https://resend.com/docs)
- [Supabase Logs Guide](https://supabase.com/docs/guides/database/logs)
