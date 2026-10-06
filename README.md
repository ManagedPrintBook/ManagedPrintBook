# Managed Print Contracts & Billing (Lease · FSMA · ORS · Sales)
Single-file web app (`index.html`). Data is stored in the browser (localStorage) until Supabase sync is wired.

## Deploy
1. Push this folder to a **private** GitHub repo.
2. Vercel → Add New Project → import the repo → Framework "Other" → Deploy (no build step).
3. Supabase → SQL Editor → run `supabase/schema.sql`. (Cloud sync + login is the next step.)

Never commit customer exports (CSV/backup files) — they are git-ignored.
