# Feature: BetterBond Commission Payments

## Summary
A centralised tool for BetterBond commission staff to review, park, and process agent commission payments. Provides a per-agency payment management workflow with a real-time dashboard, payment grids with park/unpark actions, bulk payment initiation, invoice generation, and admin utilities across three user roles (Admin, Operator, Viewer).

## Epics
1. **Epic 1: Authentication & App Shell** - Set up authenticated layout with BFF auth redirect, top navigation bar, user display name, logout, and role-based visibility scaffolding (Admin/Operator/Viewer). | Status: Pending | Dir: `epic-1-auth-app-shell/`
2. **Epic 2: Dashboard Screen** - Six chart/stat components, Agency Summary grid, agency-scoped filtering, Manage navigation, and ZAR currency formatting. | Status: Pending | Dir: `epic-2-dashboard/`
3. **Epic 3: Payment Management Screen** - Main Grid and Parked Grid, client-side filtering, Park/Unpark flows with confirmation modals, role-based action buttons, loading states, and error handling. | Status: Pending | Dir: `epic-3-payment-management/`
4. **Epic 4: Initiate Payment Flow** - Admin-only Initiate Payment button, confirmation modal, POST batch API call with LastChangedUser header, and post-success behaviour. | Status: Pending | Dir: `epic-4-initiate-payment/`
5. **Epic 5: Payments Made Screen & Invoice Generation** - Batches grid, search/filter, and client-side PDF invoice generation. | Status: Pending | Dir: `epic-5-payments-made/`
6. **Epic 6: Admin Utilities** - Reset Demo Data button and User Management section. | Status: Pending | Dir: `epic-6-admin-utilities/`

## Epic Dependencies
- Epic 1: Authentication & App Shell (no dependencies — must be first)
- Epic 2: Dashboard Screen (depends on Epic 1 — independent, can parallel with Epic 3 and Epic 6)
- Epic 3: Payment Management Screen (depends on Epic 1 — independent, can parallel with Epic 2 and Epic 6)
- Epic 4: Initiate Payment Flow (depends on Epic 3)
- Epic 5: Payments Made Screen & Invoice Generation (depends on Epic 4)
- Epic 6: Admin Utilities (depends on Epic 1 — independent, can parallel with Epic 2 and Epic 3)
