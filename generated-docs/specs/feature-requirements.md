# Feature: BetterBond Commission Payments

## Problem Statement

BetterBond commission staff currently lack a centralised tool to review, park, and process agent commission payments. This application provides operators with a per-agency payment management workflow and a real-time dashboard of payment activity. Commission processors (operators and admins) need a single interface to monitor payment readiness, park payments that require deferral, initiate bulk payment batches per agency, and access generated invoices for completed batches.

---

## User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| Admin | Full system access including sensitive operations | View all screens; Park/Unpark payments; Initiate Payment; Reset Demo Data; Manage user accounts |
| Operator | Day-to-day payment processing | View all screens; Park/Unpark payments; cannot Initiate Payment; cannot Reset Demo Data; cannot manage users |
| Viewer | Read-only access | View Dashboard, Payment Management grid (no action buttons), and Payments Made screen; no Park/Unpark/Initiate Payment actions |

---

## Functional Requirements

### Authentication and Navigation

- **R1:** Unauthenticated users who access any route are automatically redirected to the BFF auth service at `http://localhost:5120/auth/login`. The Next.js app does not render a custom login page.
- **R2:** After successful authentication, the app displays a persistent top navigation bar with links to three screens: Dashboard, Payment Management, and Payments Made.
- **R3:** The current user's display name is fetched from the BFF endpoint `GET http://localhost:5120/auth/me` and shown in the navigation header.
- **R4:** A "Logout" action in the header calls `http://localhost:5120/auth/logout` and redirects the user back to the login flow.

### Screen 1: Dashboard

- **R5:** The Dashboard screen calls `GET /v1/payments/dashboard` to retrieve all dashboard data and displays the following six components: Payments Ready for Payment (bar chart), Parked Payments (bar chart), Total Value Ready for Payment (stat card), Total Value of Parked Payments (stat card), Parked Payments Aging Report (bar chart), and Payments Made (Last 14 Days) (stat card).
- **R6:** The Dashboard screen displays an Agency Summary grid with columns: Agency Name, Number of Payments (READY, not parked), Total Commission Amount (R), and VAT (R). Each row has a "Manage" button that navigates to the Payment Management screen scoped to that agency.
- **R7:** Clicking a row in the Agency Summary grid updates all six dashboard chart components to reflect data for the selected agency only.
- **R8:** The "Payments Ready for Payment" bar chart displays the count of READY payments per agency, split by Commission Type ("Bond Comm" and "Manual Payments").
- **R9:** The "Parked Payments" bar chart displays the count of PARKED payments per agency, split by Commission Type ("Bond Comm" and "Manual Payments").
- **R10:** The "Total Value Ready for Payment" stat card displays the sum of CommissionAmount for all READY payments for the selected agency (or all agencies if none selected), formatted as South African Rand (e.g., R 1 234 567,89).
- **R11:** The "Total Value of Parked Payments" stat card displays the sum of CommissionAmount for all PARKED payments for the selected agency (or all agencies if none selected), formatted as South African Rand.
- **R12:** The "Parked Payments Aging Report" bar chart displays how long payments have been parked, grouped into three ranges: 1–3 days, 4–7 days, >7 days. The frontend computes these buckets from the raw `ParkedPaymentsAgingReport` data returned by the dashboard API (field: `Range` on each `ParkedPaymentsAgingReportItem`).
- **R13:** The "Payments Made (Last 14 Days)" stat card displays the integer value from `TotalPaymentCountInLast14Days` in the dashboard API response, labelled "Payments Made (Last 14 Days)".
- **R14:** Clicking the "Manage" button on an Agency Summary row navigates to `/payment-management?agency=<AgencyName>`, where `<AgencyName>` is URL-encoded.

### Screen 2: Payment Management

- **R15:** The Payment Management screen is always scoped to a single agency, determined by the `agency` query parameter. If the parameter is absent, the user is redirected to the Dashboard.
- **R16:** The Payment Management screen displays the agency name as the page heading.
- **R17:** The screen contains two grids: the Main Grid (READY payments) and the Parked Grid (PARKED payments), both populated by calling `GET /v1/payments?AgencyName=<agency>` and filtering by Status on the frontend.
- **R18:** The Main Grid displays the following columns: Agency Name, Batch ID, Claim Date, Agent Name & Surname, Bond Amount (R), Commission Type, Commission % (computed), Grant Date, Reg Date, Bank, Commission Amount (R), VAT (R), Status.
- **R19:** Commission % is computed client-side as `(CommissionAmount / BondAmount) * 100`, displayed to 3 decimal places (e.g., 0.945%).
- **R20:** The Parked Grid displays identical columns to the Main Grid.
- **R21:** A filter/search bar above each grid allows free-text filtering on Claim Date, Agency Name, and Status fields. Filtering is applied client-side against the loaded data.
- **R22:** Each row in the Main Grid includes a "Park" button (visible to Admin and Operator; hidden for Viewer). Clicking "Park" opens a confirmation modal showing the agent name, claim date, and commission amount before the action proceeds.
- **R23:** The Main Grid supports multi-select via checkboxes. A "Park Selected" button appears when one or more rows are checked. Clicking "Park Selected" opens a confirmation modal showing the count and total combined commission amount of selected payments.
- **R24:** On confirmation of single or bulk park, the frontend calls `PUT /v1/payments/park` with the selected payment IDs in the `PaymentIds` array. On success, the affected payments move from the Main Grid to the Parked Grid without a full page reload.
- **R25:** Each row in the Parked Grid includes an "Unpark" button (visible to Admin and Operator; hidden for Viewer). Clicking "Unpark" opens a confirmation modal mirroring the park confirmation flow.
- **R26:** The Parked Grid supports multi-select via checkboxes. A "Unpark Selected" button appears when one or more rows are checked. Clicking "Unpark Selected" opens a confirmation modal showing the count and total combined commission amount.
- **R27:** On confirmation of single or bulk unpark, the frontend calls `PUT /v1/payments/unpark` with the selected payment IDs. On success, the affected payments move from the Parked Grid to the Main Grid without a full page reload.
- **R28:** Checkbox selection is grid-specific: checkboxes in the Main Grid control parking only; checkboxes in the Parked Grid control unparking only. There is no cross-grid selection.
- **R29:** An "Initiate Payment" button appears above the Main Grid (visible to Admin only; hidden for Operator and Viewer). The button is disabled when the Main Grid contains zero READY payments.
- **R30:** Clicking "Initiate Payment" (when enabled) opens a confirmation modal showing the count and total value of payments that will be processed (all READY payments in the Main Grid).
- **R31:** On confirmation of "Initiate Payment", the frontend calls `POST /v1/payment-batches` with the `LastChangedUser` header (current user's name from the auth/me response) and a `PaymentIds` array containing all READY payment IDs. The request body must include all READY payment IDs for the current agency.
- **R32:** After a successful `POST /v1/payment-batches` response, the app stays on Screen 2, clears the Main Grid (since processed payments are no longer READY), and displays a success modal confirming the batch was created. The user navigates back to the Dashboard manually.
- **R33:** All action buttons (Park, Unpark, Park Selected, Unpark Selected, Initiate Payment) are disabled and a loading spinner is shown on the triggering button during any in-flight API call, to prevent double-submission.

### Screen 3: Payments Made

- **R34:** The Payments Made screen calls `GET /v1/payment-batches` and displays a grid with columns: Agency Name, Reference, Number of Payments, Total Commission Amount (R), VAT (R), Created Date, Invoice Link.
- **R35:** The Payments Made grid supports a search/filter bar for filtering by Agency Name or Batch Reference (client-side free-text filter).
- **R36:** The "Invoice Link" column for each row contains a link that opens the generated invoice PDF in a new browser tab. The PDF is client-side generated (see R37–R39); the link triggers on-demand generation when clicked.
- **R37:** Invoice PDFs are generated entirely on the frontend using the batch data and agency details. The frontend assembles the invoice matching the Annexure A layout from the feature spec (MortgageMax logo, agency address, VAT number, bank account, itemised payment list, commission breakdown, VAT, total).
- **R38:** To generate an invoice, the frontend requires full agency details (name, address, VAT number, bank account). The source of these agency details must be established during DESIGN — either fetched from a dedicated agency endpoint, embedded in the payment-batch response, or resolved from a static lookup. This is a critical architecture decision.

  > **Note on API contradiction:** The OpenAPI spec includes `POST /v1/payment-batches/{Id}/download-invoice-pdf` which returns `application/octet-stream`. This conflicts with the user's stated preference for frontend-only PDF generation. The user has confirmed frontend generation. If the backend PDF endpoint is later preferred, this requirement should be revisited.

- **R39:** The generated invoice PDF opens in a new browser tab (not auto-downloaded).

### User Management

- **R40:** An admin-only "Manage Users" section allows Admin users to create and manage user accounts. The specific user management UI and API endpoints are to be defined during DESIGN phase.
- **R41:** User management controls are inaccessible to Operator and Viewer roles.

### Demo Administration

- **R42:** An "Reset Demo Data" button is visible only to Admin users, accessible from the application header or a dedicated admin area.
- **R43:** Clicking "Reset Demo Data" calls `POST /demo/reset-demo`. On success (HTTP 200), the app reloads or refreshes all data to reflect the reset state.

---

## Business Rules

- **BR1:** Only Admin and Operator roles can Park or Unpark payments. Viewer users do not see Park/Unpark buttons.
- **BR2:** Only the Admin role can Initiate Payment. Operator and Viewer users do not see the "Initiate Payment" button.
- **BR3:** Only Admin role can access Reset Demo Data. Operator and Viewer do not see this control.
- **BR4:** Only READY payments are included in an "Initiate Payment" batch. PARKED payments must be unparked (returned to READY status) before they can be included in a batch.
- **BR5:** One "Initiate Payment" action = one payment batch = one agency = one invoice. The batch covers all READY payments for the current agency at the time of confirmation.
- **BR6:** The "Initiate Payment" button is disabled (not hidden) when the Main Grid contains zero READY payments.
- **BR7:** When the user clicks a row in the Dashboard Agency Summary grid, all six dashboard chart components update to show data for the selected agency only. The default state (no agency selected) shows aggregated data for all agencies.
- **BR8:** The Payment Management screen is always scoped to a single agency. Users cannot switch agency on Screen 2; they must navigate back to the Dashboard and select a different agency row.
- **BR9:** When any API call returns an HTTP 500 response, the app displays an error toast or modal showing the message(s) from the `DefaultResponse.Messages` array. No partial grid updates occur on error — the UI state remains as it was before the failed call.
- **BR10:** When any API call returns HTTP 401 (Unauthorized), the user is redirected to the BFF login URL (`http://localhost:5120/auth/login`).
- **BR11:** All monetary values are displayed in South African Rand format: "R 1 234 567,89" (space as thousands separator, comma as decimal separator, en-ZA locale).
- **BR12:** Commission % is always computed client-side as `CommissionAmount / BondAmount * 100` and displayed to exactly 3 decimal places.
- **BR13:** The `LastChangedUser` header sent with `POST /v1/payment-batches` must contain the current user's name as returned by `GET http://localhost:5120/auth/me`. The exact field name within the auth/me response is TBD — to be confirmed with the auth service during DESIGN.
- **BR14:** Invoice PDF generation is a separate, on-demand action from Screen 3. Invoices are not auto-generated or auto-downloaded when Screen 3 loads. The user explicitly clicks the Invoice Link to trigger generation.

---

## Data Model

### API Entities (from OpenAPI spec)

| Entity | Key Fields | Notes |
|--------|------------|-------|
| PaymentRead | Id, Reference, AgencyName, ClaimDate, AgentName, AgentSurname, LastChangedUser, LastChangedDate, BondAmount, CommissionType, GrantDate, RegistrationDate, Bank, CommissionAmount, VAT, Status (READY/PARKED/PROCESSED), BatchId | Core payment record; Commission % computed from CommissionAmount/BondAmount |
| PaymentBatchRead | Id, CreatedDate, Status, Reference, LastChangedUser, AgencyName, PaymentCount, TotalCommissionAmount, TotalVat | Represents a processed payment batch (one per agency per Initiate Payment action) |
| PaymentsDashboardRead | PaymentStatusReport[], ParkedPaymentsAgingReport[], TotalPaymentCountInLast14Days, PaymentsByAgency[] | Aggregated dashboard data |
| PaymentStatusReportItem | Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName | Used for bar charts on dashboard |
| ParkedPaymentsAgingReportItem | Range, AgencyName, PaymentCount | Raw aging data; frontend groups into 1–3, 4–7, >7 day buckets |
| PaymentsByAgencyReportItem | AgencyName, PaymentCount, TotalCommissionCount, Vat | Agency summary for Dashboard grid |
| DefaultResponse | Id, MessageType, Messages[] | Standard error/response envelope |

### Frontend-Computed Fields

| Field | Computation | Displayed On |
|-------|-------------|--------------|
| Commission % | `(CommissionAmount / BondAmount) * 100` | Main Grid, Parked Grid (3 decimal places) |
| Parked aging buckets | Group ParkedPaymentsAgingReportItem by Range into 1–3, 4–7, >7 days | Dashboard aging chart |

### Agency Details (Architecture Gap)

The invoice PDF (R37–R38) requires agency-level detail fields not present in the current API spec: agency address, VAT number, bank account number. The source for these fields must be resolved during DESIGN phase. Options include: (a) a new `/v1/agencies/{AgencyName}` endpoint, (b) embedding agency details in the PaymentBatchRead schema, or (c) a static lookup embedded in the frontend. This is a required input for invoice generation.

---

## Key Workflows

### Workflow 1: View Dashboard and Navigate to Agency

1. User lands on the Dashboard screen (authenticated).
2. App calls `GET /v1/payments/dashboard`; loading state shown during fetch.
3. Dashboard renders six components with aggregated (all-agency) data and the Agency Summary grid.
4. User clicks "Manage" on an agency row.
5. All chart components update to show data for the selected agency.
6. App navigates to `/payment-management?agency=<AgencyName>`.

### Workflow 2: Park a Single Payment

1. Admin or Operator is on Screen 2 (Payment Management) for a specific agency.
2. User clicks "Park" on a payment row in the Main Grid.
3. Confirmation modal appears showing: agent name, claim date, commission amount.
4. User clicks "Confirm".
5. All action buttons disabled; spinner shown on "Park" button.
6. App calls `PUT /v1/payments/park` with `PaymentIds: [id]`.
7. On success: payment removed from Main Grid, added to Parked Grid. Buttons re-enabled.
8. On error: error toast/modal shown with message from API `DefaultResponse.Messages`; grid unchanged.

### Workflow 3: Bulk Park Payments

1. Admin or Operator selects multiple rows in the Main Grid via checkboxes.
2. "Park Selected" button appears; user clicks it.
3. Confirmation modal shows count and total commission amount of selected payments.
4. User clicks "Confirm".
5. All action buttons disabled during API call.
6. App calls `PUT /v1/payments/park` with `PaymentIds: [id1, id2, ...]`.
7. On success: selected payments removed from Main Grid, added to Parked Grid.
8. On error: error toast/modal shown; grid unchanged.

### Workflow 4: Unpark Payments

1. Admin or Operator clicks "Unpark" on a row in the Parked Grid (or selects multiple via checkboxes and clicks "Unpark Selected").
2. Confirmation modal mirrors the park confirmation flow.
3. On confirmation, app calls `PUT /v1/payments/unpark` with selected payment IDs.
4. On success: payments return to the Main Grid.
5. On error: error toast/modal shown; grid unchanged.

### Workflow 5: Initiate Payment (Admin Only)

1. Admin is on Screen 2 with one or more READY payments in the Main Grid.
2. Admin clicks "Initiate Payment" (enabled because Main Grid has READY payments).
3. Confirmation modal shows count and total value of all READY payments.
4. Admin clicks "Confirm".
5. All action buttons disabled; loading spinner shown on "Initiate Payment" button.
6. App calls `POST /v1/payment-batches` with `LastChangedUser` header and `PaymentIds` array of all READY payment IDs.
7. On success: Main Grid clears. Success modal shown confirming batch created.
8. User dismisses modal and remains on Screen 2 (or navigates back to Dashboard manually).
9. On error: error toast/modal shown with API error message; no state changes made.

### Workflow 6: Access Invoice from Payments Made

1. User navigates to Screen 3 (Payments Made).
2. App calls `GET /v1/payment-batches`; grid renders with batch rows.
3. User optionally filters by Agency Name or Batch Reference.
4. User clicks the "Invoice Link" for a batch row.
5. Frontend retrieves agency details (source TBD per R38) and assembles invoice PDF in the browser.
6. PDF opens in a new browser tab.

### Workflow 7: Reset Demo Data (Admin Only)

1. Admin clicks "Reset Demo Data" button in the header.
2. App calls `POST /demo/reset-demo`.
3. On HTTP 200: app reloads or refreshes all data.
4. On error: error toast shown with relevant message.

---

## Non-Functional Requirements

- **NFR1:** The application must be responsive and function correctly on mobile, tablet, and desktop screen sizes using Tailwind CSS responsive breakpoints.
- **NFR2:** Accessibility: Shadcn UI components' built-in ARIA attributes provide baseline accessibility. Formal WCAG compliance is not required for this POC.
- **NFR3:** No formal performance targets are required for this POC.
- **NFR4:** Browser support: latest stable versions of Google Chrome and Microsoft Edge. Internet Explorer and Safari are not required.
- **NFR5:** Locale: South African (`en-ZA`). Currency formatted as "R 1 234 567,89" (space-separated thousands, comma decimal). Dates displayed in dd/mm/yyyy format.
- **NFR6:** The MortgageMax logo (`documentation/morgagemaxlogo.png`) must appear in the application header and on generated invoices.
- **NFR7:** All UI components use Shadcn UI (via MCP). No hand-rolled Shadcn-style components.
- **NFR8:** All API calls use the project's API client (`web/src/lib/api/client.ts`). No direct `fetch()` calls in components.
- **NFR9:** The API backend base URL is `http://localhost:8042`. The BFF auth service base URL is `http://localhost:5120`.

---

## Out of Scope

- CSV or Excel export of any grid data.
- Email notifications for any event (payment processed, batch created, etc.).
- Audit log or change history for payment actions.
- Payment creation (the app processes existing payments only — it does not create new payment records).
- Safari browser support.
- Internet Explorer browser support.
- Formal WCAG compliance.
- Server-side invoice generation (the API endpoint `POST /v1/payment-batches/{Id}/download-invoice-pdf` exists in the spec but invoice generation is handled client-side per user decision).

---

## Source Traceability

| ID | Source | Reference |
|----|--------|-----------|
| R1 | User input | Clarifying question: "What is the login/auth flow — does the app have its own login page?" |
| R2 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Overview — "three primary screens: Dashboard, Payment Management, Payments Made"; User input — confirmed persistent top nav |
| R3 | User input | Clarifying question: "Where does the current user's name come from for the LastChangedUser header?" |
| R4 | `intake-manifest.json` | `context.bffEndpoints.logout` |
| R5 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Dashboard Components"; `documentation/Api Definition.yaml` — `GET /v1/payments/dashboard` |
| R6 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Dashboard Grid (Agency Summary)" |
| R7 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Behaviour: Selecting a record dynamically updates the dashboard graphs"; User input — "Dashboard: All charts filter to selected agency when a row is clicked" |
| R8 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Payments Ready for Payment (Bar Chart)" |
| R9 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Parked Payments (Bar Chart)" |
| R10 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Total Value Ready for Payment" |
| R11 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Total Value of Parked Payments" |
| R12 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Parked Payments Aging Report"; User input — "Frontend computes buckets from raw data" |
| R13 | User input | Clarifying question: "The spec says 'Total Value of Payments Made (Last 14 Days)' but what is the actual API field?" — user confirmed `TotalPaymentCountInLast14Days` and label change |
| R14 | User input | Clarifying question: "How does a user navigate from the Dashboard to Screen 2?" — confirmed query param `/payment-management?agency=AgencyName` |
| R15 | User input | Clarifying question: "Is Screen 2 always scoped to one agency?" — confirmed; missing agency param redirects to Dashboard |
| R16 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Purpose: operational hub per agency" |
| R17 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — Main Grid and Parked Grid descriptions; `documentation/Api Definition.yaml` — `GET /v1/payments` with AgencyName filter |
| R18 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Columns" list under Main Grid |
| R19 | User input | Clarifying question: "How is Commission % calculated?" — confirmed client-side, 3 decimal places |
| R20 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Parked Grid: Fields: identical to Main Grid" |
| R21 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Search Bar: Filter by Claim Date, Agency Name, Status"; User input — confirmed all are free-text fields |
| R22 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Single Payment Parking" section |
| R23 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Bulk Parking" section |
| R24 | `documentation/Api Definition.yaml` | `PUT /v1/payments/park` |
| R25 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Parked Grid: Functions: Unpark individual or multiple payments" |
| R26 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Parked Grid: Functions: multiple payments" |
| R27 | `documentation/Api Definition.yaml` | `PUT /v1/payments/unpark` |
| R28 | User input | Clarifying question: "Do checkboxes work across both grids?" — confirmed grid-specific selection only |
| R29 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Initiate Payment" section; User input — Admin-only; disabled when zero READY payments |
| R30 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 2 — "Clicking triggers confirmation modal summarising: Number of payments, Total value" |
| R31 | `documentation/Api Definition.yaml` | `POST /v1/payment-batches` — `LastChangedUser` header, `PaymentIds` body |
| R32 | User input | Clarifying question: "After Initiate Payment succeeds, what happens?" — confirmed stay on Screen 2, success modal, manual navigation back |
| R33 | User input | Clarifying question: "How are loading states handled?" — confirmed button spinner + all actions disabled |
| R34 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 3 — Main Grid fields description; `documentation/Api Definition.yaml` — `GET /v1/payment-batches` |
| R35 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 3 — "Search bar for filtering by Agency Name or Batch ID" |
| R36 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 3 — "Invoice Link — opens/downloads PDF"; User input — confirmed opens in new tab |
| R37 | User input | Clarifying question: "Is invoice PDF generation server-side or client-side?" — confirmed frontend-only |
| R38 | User input | Clarifying question: "Where do agency details for the invoice come from?" — confirmed as open architecture decision for DESIGN phase |
| R39 | User input | Clarifying question: "Does the invoice open in a new tab or auto-download?" — confirmed new browser tab |
| R40 | User input | Clarifying question: "Is user management in scope?" — confirmed Admin can create/manage user accounts |
| R41 | User input | Clarifying question: "Who can access user management?" — confirmed Admin only |
| R42 | User input | Clarifying question: "Is the Reset Demo Data button in scope?" — confirmed Admin-only in header |
| R43 | `documentation/Api Definition.yaml` | `POST /demo/reset-demo` |
| BR1 | User input | Clarifying question: "Who can Park/Unpark?" — Admin and Operator only |
| BR2 | User input | Clarifying question: "Who can Initiate Payment?" — Admin only |
| BR3 | User input | Clarifying question: "Who can Reset Demo Data?" — Admin only |
| BR4 | User input | Clarifying question: "Can PARKED payments be included in Initiate Payment?" — confirmed must unpark first |
| BR5 | User input | Clarifying question: "How many agencies per batch?" — confirmed one batch = one agency = one invoice |
| BR6 | User input | Clarifying question: "What happens to Initiate Payment button when no READY payments?" — confirmed disabled |
| BR7 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Screen 1 — "Behaviour: Selecting a record dynamically updates the dashboard graphs" |
| BR8 | User input | Clarifying question: "Can users switch agencies on Screen 2?" — confirmed must go back to Dashboard |
| BR9 | User input | Clarifying question: "How are API errors surfaced?" — confirmed error toast with Messages array |
| BR10 | `documentation/Api Definition.yaml` | All endpoints return `401 Unauthorized`; `intake-manifest.json` — `context.bffEndpoints.login` |
| BR11 | `intake-manifest.json` | `context.stylingNotes` — "South African locale: en-ZA, currency format R 1 234 567,89" |
| BR12 | User input | Clarifying question: "How is Commission % calculated and displayed?" — confirmed client-side, 3 decimal places |
| BR13 | User input | Clarifying question: "Where does the current user's name come from for LastChangedUser?" — confirmed from auth/me; field name TBD |
| BR14 | User input | Clarifying question: "Is invoice download automatic or on-demand?" — confirmed on-demand via Invoice Link |
