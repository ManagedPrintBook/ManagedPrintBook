# Managed Print Contracts & Billing (Lease · FSMA · ORS · Sales)
Single-file web app (`index.html`). Data is stored in the browser (localStorage) until Supabase sync is wired.

## Deploy
1. Push this folder to a **private** GitHub repo.
2. Vercel → Add New Project → import the repo → Framework "Other" → Deploy (no build step).
3. Supabase → SQL Editor → run `supabase/schema.sql`. (Cloud sync + login is the next step.)

Never commit customer exports (CSV/backup files) — they are git-ignored.

## Cloud sync (Supabase)
Email + password login; the whole app database is saved to `public.app_state` (one row per user, protected by row-level security) a couple of seconds after every change. "Work offline" skips sync. In Supabase → Authentication → Providers → Email you can switch off "Confirm email" for instant sign-up. 

## Add-on modules (addons.js, addons2.js)
Customer Details, Delivery Notes + warranty/AMC certificates, Machine Lifecycle, Toner Alerts, Renewal Pipeline, Targets & Commission,
Cash-Flow Forecast, Send Reminders (WhatsApp/email), e-Invoicing Readiness, Suppliers (details, purchase bills, part price finder with
lowest-price suggestion, expenses & P&L), branch filter (DXB/SHJ/AUH) and service-ticket SLA/cost.

### Customer portal (one-time setup)
Run `supabase/portal.sql` in Supabase → SQL Editor. Then Customers → Customer Portal → "Create link" per customer.
Customers open `/portal?t=…` (no login) to send readings, request toner, log problems and see invoices/balance; you accept items from the Inbox.

### Secure key v2 (one-time setup)
Run `supabase/security.sql` in Supabase → SQL Editor. The admin then sets ONE company-wide key (6–8 digits) at next sign-in.
It is stored hashed on the server, checked on the server, and wrong tries are limited (5 tries, then 5-minute lock). Staff can only enter it, never set it.
The app locks after 1 minute idle, when you return from another tab/window after more than 1 minute, and after a page reload. Closing the tab signs out completely.
Forgot the key? SQL Editor: `delete from public.app_security;`

## Add-on 4 (addons4.js)
PDC tracker, security deposits, collections follow-up + payment link, management dashboard, owner report, technician schedule,
engineer visits (GPS + signature), meter reading from a WhatsApp message, contract templates (Lease/AMC/FSMA, also in Quote),
agreements with on-screen signatures, customer signature on quotes.

## Add-on 11 (addons11.js) — Transfer machines to another company
Machine row ⇄ Transfer, customer → More ▾ → "Transfer machines to another company…", and Sr.# search → Transfer.
Single or Bulk mode, effective date, new-company details shown once for verification, free-allowance carry-over tick,
optional closing counters. The old company stops being billed from the effective date (lease and excess), the new company is
billed from it; old invoices stay. Sr.# search shows the current company first, previous companies greyed, plus an ownership
timeline, and offers "Resolve as transfer" when a Sr.# is Active under two companies. Bills are blocked if one Sr.# would be
billed to two companies for the same dates.

## Add-on 12 (addons12.js) + supabase/phase2.sql
- **Backups:** every backup is password-encrypted (no silent plain download); a reminder bar shows when one is due (default 7 days). With phase2.sql run once, the app also keeps 8 rolling cloud snapshots (one automatically every 7 days) with a Restore button in Settings.
- **Contracts → Duplicate Sr.# Check:** lists every Sr.# that is Active in more than one place; "Resolve as transfer" (two companies) or "Keep one…" (same company).
- **Stock → 🏷 Fix item types:** bulk Goods/Service; the import now also reads Category / Item Group columns for the type. Service items are never stock-checked.
- **View only role:** Admin → Users → role "View only". Reads the Admin's data; server policy gives no write access; buttons for add/edit/delete are hidden.

## Add-on 13 (addons13.js) — print lock, Excel import, Billing Calendar
- **Print lock:** Ctrl+P / Print prints a blank white page everywhere except when one individual invoice is open.
- **Contracts → Import from Excel:** reads Equipment ID, Contract/Invoice No, Start/End Date, Free Copies, Type, Billing Cycle, Customer, Department, LPO, Brand, Model, Serial. Customers go under a Group (e.g. Joseph Group); "Unlimited" = unlimited free mono & colour, no excess charge. A built-in button loads the Joseph Group list.
- **Accounts → Billing Calendar / Reading Tracker:** all active lease customers (or all machines): month list, year overview grid, and a "Missing start dates" fixer. Dates run from machine start date (else contract start) every lease cycle, plus excess-cycle dates when the machine has excess rates, until contract end. Tick "Reading collected" (a saved reading for that month also counts); export a month to Excel.
- **Frozen headings** in the Billing Calendar tables (Jan–Dec header and first column stay in view). **Lease prices** tab: lease bills are advance bills (price per monthly / quarterly / yearly cycle); machines with no lease amount cannot be billed, so the amount is entered here or in the Excel import preview.

## Add-ons 21–23 (v20261027a)
- **addons21.js** — Ctrl+K search everything · Tasks & reminders (Home “My tasks” card) · Custom fields (Admin) · Saved views (📌 in the header) · Two-step login (authenticator app via Supabase MFA) + sign-in history (Admin → Security & Sign-ins).
- **addons22.js** — Accounts: MRR dashboard · Deferred revenue · Bad-debt write-off / provision / recoveries · Payables ageing & supplier payments · Anniversary price-increase notices.
- **addons23.js** — Contracts: Machine asset register · Termination & buy-out quote · Right-sizing report.
- **supabase/phase3.sql** — run once: shared team tasks, shared saved views, login history. Without it tasks/views are kept in your own data only and the sign-in history page stays empty.

## Add-ons 24–25 (v20261028a)
- **addons24.js** — Preventive maintenance plans · Toner reorder suggestions · Machine lifecycle timeline · Technician mobile page (“My visits”: GPS check-in, meter photo, signature).
- **addons25.js** — Renewal forecast (weighted, tied to MRR) · Quote → contract · Scheduled report packs (due reminder, send by email/WhatsApp/PDF/Excel — no unattended sending) · Customer activity feed · Excel import of custom fields and asset costs.

## Add-on 26 (v20261031a)
- Reading Run: a reading is shown only from N days (default 7) before its reading date; reading day per machine / customer (blank = month end); search bar; frozen heading. `pendingReadings()` (nav badge, bell, dashboard) follows the same rule.
- Contracts → Usage & Toner Averages (`ctView('U')`): averages by group → company → machine, editable overrides, yields and cartridge costs (shares `DB.tonerCfg` with Toner Alerts).
- Customers are kept A–Z in every list; backup password dialogs have a show / hide eye.

## Add-on 27 (v20261031b)
- **addons27.js** — Contracts: Standby Machines · Used Machines & Trade-in. Items: Van & Warehouse Stock. Suppliers: Warranty / RMA. Customers: Customer Price Lists (applied automatically when picking an item on a quote; warning if a quote is saved below the agreed price). Sales: Quote Acceptance Links · Win / Loss (reason asked when a quote is Declined). Accounts: Invoice Disputes (a disputed invoice drops out of overdue / ageing / bell while open). Reports: Ask Your Data (rule-based, runs in the browser — no outside service). Admin: Cost Visibility (hides cost / margin / profit columns on screen for chosen roles; screen masking only, not server-side security).
- **quote.html + supabase/phase4.sql** — run phase4.sql once in Supabase → SQL Editor. Customers open `/quote?t=…` (no login), see the quote, and accept (typed name + signature) or decline. Use Sales → Quote Acceptance Links → Check responses (the app also checks every 3 minutes) to apply the answer to the quote.
