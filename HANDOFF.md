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

1. ~~**Importer records nothing as paid.**~~ **FIXED 2026-10-13, PR #6
   (`7389677`).** `src/lib/csv.ts` gained an optional `amount_paid` column
   (also `paid` / `paid_amount`) and `csvRowToPaidCents()`; `src/actions/import.ts`
   now writes `amountPaid`. A row with no column is **paid in full**, which is
   the importer's purpose — it takes a spreadsheet of payments already made.
   `no` marks a row unpaid, a smaller figure a part payment, anything over the
   total clamps. Status stays `draft`: paid-ness and workflow are separate
   axes, and the contractor still reviews and confirms. Nothing else needed
   changing — `paymentState()`, the invoice document and the PDF already
   rendered Paid / Still due and stamped **PAID**.
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

**Completed 2026-10-13, after the PR above merged as `fb027e5`.** Both CLIs were
installed on ripley (`vercel` 63.1.2, already authenticated as `tmacdonald7-5750`;
`netlify-cli` 27.12.0, installed with `--ignore-scripts` because `sharp` 0.34.5
has no prebuilt binary for the Node 26.8.1 that mise provides and the source
build fails on a missing `node-addon-api` — `netlify dev`'s image handling is
the only thing that needs it).

1. **Netlify env fixed.** `DATABASE_URL` and `DIRECT_URL` set to the
   session-pooler string, all contexts, on site `uncleinvoice`
   (`c603abb3-3db2-40db-a876-f96d40c9e9fd`). Clean-cache production build
   `6acd7e7a7911dc9e3a3626fb` / deploy `6acd7e7a7911dc9e3a3626fd` reached
   `ready`. `uncleinvoice.netlify.app/` went 500 → 200 with the real page
   (17,477 bytes, sponsor board rendering). **This confirmed the diagnosis by
   fixing it.**
2. **`APP_URL` was missing entirely from Netlify** — a second defect, not
   previously known. `src/actions/auth.ts:16` and `src/lib/invoices.ts:8` fall
   back to `http://localhost:3000`, so every magic-link and contractor-review
   URL Netlify generated pointed at localhost. Set to
   `https://uncleinvoice.com`. Left deliberately unset: `RESEND_API_KEY`
   (outbound is Martin's; setting it starts real mail). `SESSION_SECRET` is not
   read anywhere in `src/`, only in `.env.example` and scripts, so its absence
   is not a defect.
3. **Domain.** `custom_domain` was already `uncleinvoice.com`;
   `www.uncleinvoice.com` added as a domain alias, which had been empty.
4. **DNS cut over.** Tom supplied a Cloudflare token; `npm run dns:netlify`
   rewrote apex and `www` to `CNAME uncleinvoice.netlify.app`, DNS-only.
   Both now resolve to `98.84.224.111` / `18.208.88.157`. Certificate covers
   `uncleinvoice.com` and `www.uncleinvoice.com`.
5. **Vercel retired.** `vercel domains rm uncleinvoice.com` (removed 2 aliases),
   then `vercel project rm uncleinvoice`. The project, its deployments and its
   environment variables are permanently gone. Local `.vercel/` and the
   `.env.local` that `vercel link` wrote were deleted.

Final state, all `server: Netlify`:

| url | status |
|---|---|
| `https://uncleinvoice.com/` | 200 |
| `/signup` `/login` `/create` `/partners` | 200 |
| `https://www.uncleinvoice.com/` | 301 → apex |

**Untouched on Vercel, deliberately:** the `lochside-llc` team still holds the
`swapp` project and the domains `bookkeepingconroe.com` and
`southwestdigital.io`. Tom's instruction was Uncle Invoice only.

**Still open, unchanged by this session:** PR #1 and its unexercised migration;
the importer recording nothing as paid and having no idempotency (defects 1-4
above); `/auth/verify` 500ing on magic links; the $778.32 PayPal ledger
question (Sol's).

No database row was written by this session. `npm run lint` reports 10 problems
(8 errors, 2 warnings) both with and without the merged changes — pre-existing,
verified by stashing. Typecheck and build were not run locally; nothing under
`src/` changed. The Netlify production build is the build evidence.

## Session 2026-10-13 (later) — AAA data loaded (Ummon)

**What Uncle Invoice is actually for, from Tom 2026-10-13.** AAA Discount Maid
Service pays cleaning contractors by check and expense. Those contractors never
issued her invoices. Uncle Invoice lets them issue the invoices for free, and
because Tom is her bookkeeper he pre-fills each one from her books so the
contractor only has to review and confirm. `seededByUserId` versus
`confirmedAt`/`confirmedByEmail` is what keeps that honest: the bookkeeper
seeded it, the contractor made it theirs. Two of the four are far past the $600
threshold, so this is 1099 substantiation, not tidiness.

**Loaded into the live AAA workspace** (`cmv5wjm0f0006jjkfa8cbzu1m`), sourced
from `~/projects/clients/aaa-discount-maid-service/labor/AAA DISCOUNT MAID
SERVICE_Transaction List by Vendor.csv`:

| contractor | invoices | total | paid |
|---|---|---|---|
| Christina Graves | 65 | $29,399.31 | $29,399.31 |
| Kimberly Barker | 46 | $22,623.30 | $22,623.30 |
| Kimberly k Johnson | 17 | $6,942.58 | $6,942.58 |
| Ashley Durand | 7 | $705.00 | $705.00 |
| **total** | **135** | **$59,670.19** | **$59,670.19** |

Still due $0.00, every row `paid`, every issue date in 2025, all against
`*8039 WFB Chk`. Ties to her vendor report to the cent. Only 20 of the 135 are
literal Checks with a number; 114 are Expenses with no reference, so each
invoice's line description carries transaction type, number where one exists,
and date. Import CSVs kept at `~/aaa-2025-all.csv`, `~/aaa-2025-ashley.csv`,
`~/aaa-2025-rest.csv`; they hold real contractor names and amounts, so they
stay out of git and out of the All Thing.

**Two live problems, neither fixed:**

- **All four contractors are `role=owner` of AAA's workspace**, so any one of
  them who signs in sees every other contractor's payments. Do not hand out the
  temp passwords as they stand. Contractors were never meant to hold workspace
  logins at all — the intended path is the per-invoice review link
  (`/review/[token]`). The accounts were a stopgap for having no real emails.
- **`parseDate` (`src/lib/dates.ts:10`)** does `new Date(value + "T12:00:00")`,
  which fails on QuickBooks' `MM/DD/YYYY`, and `src/actions/import.ts:54` falls
  back to `new Date()`. A raw QBO export therefore stamps every invoice with
  today's date, silently. The AAA CSVs were converted to ISO, so they are
  correct; the next person's will not be.

**Still needed before a contractor is contacted:** real email addresses for the
four; the `/auth/verify` 500 on magic links; importer idempotency (no dedupe
key, so a re-run doubles the workspace); and the send itself, which is Martin's
with `RESEND_API_KEY` unset.
