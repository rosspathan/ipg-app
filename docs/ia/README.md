# i-SMART Information Architecture Documentation

This directory contains the complete IA audit for the i-SMART crypto platform.

## 📄 Documents

### Primary Documents
1. **[IA_AUDIT_2025.md](./IA_AUDIT_2025.md)** - Complete route inventory, component analysis, and findings
2. **[component-inventory.csv](./component-inventory.csv)** - Structured data for all routes (Excel-ready)
3. **[migration-plan.md](./migration-plan.md)** - 16-week phased migration roadmap
4. **[LEGACY_COMPONENTS_REPORT.md](./LEGACY_COMPONENTS_REPORT.md)** - Critical legacy issues and remediation

### Visual Assets
1. **[ia-overview.png](./ia-overview.png)** - High-level sitemap showing all route hierarchies
2. **[component-dependencies.png](./component-dependencies.png)** - Component dependency diagram

---

## 🎯 Quick Summary

### Current Architecture
- **96 total routes** (58 user, 28 admin, 10 utility)
- **3 design systems** coexist: Legacy, Astra (user), Nova (admin)
- **CMS-driven** - Program Registry with versioning and audit trail
- **Mobile-first** - Bottom dock navigation, card lanes, responsive grids

### Critical Findings
🔴 **5 legacy screens** mixed into Astra user app (`/app/programs/*`)  
⚠️ **32 legacy user routes** need Astra migration (`/app-legacy/*`)  
⚠️ **20 legacy admin routes** need Nova migration (`/admin-legacy/*`)

### Migration Priority
1. **HIGH** - Remove 5 legacy screens from Astra routes (2-3 weeks)
2. **HIGH** - Complete Astra user app migration (3-4 weeks)
3. **MEDIUM** - Complete Nova admin migration (6-8 weeks)
4. **LOW** - CMS enhancements and componentization (3 weeks)

---

## 📊 Key Metrics

### Design System Adoption
- **Astra User**: 68% complete (11/16 routes pure Astra)
- **Nova Admin**: 100% complete (14/14 routes pure Nova)
- **Legacy Remaining**: 52 routes to migrate

### Component Reuse
- **Shared Components**: 6 (TradingScreen, Subscriptions, Staking, Referrals, BSKPromotion, Gamification)
- **Astra-Only**: 12 components
- **Nova-Only**: 11 components
- **Legacy-Only**: ~40 components (to be deprecated)

### Testing Coverage
- **testid Coverage**: 65% (22/34 modern pages have testids)
- **Missing testids**: 13 pages (3 Astra, 10 Admin-legacy)

---

## 🏗️ Architecture Highlights

### CMS Program Registry
Database-driven configuration system allowing admins to:
- ✅ Add/remove programs without code deploy
- ✅ Edit settings via schema-driven forms
- ✅ Schedule launches (effective_from/to dates)
- ✅ Gate by region or user role
- ✅ Preview changes before publish
- ✅ Rollback to any previous version
- ✅ Full audit trail (who/when/what)

**Tables**:
- `program_modules` - Program catalog
- `program_configs` - Versioned configurations (JSONB)
- `program_audit` - Change history

**Functions**:
- `get_current_program_config(key)` - Fetch active config
- `publish_program_config(id, operator)` - Publish with versioning + audit

### Mobile-First Navigation
**User App (Astra)**:
```
Bottom Dock (sticky):
[Home] [Wallet] [○ Programs] [Trade] [Profile]
                  ↑ Center highlight
```

**Admin (Nova)**:
```
Bottom Dock (sticky):
[Overview] [Users] [○ +] [Markets] [Reports]
                    ↑ Quick Add menu
```

### Component Patterns

#### CardLane Pattern (Horizontal Scroll)
```tsx
<CardLane title="Balance">
  <BalanceCard asset="BTC" amount={0.5} />
  <BalanceCard asset="ETH" amount={2.3} />
  <BalanceCard asset="USDT" amount={1000} />
</CardLane>
```
**Used in**: All Astra pages, All Nova admin pages

#### GridViewport Pattern (Vertical Grid)
```tsx
<GridViewport>
  <ProgramTile key="spin" name="Spin Wheel" />
  <ProgramTile key="insurance" name="Insurance" />
  <ProgramTile key="staking" name="Staking" />
</GridViewport>
```
**Used in**: Astra Programs, Home, Wallet pages

#### DataGridAdaptive (Admin Tables)
```tsx
<DataGridAdaptive
  data={users}
  columns={userColumns}
  filters={<FilterChips />}
  onRowClick={(user) => openDetailSheet(user)}
/>
```
**Used in**: Nova admin pages (Users, Markets)

---

## 🚀 Next Steps

### For Developers
1. Read `IA_AUDIT_2025.md` for full context
2. Review `LEGACY_COMPONENTS_REPORT.md` for critical issues
3. Follow `migration-plan.md` for phased approach
4. Use `component-inventory.csv` for route reference

### For Product Team
1. Review visual sitemap (`ia-overview.png`)
2. Approve migration timeline (16 weeks)
3. Plan user communication for legacy deprecation
4. Define success metrics

### For QA Team
1. Add testids to remaining 13 pages
2. Create E2E tests based on route inventory
3. Test CMS functionality (Program Registry)
4. Validate mobile responsiveness (360-430px)

---

## 📚 Related Documentation
- `/brand/` - Design system tokens and guidelines
- `/brand/NOVA_ADMIN_DS_PHASE_*.md` - Nova admin design evolution
- `/brand/QA_CHECKLIST.md` - Quality checklist
- `src/config/routes.ts` - Route constants

---

**Questions?** Contact the architecture team or refer to inline code comments.
