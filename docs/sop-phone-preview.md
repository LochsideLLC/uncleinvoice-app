# Phone preview controls do nothing — 2026-11-04

If the page renders over a private network address but Sign up / Sign in does nothing, check whether Next.js rejects script requests carrying that address in the Origin header. A plain curl without browser headers can return 200 while the browser request gets 403 Unauthorized.

Next 16's dev server requires additional preview hostnames in `allowedDevOrigins` in `next.config.ts`. Use the exact hostname/IP without protocol or port; do not allow every origin. Ripley's phone preview is `100.98.89.93`. See the installed guide `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md`.

Verified on 2026-11-04: the same script request changed from HTTP 403 to HTTP 200 after allowing the private address. Reloading the homepage at that address let the header dialog open and switch to the Sign in form. This verifies opening the form, not submitting credentials or completing account authentication.

## One-tap demo bookkeeper access

The main `.env` on Ripley points to hosted Supabase. Never add a password-free developer sign-in while that database is active. On 2026-11-04, the existing local Docker Postgres database on port 5433 was migrated and seeded with the Sunrise Cleaning Co. demo. `scripts/prepare-local-dev-access.mjs` added `test@bookkeepingconroe.com` as a non-admin bookkeeper on that fixture. The script refuses a remote DATABASE_URL.

The preview now runs on port 3000 with explicit local DATABASE_URL and DIRECT_URL values and `APP_URL=http://100.98.89.93:3000`. `/dev-access` appears only with `NODE_ENV=development` and a local database hostname. Its one-tap POST checks that Origin matches Host, signs in the local demo user, and redirects to the bookkeeper dashboard. A mismatched Origin returned 403; a same-origin POST returned 303, and the resulting session reached `/app` with Sunrise Cleaning Co. This is demo data only.

If the dev server restarts from `.env` without explicit local database variables, `/dev-access` returns 404. Do not loosen that guard or change the hosted account's password to make the demo work.
