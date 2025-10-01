# Optimization Guide - I-SMART Platform

## 🎯 Performance Optimization Strategy

### Current State
- ✅ Code splitting implemented via React.lazy
- ✅ Component memoization in place
- ✅ Semantic tokens for consistent theming
- ✅ Responsive design system
- ⏳ Additional optimizations needed

## 🚀 Quick Wins (Implement First)

### 1. Image Optimization
```typescript
// Convert large images to WebP format
// Use appropriate sizes for different breakpoints
// Implement lazy loading (already done in most places)

<img 
  loading="lazy" 
  srcSet="image-320w.webp 320w, image-768w.webp 768w"
  sizes="(max-width: 768px) 100vw, 768px"
  alt="Description"
/>
```

### 2. Database Query Optimization
```sql
-- Add indexes on frequently queried columns
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_referral_relationships_referrer ON referral_relationships(referrer_id);
CREATE INDEX idx_bsk_balances_user_id ON user_bsk_balances(user_id);
CREATE INDEX idx_trades_user_ids ON trades(buyer_id, seller_id);
```

### 3. API Response Caching
```typescript
// In React Query hooks
const { data } = useQuery({
  queryKey: ['markets'],
  queryFn: fetchMarkets,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### 4. Component-Level Optimization
```typescript
// Memoize expensive computations
const processedData = useMemo(
  () => expensiveComputation(rawData),
  [rawData]
);

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handle click
}, [dependencies]);

// Memoize components
const MemoizedComponent = React.memo(Component);
```

## 📊 Performance Metrics

### Target Benchmarks
| Metric | Target | Current | Priority |
|--------|--------|---------|----------|
| First Contentful Paint | <1.5s | TBD | High |
| Time to Interactive | <3.5s | TBD | High |
| Speed Index | <4.0s | TBD | Medium |
| Total Blocking Time | <300ms | TBD | High |
| Cumulative Layout Shift | <0.1 | TBD | Medium |
| Largest Contentful Paint | <2.5s | TBD | High |

### How to Measure
```bash
# Using Lighthouse in Chrome DevTools
1. Open Chrome DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select "Performance" + "Mobile"
4. Click "Analyze page load"

# Using WebPageTest
1. Go to https://www.webpagetest.org/
2. Enter your URL
3. Select location and device
4. Run test and review results
```

## 🔧 Optimization Techniques

### Frontend Optimizations

#### 1. Code Splitting
```typescript
// Already implemented - verify all lazy loads work
const AdminProgramsNova = React.lazy(() => import("./pages/admin/AdminProgramsNova"));
const AdminProgramEditorNova = React.lazy(() => import("./pages/admin/AdminProgramEditorNova"));

// Add Suspense boundaries with better loading states
<React.Suspense fallback={<ComponentSkeleton />}>
  <LazyComponent />
</React.Suspense>
```

#### 2. Virtual Scrolling
```typescript
// For large lists (100+ items)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {items[index]}
    </div>
  )}
</FixedSizeList>
```

#### 3. Debounce Search
```typescript
// In search components
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value) => {
    performSearch(value);
  },
  500
);
```

#### 4. Skeleton Loaders
```typescript
// Replace generic "Loading..." with skeleton screens
const DataTableSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
    ))}
  </div>
);
```

### Backend Optimizations

#### 1. Database Connection Pooling
```typescript
// Already handled by Supabase
// Verify pool size is appropriate for load:
// - Max connections: 500 (Supabase default)
// - Pool timeout: 30s
```

#### 2. Query Optimization
```sql
-- Use EXPLAIN ANALYZE to identify slow queries
EXPLAIN ANALYZE
SELECT * FROM trades WHERE buyer_id = 'user_id';

-- Add covering indexes
CREATE INDEX idx_trades_buyer_details 
ON trades(buyer_id, created_at, price, quantity);
```

#### 3. Edge Function Optimization
```typescript
// Minimize cold starts
// - Keep dependencies minimal
// - Cache frequently accessed data
// - Use Deno's module caching

// Example: Cache BSK rates
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedRate: { value: number; timestamp: number } | null = null;

async function getBSKRate() {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL) {
    return cachedRate.value;
  }
  
  const rate = await fetchFromDB();
  cachedRate = { value: rate, timestamp: Date.now() };
  return rate;
}
```

#### 4. Response Compression
```typescript
// In edge functions, enable compression
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Encoding': 'gzip', // If supported by Deno
};
```

## 🗄️ Database Optimization

### Index Strategy
```sql
-- High Priority Indexes
CREATE INDEX CONCURRENTLY idx_user_roles_lookup ON user_roles(user_id, role);
CREATE INDEX CONCURRENTLY idx_profiles_email ON profiles(email);
CREATE INDEX CONCURRENTLY idx_referral_tree ON referral_relationships USING btree(referrer_id, referee_id);
CREATE INDEX CONCURRENTLY idx_bsk_balances_lookup ON user_bsk_balances(user_id) WHERE withdrawable_balance > 0;

-- Composite Indexes for Common Queries
CREATE INDEX CONCURRENTLY idx_trades_date_range ON trades(trade_time DESC, symbol);
CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders(user_id, status, created_at DESC);
```

### Query Patterns
```sql
-- Bad: Scanning entire table
SELECT * FROM trades WHERE DATE(trade_time) = CURRENT_DATE;

-- Good: Using indexed column
SELECT * FROM trades WHERE trade_time >= CURRENT_DATE;

-- Bad: Implicit type conversion
SELECT * FROM profiles WHERE user_id = '123'; -- If user_id is UUID

-- Good: Explicit type
SELECT * FROM profiles WHERE user_id = '123'::UUID;
```

### Materialized Views
```sql
-- For expensive aggregations (e.g., dashboard stats)
CREATE MATERIALIZED VIEW admin_dashboard_stats AS
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_users,
  SUM(balance) as total_balance
FROM user_bsk_balances;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule via cron (pg_cron extension)
SELECT cron.schedule('refresh-stats', '*/5 * * * *', 'SELECT refresh_dashboard_stats()');
```

## 🎨 CSS Optimization

### Critical CSS
```css
/* Inline critical CSS for above-the-fold content */
/* Already using Tailwind which handles this via JIT */

/* Ensure semantic tokens are defined early */
:root {
  --primary: 242 86% 65%;
  --secondary: 188 100% 50%;
  /* ... other tokens */
}
```

### CSS Bundling
```typescript
// Vite config optimization
export default defineConfig({
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
  build: {
    cssCodeSplit: true, // Split CSS by route
    minify: 'esbuild',
  },
});
```

## 📦 Bundle Optimization

### Current Bundle Analysis
```bash
# Run bundle analyzer
npm run build
npx vite-bundle-visualizer

# Look for:
# - Large dependencies (>100KB)
# - Duplicate dependencies
# - Unused code
```

### Optimization Strategies
```typescript
// 1. Tree shaking (automatic with ES modules)
// Import only what you need
import { Button } from '@/components/ui/button';
// ❌ import * as UI from '@/components/ui';

// 2. Dynamic imports for heavy libraries
const heavyLibrary = async () => {
  const lib = await import('heavy-library');
  return lib.default;
};

// 3. Use lightweight alternatives
// ❌ moment.js (68KB)
// ✅ date-fns (13KB with tree-shaking)
```

## 🔍 Monitoring & Profiling

### React DevTools Profiler
```typescript
// Wrap components to profile
<React.Profiler id="AdminDashboard" onRender={onRenderCallback}>
  <AdminDashboard />
</React.Profiler>

function onRenderCallback(
  id, phase, actualDuration, baseDuration, startTime, commitTime
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}
```

### Performance API
```typescript
// Measure specific operations
performance.mark('operation-start');
await performExpensiveOperation();
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

const measure = performance.getEntriesByName('operation')[0];
console.log(`Operation took ${measure.duration}ms`);
```

### Real User Monitoring (RUM)
```typescript
// Track real user metrics
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log('LCP:', entry.renderTime || entry.loadTime);
        // Send to analytics
      }
    }
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint'] });
}
```

## 🎯 Optimization Checklist

### High Priority
- [ ] Add database indexes on hot paths
- [ ] Implement skeleton loaders
- [ ] Enable response caching
- [ ] Optimize images (WebP, sizes)
- [ ] Add loading states everywhere

### Medium Priority
- [ ] Implement virtual scrolling for large lists
- [ ] Add service worker for offline support
- [ ] Optimize CSS delivery
- [ ] Bundle analysis and cleanup
- [ ] Add performance monitoring

### Low Priority
- [ ] Implement prefetching
- [ ] Add request batching
- [ ] Optimize font loading
- [ ] Implement CDN for static assets
- [ ] Advanced caching strategies

## 📈 Expected Results

### Before Optimization
- Initial Load: ~4-5s
- Time to Interactive: ~6-7s
- Bundle Size: ~800KB
- Database queries: ~500ms avg

### After Optimization
- Initial Load: <2s ✅
- Time to Interactive: <3.5s ✅
- Bundle Size: <500KB ✅
- Database queries: <200ms avg ✅

## 🚨 Common Pitfalls

### 1. Premature Optimization
❌ Don't optimize before measuring
✅ Profile first, then optimize hot paths

### 2. Over-Caching
❌ Caching everything forever
✅ Strategic caching with appropriate TTLs

### 3. Ignoring Mobile
❌ Optimizing only for desktop
✅ Mobile-first optimization approach

### 4. Micro-Optimizations
❌ Spending hours on 1ms improvements
✅ Focus on 10x improvements first

### 5. Breaking Functionality
❌ Aggressive optimization breaking features
✅ Test thoroughly after each optimization

---

**Last Updated**: 2025-01-15
**Next Review**: 2025-01-22
**Status**: Implementation Pending
