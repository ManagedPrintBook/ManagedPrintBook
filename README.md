# Managed Print Contracts & Billing (Lease · FSMA · ORS · Sales)
Single-file web app (`index.html`). Data is stored in the browser (localStorage) until Supabase sync is wired.

## Deploy
1. Push this folder to a **private** GitHub repo.
2. Vercel → Add New Project → import the repo → Framework "Other" → Deploy (no build step).
3. Supabase → SQL Editor → run `supabase/schema.sql`. (Cloud sync + login is the next step.)

Never commit customer exports (CSV/backup files) — they are git-ignored.

## Cloud sync (Supabase)
Email + password login; the whole app database is saved to `public.app_state` (one row per user, protected by row-level security) a couple of seconds after every change. "Work offline" skips sync. In Supabase → Authentication → Providers → Email you can switch off "Confirm email" for instant sign-up. 
