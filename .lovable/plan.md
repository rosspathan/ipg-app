# Admin Shell Responsive Layout Refactor

## Goal
Rebuild only the `/admin` presentation shell so it uses the full viewport, supports a persistent desktop icon rail, and remains clean at desktop, tablet, and phone sizes without changing routes, data, actions, or user-facing screens.

## Implementation

### 1. Full-viewport admin shell
- Replace the current fixed/offset layout with a single `flex h-screen w-full overflow-hidden` admin root.
- Render the admin sidebar as the first desktop flex child.
- Put the topbar and a single independently scrolling `<main>` in the second `min-w-0 flex-1` column.
- Constrain only page content to `max-w-[1400px]` with the requested responsive 4/6/8 spacing; remove the existing admin shell wrappers that create narrow or competing scroll regions.

### 2. Responsive sidebar and mobile drawer
- Keep the current navigation groups, links, search, badges, active-state behavior, and stored open-group state unchanged.
- Add a desktop expanded/collapsed state persisted locally: 264px expanded and 72px icon rail collapsed.
- In rail mode, keep icons usable with accessible labels/tooltips and provide a visible expand control.
- Below 1024px, hide the desktop sidebar and use the existing full-height drawer at 280px with backdrop, Escape/backdrop/navigation close behavior, and body scroll locking.
- Ensure the navigation area is the only sidebar scrollbar.

### 3. Admin topbar
- Keep the 64px topbar fixed within the admin shell column.
- Preserve mobile menu, breadcrumbs, command search, notifications, and profile navigation while presenting the profile action as an avatar menu.
- Keep all controls at least 40px and ensure the title/action areas can shrink without clipping.

### 4. Dashboard layout
- Add the dashboard title/subtitle row with Refresh and Add Token actions, allowing clean wrapping on narrow screens.
- Use exactly `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` for the four statistics.
- Build admin-only stat cards with a normal flex row for label and icon, wrapped labels, and `text-3xl tabular-nums` values.
- Place Withdrawal queue and Quick links in `grid lg:grid-cols-2 gap-4`.
- Preserve all existing dashboard queries, counts, destinations, and actions; update only presentation.
- Keep quick links as icon chip + shrink-safe text block + chevron.

### 5. Verification
- Check `/admin` at 1440×900, 1024×768, 768×1024, and 390×844 for horizontal overflow, clipping, overlap, expected 4/4/2/1 stat columns, drawer behavior, and single-scroll-region behavior.
- Open the existing home, trade, and portfolio user pages and compare their rendered structure to confirm the admin-only changes did not affect them.
- Confirm the latest application build has no errors.

## Scope constraints
- Modify only admin layout, admin sidebar/topbar/drawer, and admin dashboard files.
- Do not change shared UI components, user layouts/pages, authentication, routes, data queries, Supabase, edge functions, or business logic.
