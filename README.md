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
The app locks after 1 minute idle, when you return from another tab/window (5 s+), and after a page reload. Closing the tab signs out completely.
Forgot the key? SQL Editor: `delete from public.app_security;`
