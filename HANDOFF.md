# HANDOFF — Uncle Invoice

## Current state — 2026-10-18 (Ummon, ripley)

This section supersedes every branch, status and "still open" claim below it.
Tom asked for the signed-in navigation label `Plans` to read `Unlock features`,
with `Dashboard` to its left. He also asked to remove the standalone `Sign out`
control and put `Profile` and `Sign out` in a menu opened from the profile icon.
He explicitly said not to push until he says.

**Checkout.** `ripley:~/projects/uncleinvoice-app`, branch
`fix/unlock-features-nav-label`, based on `origin/main` at `2f152e3` "Make the
Plans link in the header a sparkly button (#44)" after `git fetch origin`.
Implementation commit `c69ce6e` changes the label in
`src/components/site-header.tsx`: Free and Invoice accounts now see `Unlock
features`; Bookkeeper accounts still see `Your plan`. The follow-up ordering
commit `dc55815` is superseded by Tom's latest direction: `Dashboard` is again
first. Commit `da83f94` removes the standalone `Sign out` control and changes
the profile icon from a direct link into a native disclosure menu holding
`Profile` and `Sign out`. The branch and commits are local only: no push, PR,
merge, deploy or production change. Origin is
`https://github.com/lochsidellc/uncleinvoice-app.git`. No command is staged in
`/home/tom/ummon`.

The account menu font mismatch was fixed locally: `.account-menu-item` sets
both entries to `1rem` after the global `button { font: inherit }` rule.

**Six merges landed after the older handoff section was written** (that section
was last written at `4f9fb7c`, PR #38, on 2026-10-16). All six are in
production:

| Commit | PR | What it did |
| --- | --- | --- |
| `5dc59f8` | #39 | Rebuilt `/app/plans` around a comparison matrix; `plan-picker.tsx` replaced by `plan-matrix.tsx`. |
| `d6eb36b` | #40 | Rewrote `/privacy` and `/terms`, added `/cookies`, linked it from the footer. |
| `5f0ae02` | #41 | Added the signed-in `/app/whats-new` page, its header link, and `src/lib/product-updates.ts`. |
| `0be8686` | #42 | Added test-mode Stripe checkout: `/api/stripe/checkout`, `/api/stripe/webhook`, `src/lib/stripe.ts`, `src/lib/stripe-webhook.ts`. |
| `be06fbe` | #43 | Refreshed this handoff after #39-#42 and pruned their merged branch husks. |
| `2f152e3` | #44 | Made the signed-in Plans link a sparkly, reduced-motion-aware button. |

**Pricing and checkout are no longer undecided.** Earlier sections in this
file say "no checkout and no prices, by Tom's decision, and the upgrade page
points at info@bookkeepingconroe.com". That is now wrong. `src/lib/plan.ts`
fixes prices on the server at Invoice **$5/mo** (`500` cents) and Bookkeeper
**$29/mo** (`2900` cents), and #42 wired a real Stripe Checkout session.

**But the live checkout still cannot finish account activation, and this is the
one thing to know.** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are now
present in Netlify's production function scope; both were checked without
printing their values. The Stripe key is test mode. However, a read-only Stripe
API query on 2026-10-18 returned **zero webhook endpoints** in the account.
Nothing can deliver `checkout.session.completed` or subscription-lapse events
to the app, so a checkout cannot grant or remove a plan. No checkout session
was created in the verification turn because Tom had asked only for status.

**Test mode is enforced in code, deliberately.** `stripeTestSecretKey()`
rejects any key that does not match `/^(?:sk|rk)_test_/`. A live-mode key will
be refused with "STRIPE_SECRET_KEY must be a Stripe test-mode key", so
switching this on for real money is a code change, not just an env change.
`stripeWebhookSecret()` likewise requires a `whsec_` prefix.

**Live verification done 2026-10-18 against `https://uncleinvoice.com`:**

- `POST /api/stripe/checkout` with no session → `401 {"error":"Sign in required"}`
- `POST /api/stripe/webhook` with no signature → `400 {"error":"Missing Stripe signature"}`
- `GET /cookies` → 200, `GET /privacy` → 200, `GET /terms` → 200
- `GET /app/whats-new` → 307 to `/login?next=%2Fapp%2Fwhats-new`

So all four routes are deployed. Current production deploy is Netlify
`6ad5001e36bce579f3670387`, state `ready`, commit `2f152e3`, site
`c603abb3-3db2-40db-a876-f96d40c9e9fd`.

**One Netlify detail worth not misreading.** The deploy list shows
`error` for `d6eb36b` and `5f0ae02`. Those were not failed builds in the
usual sense: all three merges landed within 12 seconds of each other, so each
build was superseded by the next. `0be8686` ran to completion at the time; the
newer ready deploy of `2f152e3` is what production serves now.

**Prior branch cleanup.** Three merged husks were left on origin
after #40/#41/#42 squash-merged: `legal-pages-cookie-notice`,
`feat/whats-new-page`, `feat/stripe-test-checkout`. Because a squash merge
makes the branch commit a non-ancestor, `git branch -r --merged` does not
list them, so each was checked by content instead: for every file the branch
touched, `git diff origin/<branch> origin/main -- <files>` was empty. All
three were proved identical to `origin/main` before deletion.

### Checks run 2026-10-18

On local implementation commits `c69ce6e`, `dc55815` and `da83f94`:

- `npx tsc --noEmit` — **passed**, 0 errors.
- `npm run test:upgrades` — **21 passed, 0 failed, 0 skipped**.
- `npx eslint src/components/site-header.tsx` — **passed**, 0 errors and 0 warnings.
- `npx eslint src/components/site-header.tsx src/components/account-menu.tsx` —
  **passed**, 0 errors and 0 warnings after the account-menu change.
- `npm run build` — **passed** after the account-menu change. It still reports
  the existing Prisma config deprecation, Next middleware deprecation and
  malformed `.print\\:hidden` selector warning.
- `git diff --check` — **passed** before the implementation commit.

Earlier on `0be8686`:

- `npx tsc --noEmit` — **passed**, 0 errors. (It failed first with four
  `TS2307 Cannot find module 'stripe'` errors; that was only the uninstalled
  dependency, fixed by `npm install`, not a defect.)
- `npm run test:upgrades` — **21 passed, 0 failed, 0 skipped**. Four tests are
  new since #38, covering the checkout surface: plans offers only higher tiers
  through test checkout, checkout tiers and prices are fixed on the server,
  only a paid fixed-price Stripe event grants a plan and a lapse removes it,
  and unknown plans get no paid privileges.
- `npm run build` — **passed** (`prisma generate && next build`).
- `npm run lint` — **exit 1: 7 errors, 2 warnings.** This is the unchanged
  pre-existing baseline, identical to what #38 recorded: errors in
  `src/actions/public-invoice.ts`, `src/components/dashboard-metrics.tsx` and
  `src/components/form-banner.tsx` (two `prefer-const`, two
  `react-hooks/set-state-in-effect`, and others), warnings in
  `src/app/partners/page.tsx`. #40, #41 and #42 added no new lint problems.
  5 of the 7 are `--fix`-able and nobody has fixed them.

### Not checked, and say so rather than assume

- **No browser pass.** Not attempted. Per standing instruction the browser is
  only driven on `steelbreeze`, which is still not paired, so no page was
  loaded in a real browser. Nothing on `/app/plans`, `/app/whats-new`,
  `/cookies`, the checkout button, or the new `Unlock features` label has been
  seen rendered.
- **The whole Stripe path is unexercised end to end.** No checkout session has
  ever been created, no webhook has ever been received, and the plan-granting
  code in `src/lib/stripe-webhook.ts` has only ever run against synthetic test
  fixtures. The first real test needs the webhook endpoint registered.
- **No production database read this turn.** The 5 users / 3 workspaces /
  6 contractors / 137 invoices figures in older sections are from 2026-10-17
  and were not re-counted.
- The legal text in #40 was not reviewed by a lawyer, and nothing in this
  repo makes it accurate for Tom's actual data practices beyond what the
  author wrote.

### Needs Tom

1. Register the webhook endpoint `https://uncleinvoice.com/api/stripe/webhook`
   in the Stripe dashboard, set its signing secret in Netlify, and run one full
   test-mode checkout before treating billing as working.
2. Decide whether $5 and $29 are the real prices before live mode, since they
   are compiled into `src/lib/plan.ts` rather than read from Stripe.
3. Carried forward, still unanswered: settle the $778.32 PayPal question
   before any contractor is contacted; authorize a scratch Postgres so PR #1's
   migration is exercised before merge; decide whether real contractor names
   ever go to the live site.

### Carried forward, unchanged and still open

- **No test runner for the app as a whole.** `npm run test:upgrades` is one
  bespoke script covering the upgrade and checkout surface. Everything else is
  hand-verified.
- **`MagicLink_contractorId_idx` drift** between the live database and
  `schema.prisma` is still unresolved.
- **No deletion audit trail**, which is what made the 2026-10-16 "where did
  the contractor accounts go" question take forensics.
- The importer defects below (no idempotency, no contractor/period grouping,
  backwards auto-send default) are untouched.

## Session 2026-10-16 — contextual upgrades (Ummon)

Historical. PR #38 is merged; four more merges landed after it, so the state
below is superseded by the 2026-10-18 section at the top of this file. Base
verified at the time by
`git fetch origin`: `8780cdb`, main equal to origin/main, initially clean. Work is
on `feat/contextual-upgrades`; no merge or production deployment in this turn.
Implementation commit: `d839d6f`. Branch pushed; draft PR
https://github.com/LochsideLLC/uncleinvoice-app/pull/38. The isolated preview
server and steelbreeze browser were stopped after verification. No command is
staged in `/home/tom/ummon`.

Tom approved implementing the upgrade UX recommendation. Implemented:

- Dedicated `/app/plans`: separate Invoice and Bookkeeper stories, interactive
  branding comparison, three-step bookkeeping workflow, plan comparison, and
  honest email request buttons. No prices, checkout, automatic activation,
  trial promise, or outbound send was introduced.
- Billing contacts are unlimited on ALL plans. Both standalone and inline
  creation use the existing Workspace model. There is no new managed-client
  quota or data classification: Bookkeeper now gates its workflow tools, not
  contact count. Existing client/workspace data was not recategorized or migrated.
- Contextual dialogs before import, attachments, contractor links, and bulk ZIP
  download. The import page authorizes before showing the upload form. Server
  restrictions remain in the actions/routes. Existing attachments stay readable.
- Dialogs open only on explicit action, use native keyboard/focus behavior, and
  open Plans in a separate tab. The originating form and selected rows stay
  mounted. The refresh-plan button uses a Next router refresh after manual
  activation. No unsaved invoice contents or bearer tokens enter offer URLs,
  email bodies, or local storage.
- Dashboard offer is compact, Free-only, after a sent invoice, and suppressed
  during contractor confirmation/send flows. Dismissal is stored per account
  and plan in that browser; storage denial falls back to the current visit.
- Plans stays visible on mobile; Bookkeeper sees Your plan. Profile now links
  to Plans and has a sign-out button for small screens.
- Found and fixed a pre-existing paid-benefit defect: `showBrand` existed but
  no callers resolved paid entitlement. Invoice HTML and every PDF path now
  check the invoice preparer/linked issuer's paid plan, not the viewer's plan.
  Archived accounts do not supply entitlement. Missing ownership keeps the
  credit. Stored invoices are unchanged; this applies at render time.
- A free preparer can preview their actual invoice without the credit. No
  offer was added to contractor confirmation pages or recipient-only views.

Verification:

- `npm run test:upgrades`: 20 passed, 0 failed, 0 skipped. Real action/page/PDF
  code bundled against synthetic in-memory DB/auth fixtures. PDF text checked
  with Poppler, including retained invoice number, service and total.
- `npx tsc --noEmit`: passed. `npm run build`: passed; existing Prisma config,
  middleware convention, and malformed print selector warnings remain.
- Remote headless Chromium on steelbreeze, separate temporary profile:
  15 browser checks passed. Includes persistent dismissal, focus/ Escape,
  preservation of selection and unfinished text, branding toggle, 390px and
  320px layouts, and no upgrade requests for Bookkeeper. These use real
  components in an isolated fixture, NOT live database-backed Next pages.
- Desktop/mobile screenshots inspected at
  `/tmp/uncleinvoice-upgrade-screens-B4CA8d/` on ripley (temporary artifacts).
  Initial checks found dialog focus and mobile sample-width problems; fixed
  and rechecked. An initial browser-script quoting error was also corrected.
- Whole-repo lint initially reported 8 errors and 2 warnings. One pre-existing
  apostrophe error in the touched invoice-detail page was fixed. Remaining
  7 errors are in public-invoice.ts, dashboard-metrics.tsx and form-banner.tsx;
  image warnings remain in partners/page.tsx. Baseline source checked at HEAD.
  Final changed-file lint passed with 0 errors and 0 warnings.
- `npm install --save-dev esbuild@0.28.2 --ignore-scripts` explicitly declares
  the already-installed test bundler; no dependency version changed.
  `npm audit` reports 13 findings (12 high, 1 critical), including the existing
  Next version. Dependency/security upgrades are not part of this UX branch.

Boundaries / follow-up:

- No production data writes, migrations, plan changes, client emails, or
  production browser sessions. The browser fixture cannot execute app actions.
- Full Next/database integration, real mail-client handling, cross-device
  dismissal, and production conversion impact have not been verified.
- Pricing/checkout remain undecided. No production funnel telemetry was added;
  requests remain manual emails. Before claiming conversion improvement,
  measure activated plans together with completed invoices and abandonment.
- Existing contacts are not divided into customer vs managed-client database
  types. The distinction is explained through tasks; a future quota would need
  an explicit data model and migration, not another count of all memberships.


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

## Session 2026-10-13 (later still) — launch hardening (Ummon)

**Context change from Tom:** Uncle Invoice is going to be marketed to his
YouTube audience and his Skool.com community — an adult audience, confirmed
2026-10-13. That turns it from a tool for four
known contractors into a public product, and re-ranks everything: email
delivery becomes necessary rather than optional, and every weak link gets
exercised by strangers.

**Shipped, PRs #8-#11, all squash-merged.**

1. **Every magic sign-in link returned 500.** `/auth/verify` was a *page*, and
   signing the visitor in sets a session cookie, which Next.js only permits
   from a Server Action or Route Handler. An *invalid* token returned 200 with
   "Could not sign you in", so the route looked healthy — only real links
   crashed. Magic sign-in is a first-class option on both `/login` and
   `/signup` (`intent: "magic"`, `src/actions/auth.ts:22`), so a new user
   choosing the passwordless path crashed on first contact. Now a route
   handler.
2. **Review links were long-lived reusable keys.** 30 days, and `usedAt` was
   only ever checked for login tokens, so a link stayed live and re-editable
   for a month after the contractor confirmed. Life cut to 7 days
   (`REVIEW_LINK_DAYS`), `contractorConfirmAction` spends the token, and
   `loadReviewToken` rejects a spent one. The done page and PDF download
   resolve the token themselves, so the contractor keeps their copy.
3. **Re-importing doubled the books.** Now a row is skipped when the workspace
   already holds an invoice for the same contractor, date and amount, and the
   skipped count is reported. Verified: re-running the AAA file would create 0
   and skip 135.
4. **Connection pool.** `DATABASE_URL` moved from the session pooler (5432,
   **15 connections, session mode**) to the transaction pooler
   (6543, `pgbouncer=true&connection_limit=1`). `DIRECT_URL` stays on 5432 for
   migrations. The old setting was hit for real during this session:
   `FATAL: (EMAXCONNSESSION) max clients reached in session mode`. 25
   concurrent requests now all return 200.

**Three rounds were needed on the sign-in redirect, each found by clicking a
real link against production rather than by reading code.** Worth knowing,
because the last cause is not obvious:

- #9: a relative `redirect()` out of a route handler kept the request's query
  string, so the token arrived at `/app?token=…`.
- #10: `request.nextUrl.origin` resolves to the **per-deploy Netlify hostname**
  behind the proxy, so the visitor was bounced to a `*.netlify.app` URL where
  the session cookie — set for the real domain — does not apply. Redirects are
  now built from `APP_URL`.
- #11: the host's Next.js adapter **copies the incoming query string onto
  whatever the route redirects to**, so nothing inside the handler could shake
  the token off. Sign-in links are now `/auth/verify/<token>` with the token in
  the path. Any link sent in the old `?token=` form no longer works; the outbox
  held 4, all internal tests.

**Verified live on uncleinvoice.com after the final deploy:** valid link →
307 to `https://uncleinvoice.com/app` with the session cookie set and no token
in the URL; the issued session loads `/app` 200; the same link a second time →
`/login?error=link_invalid`; a garbage token → the same friendly error. Review
link expires in 7.00 days and opens 200. Test user and test tokens deleted
afterwards; production sits at 7 users, 3 workspaces, 135 AAA invoices.

**Also repaired:** ripley's `.env` had `DATABASE_URL="https://pvolllgvujjvteijtnid.supabase.co"`
— the Supabase API URL, not a connection string — which made every local Prisma
call fail. Now the transaction pooler, matching production.

### Still open for a public launch

- ~~No email provider~~ and ~~no mail DNS~~ — **BOTH DONE 2026-10-13.** See
  the section below.
- ~~`/privacy` and `/terms` both 404~~ **WRITTEN 2026-10-13, PR #13
  (`52ab1a5`).** Both live and 200. Written from what the code does, not from a
  template: no analytics or advertising scripts exist anywhere in `src/`, there
  is exactly one cookie (`ir_session`, 30 days, httpOnly), and there is no
  payment integration, so the pages say so plainly. Every sub-processor is
  named. Both state that emailed sign-in and review links are credentials.
  **Three things Tom has not confirmed and that were inferred:** the operating
  entity is written as *Lochside LLC* (from the GitHub org, Netlify team and
  lochsidellc.com); governing law is written as *Texas* (from Bookkeeping
  Conroe); and **no postal address is given** because inventing one would be
  worse than omitting it. The privacy page sets the under-13 line,
  which is the COPPA threshold; Tom confirmed on 2026-10-13 that the audience
  is adults, so this needs no further decision. Not reviewed by a lawyer.
- **The four AAA contractor emails are still `@uncleinvoice.test`**, which
  cannot route and are printed on each invoice PDF.
- **The four AAA contractors hold `role=owner`** on that workspace, so any of
  them signing in would see the others' payments. This is a manual stopgap, not
  a product defect — the app never adds a contractor as a member
  (`src/actions/workspaces.ts:43` only adds the creator).

## Session 2026-10-13 (end) — email delivery is live (Ummon)

**Uncle Invoice can send mail.** Verified end to end: a real sign-in link sent
through the app's own `sendEmail` to `lab@bookkeepingconroe.com`, from
`Uncle Invoice <noreply@uncleinvoice.com>`, Resend message
`01a13311-c5d7-76fb-b599-834523aa83e9`, status **delivered**.

**How it is set up.** Tom created the Resend account and a Full Access key;
everything after that was done over the API so no DKIM value was ever
transcribed by hand.

- Domain `uncleinvoice.com` added to Resend, id
  `9c650b0e-508a-46d4-844e-e359be7639fc`, region us-east-1. `POST /domains`
  returns the DNS records in its response, which is what made this hands-off.
- The four records were written into Cloudflare with the token already in
  `.env`, by `scratchpad/cf-write.mjs`, which refuses to touch the apex or
  `www` because those serve the website. Dry run first, then `--apply`.
- `POST /domains/{id}/verify`, then polled: verified in about 80 seconds, all
  four records `verified`.
- A **DMARC** record was added on top of what Resend asked for:
  `v=DMARC1; p=none; sp=none; aspf=r; adkim=r`. Monitor-only, so it cannot
  break delivery, and it is what Gmail and Yahoo want to see from a sender
  reaching strangers.

Mail DNS now on the domain, which had none at all before:

| name | type | value |
|---|---|---|
| `resend._domainkey` | TXT | DKIM public key |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |
| `send` | MX | `10 feedback-smtp.us-east-1.amazonses.com` |
| `rsend` | CNAME | `send.forge.rmta.net` |
| `_dmarc` | TXT | `v=DMARC1; p=none; …` |

**Two keys, deliberately.** The onboarding key Resend hands out is send-only
and was rejected with `401 restricted_api_key` when used to add a domain. Tom
made a Full Access key named `setup`. That key was then used to mint a
**separate send-only key restricted to this domain** (`POST /api-keys` with
`permission: sending_access` and `domain_id`), id
`7812e68c-98d5-4243-a286-ca28277f9e31`, and *that* is what sits on Netlify and
in ripley's `.env`. Production cannot administer the Resend account, read logs
or delete anything — it can only send from this domain.

**Tom's remaining action: delete the `setup` key** at https://resend.com/api-keys.
Nothing uses it any more.

**Netlify env set:** `RESEND_API_KEY` (send-only) and
`MAIL_FROM="Uncle Invoice <noreply@uncleinvoice.com>"`, all contexts, deployed
`6acd95a39cd380eba7730b99`.

**Worth knowing before volume grows:** Resend stores message bodies, and a
review-link email body contains a working bearer token. Turning that storage
off needs Pro/Scale for a month, 3,000 emails sent, under 5% bounce, and
$50/mo — thresholds this account will not meet for a long time. Review links
now live 7 days and die on confirmation, which limits the window, but the
trade-off is real and should be revisited if the product grows.

### Still open

- ~~The four AAA contractor emails are `@uncleinvoice.test`~~ — **no longer
  blocking.** Tom does not have those addresses and they are his client's
  people, not his. PR #17 removed the need for them entirely: the client hands
  each contractor a link. See below.
- **Outbound to a client or contractor is still Martin's call, on Tom's
  approval.** The capability now exists; the authority has not changed.
- Entity (`Lochside LLC`) and governing law (`Texas`) on the legal pages are
  still inferred, not confirmed by Tom.

## Session 2026-10-13 (end) — one link per contractor (Ummon)

**What this product is actually for, in Tom's words:** his bookkeeping client
AAA pays cleaners by check and expense, the cleaners never issued her invoices,
and she needs those invoices for her books. Uncle Invoice is how the cleaners
produce invoices that match the checks. Tom pre-fills them from her books; the
cleaners confirm them.

**The blocker was never the missing email addresses.** A review link covered
**one invoice**. Christina Graves has 65 and Kimberly Barker has 46. Nobody
opens 65 links, so the unit was wrong and no amount of chasing contact details
would have fixed it.

**PR #17 (`f0d7df0`) — a link per contractor.** The client passes it to her own
cleaner however she already reaches them, so **we never hold a contractor's
email or phone**.

- `MagicLink.contractorId`, nullable and additive, migration
  `20261013030000_magiclink_contractor`. Applied to production with
  `prisma db execute` against the **session pooler** (DDL does not belong on
  the transaction pooler), then `migrate resolve --applied`. Column and foreign
  key verified present afterwards by querying `information_schema` and
  `pg_constraint`. The other app's failed `initial_platform_foundation` was not
  touched.
- `createContractorLink()`, 30 day life, because the link has to survive being
  passed on.
- `/c/[token]` lists every invoice for that contractor with date, amount,
  description and a PDF each.
- `contractorConfirmAllAction` confirms the batch but writes `confirmedAt` and
  `confirmedByEmail` to **each invoice individually**, plus a per-invoice
  event, so the books keep a per-invoice record.
- The contractors page in the app has a button per contractor that mints the
  link, copies it, or opens a prefilled text message.

**Verified live on uncleinvoice.com, no account and no cookie:**

| | |
|---|---|
| Ashley's link | 200, 7 invoices, 7 PDF links, $705.00 |
| Christina's link | 200, **65 invoices**, $29,399.31 |
| attestation shown | "I confirm these 65 invoices, totalling $29,399.31, are an accurate record of work I did for AAA Discount Maid Service." |
| PDF via contractor token | 200, `application/pdf`, stamped PAID |
| **Christina's invoice with Ashley's token** | **404** — contractors cannot reach each other's invoices |

Live links for the four cleaners are at `ripley:~/aaa-contractor-links.txt`,
mode 600. They are bearer tokens for a client's financial records, so they stay
off the board and out of the All Thing. Tom can also mint fresh ones himself
from the client's contractors page at any time.

### Still open

- Nothing has been sent to any contractor. Distribution is AAA's, through Tom;
  outbound from this building remains Martin's on Tom's approval.
- Entity (`Lochside LLC`) and governing law (`Texas`) on the legal pages are
  still inferred, not confirmed.
- Tom still needs to delete the Full Access Resend key named `setup`.

## Session 2026-10-13 (end) — the link now confirms *and* sends (Ummon)

**PR #26 (`0690e75`), deployed and live on uncleinvoice.com.** `/c/<token>`
could only confirm; confirming left the invoices in the database and sent the
client nothing. The only path that emailed them (PR #25) required the
contractor to have a login, a password and an account — three things an
unsophisticated contractor on a phone will not get through.

- `contractorConfirmAllAction` now takes the contractor's **own** email
  (required, rejects `.test`) and optional phone, writes both to the
  `Contractor` record and the `MagicLink`, and uses the typed address as
  `confirmedByEmail`. This is also where the real addresses come from: the
  client often holds only a phone number, and the placeholder invented at
  setup (`christina-graves@uncleinvoice.test`) has no business on someone
  else's invoice. `src/lib/pdf.ts:147` prints `contractor.email`, which is
  currently NULL for all four AAA contractors, so nothing fake is printed
  today and the real address appears once they confirm.
- New `sendInvoicesByLinkAction` emails the confirmed invoices to
  `workspace.email` as PDFs plus `invoices.csv`, reply-to the contractor,
  marks each `sent` with `sentAt`/`sentToEmail`, writes a `sent_to_client`
  event per invoice.
- New `src/lib/contractor-send.ts` holds the send; both the link route and the
  signed-in route call it, so the email, attachments and audit trail are
  identical.
- Contractor steps on the link route: tap link, type email, tick, Confirm,
  Send. No account, no password, no file handling, no zip.

**Checks.** `npx tsc --noEmit` clean, `npm run build` clean. `eslint` 8 errors
+ 2 warnings, all pre-existing on `main` in files this branch does not touch.

**Tested on the production database with a throwaway fixture**, never against
AAA — exercising it there would fabricate a real contractor's attestation and
email a real client. Fixture: workspace "Ummon Link Test Co" billing
`lab@bookkeepingconroe.com`, one contractor, 3 invoices, $464.50, served from
`next dev` on :3100. Rejected: missing attestation, a `.test` address,
send-before-confirm, a bad token. Confirm wrote email + phone to the
contractor, `confirmedByEmail` on all 3, the address onto the `MagicLink`, 3
`confirmed` events. Send delivered "Invoices from Link Test Worker" with 3
PDFs + `invoices.csv`, marked all 3 `sent` at `2026-10-13T14:33:42.020Z`, wrote
3 `sent_to_client` events. Both actions were driven by importing them under
`tsx`, which throws `static generation store missing in revalidatePath` after
the work completes — an artifact of calling a server action outside a request,
not a defect; writes and email verified after each. Fixture deleted;
production verified back at 7 users, 3 workspaces, 8 contractors, 139
invoices, AAA 135 / 0 confirmed / 0 sent.

**Netlify did not build the merge commit on its own.** PR #26's deploy preview
went green at 14:35Z and production stayed on `26671fa`; a build had to be
triggered with `netlify api createSiteBuild`. Verified live afterwards: Ashley's
link on uncleinvoice.com renders "paid you 7 times, $705.00" with the email and
phone fields. Worth watching on the next merge.

**Links.** The four live links in `ripley:~/aaa-contractor-links.txt` (mode 600,
expire 2026-11-12) work with the new flow unchanged. Four replacements minted
during this session were deleted again rather than leaving two sets of bearer
tokens for a client's financial records; the database holds exactly 4
`contractor_invoices` links. The email that carries them is at
`ripley:~/aaa-email-to-racquel.txt` (mode 600). **Nothing has been sent.**

**Tom's decision, recorded.** Racquel should supply the contractors' email
addresses, and that is a scope question: Rock Hill's agreement covers
categorising, reconciling and reporting, and says nothing about vendor contact
details. The rule he proposed is 1099-based — if a vendor gets a 1099, the
client provides the email address and Tom records it on the QuickBooks vendor
profile. Put on the docket as "Engagement agreements: say who provides vendor
email addresses". It no longer blocks AAA: the contractor types their own
address at the moment they confirm.
