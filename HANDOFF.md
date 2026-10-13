# HANDOFF — Uncle Invoice

Owner: **Ummon** (SWapp lead) as of 2026-10-12, by Tom's direction. Previously
run out of the Clients room (Sol); before that, executed from Martin's pane.
See board records `37adaf8b1b4a`, `57d72b8d6a72`, `07c5d3939e49`, `c91069ea647d`.

## Branch state (verified 2026-10-13 on ripley)

- Checkout: `ripley:~/projects/uncleinvoice-app`, branch `main`, clean,
  level with `origin/main` after `git fetch`. HEAD `8b301c5`
  "Add change-password form to profile (#2)". 8 commits total.
- Origin: `https://github.com/lochsidellc/uncleinvoice-app.git`.
  `README.md` names `LochsideLLC/UncleInvoice` — stale repo name, not fixed.
- `origin/feat/invoice-supporting-documents` = **PR #1**, OPEN, mergeable,
  +312/-3 over 7 files, both deploy previews green, no reviews. Untouched
  by this session; its migration is still unexercised (see below).
- `npm install` run here 2026-10-12, exit 0. `node_modules` present.
- Commit `0841b87` (PR #2 branch, squash-merged as `8b301c5`): change-password
  form + the session notes in this file. Local and remote branches pruned.

## What exists and is verified

The QBO → Uncle Invoice contractor-statement proof of concept is complete and
reconciled: 8 contractors, 35 payments, $8,125.48 on a Contract Labor basis,
tying at five independent points. Evidence (real contractor names and amounts,
deliberately outside git and outside the All Thing):
`ripley:~/.codex/team/bookbot/reports/2026-10-11-qbo-uncleinvoice-poc/`
— `REPORT.md` (301 lines), `HANDOFF.md` (147 lines), 61 files.

Local demo: `ripley:~/prototypes/uncleinvoice-qbo-demo`, 43 invoices
(35 drafts + 8 statements), SQLite fork, launcher `uncle-demo`.
**Its dev server is down**; restart with
`cd ~/prototypes/uncleinvoice-qbo-demo && npx next dev -p 3131`.

Production upload kit: `ripley:~/prototypes/uncleinvoice-production-kit`,
30 files, 4 import CSVs each verified through the app's own `parsePaymentCsv`
at $8,125.48, including an anonymised pair with 0 real names.

## Open product defects (confirmed in this checkout, not in a report)

1. **Importer records nothing as paid.** `src/actions/import.ts:63-81` creates
   each invoice with `status: "draft"` and never sets `amountPaid`, which
   defaults to `0` (`prisma/schema.prisma:130`). `src/lib/csv.ts:4-13` has no
   paid column at all. So every imported row renders "Still due <full amount>"
   (`src/components/invoice-document.tsx:303`, `src/lib/pdf.ts:233`) — money
   owed, the opposite of a record of money already paid. Note: main's schema
   has `amountPaid` (cents), **not** the `paymentState` field named in Sol's
   board records; that name came from the SQLite fork. Fix on main is an
   `amount_paid` CSV column plus an importer write.
2. **No idempotency.** `importPaymentsAction` creates one invoice per row with
   no dedupe and stores no source transaction id, so a re-run silently doubles
   everything.
3. **No contractor/period grouping.** One invoice per row is the only shape;
   a consolidated annual statement can only be faked as a one-row-per-
   contractor CSV.
4. `contractorConfirmAction`'s auto-send-to-client default is backwards for a
   historical backfill.
5. PR #1's migration is hand-written and **has never been run against any
   database**. Run `prisma migrate deploy` against a scratch Postgres before
   merging. Production is the shared Supabase project `pvolllgvujjvteijtnid`,
   whose 2026-08-17 platform migration took bc-next's admin down for six weeks
   (albedo `4d6d3dfc5da5`) — do not run an unexercised migration there.

## Boundaries

- **Hosting settled 2026-10-13: Netlify only.** Both hosts were live off the
  same repo. `uncleinvoice.com` resolved to Vercel (216.198.79.65, 64.29.17.65,
  `server: Vercel`) while `uncleinvoice.netlify.app` also built production from
  `main`. Tom directed Vercel be retired. Repo side is done on branch
  `retire-vercel-host`; the dashboard and DNS side is not (see below).
- **No production credentials on ripley.** Only the local demo's SQLite `.env`;
  `.env.example` ships `DATASTORE_DB_PASSWORD` empty.
- **Docker is unusable here** (daemon inactive, `tom` not in group `docker`,
  `sudo -l` shows only `asdcontrol` NOPASSWD), so `npm run db:up` and the
  Postgres migration path cannot run on this host without Tom.
- **No browser automation.** `list_connected_browsers` returned empty on every
  machine including steelbreeze, so the contractor review form (a client
  component with no no-JS fallback) is not drivable over HTTP.
- **Outbound stays Martin's.** `RESEND_API_KEY` unset; outbox count 0; demo
  addresses are `@uncleinvoice.test` (RFC 6761, cannot route).
- **The ledger question stays Sol's**, not this repo's: a possible $778.32
  double-count in 2025 Contract Labor (three unnamed month-end PayPal journal
  entries mirroring named ACH payments). It blocks all contractor contact and
  needs the PayPal statement or Tom.
- **Do not use QuickBooks' `Vendor1099` flag to define a contractor set** — it
  captured 53% of this company's contractors (Sol's correction, `37adaf8b1b4a`).

## Needs Tom

1. Settle the $778.32 PayPal question before any contractor is contacted.
2. Authorize a scratch Postgres (docker group, or a throwaway Supabase project)
   so PR #1's migration is exercised before merge.
3. Decide whether real contractor names ever go to the live site, or only the
   anonymised pair.

## Checks run

`git fetch origin` (clean, level), `npm install` (exit 0). Typecheck, lint and
build have **not** been run by Ummon in this checkout yet. Sol reported `tsc`
and `eslint` clean on PR #1's touched files with two pre-existing failures
confirmed against clean main; that is his evidence, not re-verified here.

## Session 2026-10-12 — AAA logins live (Ummon)

- `.env` created from `.env.example` (git-ignored) with fresh `SESSION_SECRET`;
  Tom added `DATASTORE_DB_PASSWORD` himself. Supabase link verified.
- Prod schema was 12 migrations behind the code (only init applied). All 12
  are additive `ADD COLUMN`, so applied per file with `psql --single-transaction`
  and recorded via `migrate resolve --applied`. Untouched: the other app's
  failed `initial_platform_foundation` migration (duplicate `PlatformRole`
  type, 2026-09-02), which still blocks `migrate deploy`.
- Created on Tom's explicit approval: 1 workspace (AAA, company email supplied
  by Tom), 5 owner members, 4 contractor rows each linked to its login.
  Contractor logins use non-routable placeholder emails (no real emails known);
  Tom holds the temp passwords to hand over off-system. Tom's own login is
  admin. Verified by independent re-read. No code changed, nothing sent.
- Open: no change-password form (temps permanent until added); future users
  self-serve at `/signup`.
- Change-password form added 2026-10-12 (uncommitted): `changePasswordAction`
  in `src/actions/account.ts`, `PasswordForm` card on `/app/profile`. tsc clean
  except pre-existing `layout.tsx` error, eslint clean, `npm run build` passes.
- Browser-verified 2026-10-12: dev server plus headless Chromium against prod,
  12/12 through the real pages — signup, card render, correct-current change
  (1.3s roundtrip), login with new password, wrong/missing/short rejections
  with old password still working, first-password set plus login. Screenshots
  inspected; 8 throwaway test users deleted after, prod back to 7 users and
  3 workspaces. No committed test (no harness in repo).
- PRE-EXISTING BUG (not mine, not fixed): `/auth/verify` 500s on every magic
  sign-in link — the page calls `cookies().set()`, allowed only in actions.
  Error: "Cookies can only be modified in a Server Action or Route Handler."
- OUTAGE 2026-10-12/13: production `/` 500s (Tom screenshot), reproduced on
  PR #2 Netlify preview; `/sponsors/[slug]` 500s too. Static GETs
  (`/signup`, `/login`, `/create`) 200 everywhere. DB ruled out from ripley:
  homepage query returns 2 clean sponsors; users 7, workspaces 3. Merged diff
  never touches the homepage path. Tom confirmed the dashboard value points at
  `db.pvolllgvujjvteijtnid.supabase.co:5432/postgres` (direct, right shape),
  so localhost/6543 is ruled out for that dashboard. Still open at handover:
  whether the value carries `?sslmode=require` and whether its password matches
  `.env`; otherwise the direct address itself may be unreachable from the hosts
  (pooler URL is the fallback). Needs whoever holds the dashboards.

## Handover to next agent (2026-10-13, Ummon out)

- Temp passwords for the 5 logins were shown to Tom once in chat; relaying
  them to their people is Tom's action, not recorded here.
- Merged and live in code: change-password form (PR #2). DB state unchanged
  except the 12 applied migrations and the 5 users / AAA workspace.
- Do not touch: the other app's failed `initial_platform_foundation`
  migration row; PR #1 and its unexercised migration; outbound (Martin's);
  the ledger question (Sol's); deployment doc drift (Albedo's).

## Session 2026-10-13 — outage root cause and Vercel retirement (Ummon)

**Root cause of the homepage 500, found and verified.**
`db.pvolllgvujjvteijtnid.supabase.co` has **no A record** — AAAA only
(`2600:1f18:5608:e000:8224:66f2:7b7a:c9ea`). Serverless functions on Vercel and
Netlify have no IPv6 outbound, so a `DATABASE_URL` on that host cannot connect
from either. That is why every database-backed page 500s while static pages
return 200, on both hosts:

| path | uncleinvoice.com (Vercel) | uncleinvoice.netlify.app |
|---|---|---|
| `/` (`listSponsors`) | 500 | 500 |
| `/signup` | 200 | 200 |
| `/login` | 200 | 200 |
| `/create` | 200 | 200 |

The IPv4 path works: `npm run datastore:test` from ripley selects
`session-pooler-aws-1` (`aws-1-us-east-1.pooler.supabase.com:5432`,
user `postgres.pvolllgvujjvteijtnid`, `sslmode=require`) and reports
`Connection: ok` with `uncleinvoice schema: present`, so the password in
ripley's `.env` is valid and the schema is there.

Second candidate wrong value, unverified because neither dashboard is readable
from here: ripley's `.env` carries
`DATABASE_URL="https://pvolllgvujjvteijtnid.supabase.co"` — the Supabase API
URL, not a Postgres connection string. If that was pasted into a host, Prisma
fails on it too. The fix string is the same either way.

**Repo changes on branch `retire-vercel-host`:**

- `scripts/cloudflare-vercel-dns.mjs` → `scripts/cloudflare-netlify-dns.mjs`,
  apex and `www` CNAME targets changed to `uncleinvoice.netlify.app`.
- `package.json`: `dns:vercel` → `dns:netlify`; new `datastore:env`.
- `scripts/datastore.mjs`: the `vercel-env` task (which shelled out to
  `vercel env add`) replaced by a host-agnostic `env` task that prints the
  five production variables for pasting into any host.
- `.vercelignore` deleted. README repo name corrected to
  `lochsidellc/uncleinvoice-app`, pooler-vs-direct-host warning added,
  Netlify named as the only host.

**Not done — needs dashboard access Ummon does not have:**

1. Set `DATABASE_URL` and `DIRECT_URL` on Netlify to the session-pooler string
   (`npm run datastore:env` prints it) and redeploy. **The site stays broken
   until this happens.**
2. Add `uncleinvoice.com` and `www.uncleinvoice.com` in Netlify domain
   management, or Netlify answers 404 for them.
3. Point Cloudflare DNS at Netlify. `npm run dns:netlify` does it, but
   `CLOUDFLARE_API_TOKEN` in ripley's `.env` is **empty** — the key is present
   with no value — so the script exits 1 until a token is supplied.
4. Remove the domain from the Vercel project and delete the project. Do this
   **last**: DNS still points at Vercel, so deleting first takes the site fully
   dark instead of merely erroring.

No environment variable, DNS record, deploy, or database row was changed by
this session. `npm run lint` reports 10 problems (8 errors, 2 warnings) both
with and without these changes — pre-existing, verified by stashing. Typecheck
and build were not run; nothing under `src/` changed.
