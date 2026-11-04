# Next milestone: a clear bookkeeper workflow

## Outcome

A bookkeeper can open Uncle Invoice on a phone, choose a client, see which contractors still owe paperwork, and find the next action without scrolling past repeated summaries. A contractor can review and correct prepared drafts, confirm the right invoices, and review the client recipient and optional bookkeeper copy before sending. The bookkeeper can obtain the confirmed PDFs for attachment to existing payments.

This milestone uses isolated sample records. Loading AAA's actual 2026 payment data and inviting real contractors follow a separate readiness gate after the UI is reviewed.

## Product decisions for this milestone

- Organize the main path as **Clients → Client's contractors → Contractor's invoices → Review and send**. Keep an all-invoices view for searching and checking records.
- Client home should answer “whose paperwork needs attention?” Show compact contractor rows with invoice counts by review/delivery state and a clear next action. Put client setup and adding contractors behind secondary controls.
- Replace the duplicate client overview with useful contractor work. Preserve old URLs with redirects or compatible destinations where appropriate.
- Keep payment state independent of paperwork state. “Already paid” must remain visible while a draft awaits confirmation. Sending paperwork must not turn a historical payment into money owed.
- Use clear labels: Needs review, Confirmed, Queued, Sent, Failed where supported. Provider acceptance supports “Sent”; it does not prove receipt. Do not display a delivery claim the system cannot verify.
- Offer a downloadable ZIP of confirmed PDFs and a summary for the bookkeeper. Let contractors send PDFs directly without having to handle ZIP files on their phones. Preview To, optional CC, invoice count, total, and attachment format before sending.
- Keep the current contractor mode and public marketing work outside this redesign, except for shared components and wording that must agree with the actual flow.

## Implementation sequence

### 0. Restore sign-in on the phone preview

Tom reported that the homepage sign-in button does nothing over the phone preview address. Reproduced on `http://100.98.89.93:3000/`: Next rejects script requests carrying that Origin with HTTP 403, so client controls never activate. Allow the exact private preview hostname in `allowedDevOrigins`, then verify the header dialog and its Sign in switch over that address before beginning the workspace redesign.

Follow-up: opening the dialog is fixed, but Google authentication is still blocked for the phone preview. Read-only inspection of the running Google start route on 2026-11-04 returned `redirect_uri=http://localhost:3000/api/auth/google/callback`. On the phone this returns to the phone itself, and the OAuth state cookie belongs to the private-IP origin. Email sign-in links also use APP_URL, currently localhost. Password authentication uses a relative local redirect and can work for an existing local account with a password; existence of Tom's password was not checked. Finish a consistent phone-reachable auth origin and matching authorized Google callback before declaring phone sign-in complete. Do not redirect a local development auth session through production or create a bypass.

### 1. Establish the visual baseline and screen map

Read `reports/site-review-2026-11-04.md` and inspect the existing dirty worktree before editing. The first review did not visually inspect authenticated screens. Establish an isolated fixture with one client, several contractors, and mixed payment/review/delivery states, then inspect the actual screens at 390px and desktop widths. Do not reset or seed the working client database.

Make a navigable layout for client list and client contractor list first. Review it with Tom on his phone before extending the design to every screen. Fetch origin and work on a topic branch; preserve the existing unrelated changes. Read the installed Next.js guides before app code changes.

### 2. Rebuild the bookkeeper home and client workspace

Replace the large summary-card stack and recent-event section with a compact searchable client list, short status counts, and one obvious action per client. Make client contractor rows the primary working view. Use a compact client header, obvious back navigation, and a small set of task tabs. Move setup forms out of the default working view. Provide useful empty states and clear loading/error states.

Primary files: `src/components/bookkeeper-home.tsx`, `src/components/workspace-dashboard.tsx`, `src/app/app/w/[workspaceId]/layout.tsx`, `src/app/app/w/[workspaceId]/page.tsx`, `src/app/app/w/[workspaceId]/contractors/page.tsx`.

### 3. Make invoice browsing and contractor review work together

Use compact mobile rows and a dense desktop table. Add contractor search/picker, year and paperwork-state filters, and bounded page sizes. Keep filters and totals consistent with the displayed scope. Display paid state separately.

Connect each draft in the contractor batch list to a safe correction flow. Reuse the existing individual review form where possible; enforce contractor ownership and token scope on the server. Saving an edit must not confirm or send it. Clearly show which invoices a bulk confirmation covers; recalculate counts and totals from those exact invoices. Keep confirmed invoices protected from silent edits.

Primary files: `src/app/app/w/[workspaceId]/invoices/page.tsx`, `src/components/contractor-invoice-list.tsx`, `src/components/contractor-review-form.tsx`, relevant review routes and actions.

### 4. Complete package review and truthful send status

Add recipient/CC review and confirmed-PDF ZIP export to the bookkeeper path, adapting the existing ZIP endpoint after checking its access rules. Keep PDF email available to the contractor.

Fix the shared send service to select only the confirmed invoices included in the approved package. Exclude previously sent invoices from a normal send; any resend must be explicit. Distinguish outbox-only queueing, provider acceptance, and failure. Protect against double taps and retries; retain enough send-attempt information to avoid resending a package when email succeeds but a database update fails. Assess attachment count/size before sending and show an actionable error if the package exceeds the provider limit. No real outbound messages during development.

Primary files: `src/lib/contractor-send.ts`, `src/lib/mail.ts`, contractor send actions/components, `src/app/api/invoices/zip/route.ts`, and schema only if needed for reliable delivery state.

### 5. Verify the whole sample journey and hand it over

Run a fixture journey: bookkeeper opens client → finds contractor → contractor corrects one draft → confirms selected drafts → previews recipient and CC → sends through a test transport → bookkeeper exports confirmed PDFs. Check phone and desktop layouts, keyboard access, loading/empty/error states, and long names/large lists.

Add focused tests for the consequential behavior: cross-client/token access, edits versus confirmation, paid state preservation, exact selected invoice counts/totals, no duplicate sends, queued/failed mail never shown as sent, and ZIP scope. Run lint, the real production build, and relevant existing payment/phone/upgrade tests if shared paths change. Record failures and skips. Update HANDOFF with the branch, checks, and any remaining release gate.

## Completion criteria

- On a 390px screen, working lists fit without page-level horizontal scrolling; primary actions and navigation remain reachable.
- A client can be chosen from the bookkeeper home and its contractors needing paperwork appear immediately, with no repeated overview detour.
- Invoice review, correction, confirmation, and sending have distinct effects and clear labels.
- The client recipient and optional bookkeeper CC are visible before send; the displayed package matches the actual attachments.
- A queued, failed, or duplicate attempt cannot falsely mark invoices as sent. Existing paid records remain paid.
- A bookkeeper can export only the confirmed invoices intended for the package.
- Tom reviews the updated phone flow with sample data before live account setup or payment import begins.

## Following milestone: AAA pilot readiness

After the UI is accepted, add import preview and source payment IDs, resolve duplicate handling for equal same-day payments, make historical-paid defaults explicit, and check candidate payment rows against the source books. Then stage the real client account, verify totals and PDFs, and obtain approval for real invitations or outbound messages. Direct QuickBooks integration is not required for this pilot; exports and later manual attachment remain the workflow.

## Plain summary for Tom

We will make bookkeeper mode easy to use on your phone. You will choose a client, see whose paperwork is missing, and open that contractor's invoices. The contractor will check and fix the drafts, then choose what to send. Before sending, they will see who gets it and can copy you. You will be able to download the checked invoices together. We will try the full flow with sample records before loading AAA's payment data.
