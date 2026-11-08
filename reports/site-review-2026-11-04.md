# Uncle Invoice site review — 2026-11-04

## Scope and limits

Reviewed the public homepage in the running local site and read the current bookkeeper, contractor review, import, and send code. `/app` redirected this browser to `/login?next=%2Fapp`, so the private bookkeeper screens were **not visually inspected**. Mobile layout findings below are inferences from the markup and responsive classes, not a phone screenshot. No app code, account data, or invoices were changed. No tests were run. The worktree already contained 14 modified files and one untracked file before this review; findings refer to that current worktree, not necessarily `origin/main`.

## Ranked findings

### 1. Make bookkeeper home a compact client work queue

The page spends its first screen on a centered instruction/action block, four large summary cards, and a second “My clients” heading. Each client then gets a large card with three counts and four links. A “Recent payment imports” card follows. The same facts and actions appear again on each client overview. On a phone this creates a long path before reaching a contractor or invoice. Evidence: `src/components/bookkeeper-home.tsx:42-155`, `src/app/app/w/[workspaceId]/page.tsx:30-83`.

**Design target:** lead with one row/card per client: client name, number needing contractor review, number confirmed but not delivered, and one clear next action. Keep “Add client” and “Import payments” as secondary actions. Put detailed metrics and activity behind the client, rather than repeating them above the list. Avoid treating raw invoice events as import batches.

### 2. Reduce client navigation and repeated overview content

Bookkeeper toolbar has only the mode switcher while contractor mode gets section tabs and an action. A client page then stacks a back link, large title, and five wrapping navigation pills. The overview adds another three stat cards, three action buttons, and a recent invoice panel. This is especially costly in vertical space on mobile. Evidence: `src/components/workspace-dashboard.tsx:63-94`, `src/app/app/w/[workspaceId]/layout.tsx:23-41`, `src/app/app/w/[workspaceId]/page.tsx:30-83`.

**Design target:** make the client's invoice/contractor work the default destination and condense navigation to the few tasks used daily. Keep setup actions in a menu or settings area. Show workflow status once, at the place where action follows.

### 3. Rebuild the invoice list for phone-sized review

The client invoice page repeats four metrics, renders one pill per contractor plus status pills, then a six-column table in an `overflow-hidden` container. There is no visible paging or year filter. With many contractors or invoices, pills wrap and the table cannot scan well on a phone. Evidence: `src/app/app/w/[workspaceId]/invoices/page.tsx:96-192`.

**Design target:** on mobile use compact invoice rows with contractor, date, amount, paid/review/delivery state, and a direct action. Use a contractor picker/search and status/year filters; page or progressively load large lists. Preserve a dense table for wider screens.

### 4. Join the contractor's review, correction, and send path

The batch contractor link lists each invoice with only a PDF link and offers a single confirm-all action. Its copy tells the contractor to contact the client if something is wrong. A separate per-invoice `/review/[token]` page *does* have editable fields, but the batch list does not link to that edit path. The public copy says contractors can fix drafts, which is only true in the separate flow. Evidence: `src/components/contractor-invoice-list.tsx:43-50`, `src/components/contractor-invoice-list.tsx:117-149`, `src/components/contractor-review-form.tsx:35-92`, `src/app/upgrades/bookkeeper/page.tsx:20-23`.

**Design target:** give each draft a clear “Review / correct” action, show its review state in the list, and make bulk confirmation a deliberate final step after individual checks. Keep the invoice as the contractor's assertion, not merely a bookkeeper's payment transcription.

### 5. Fix delivery before any real contractor sends

The send form shows a count but does not show the recipient address or offer a bookkeeper CC. The service attaches individual PDFs and a CSV, not a ZIP. More seriously, the service selects **all confirmed invoices**, including ones already sent, even though the UI says it will send only unsent ones. If Resend is not configured, `sendEmail` stores an outbox row and returns; the service still marks every selected invoice as sent. Evidence: `src/components/contractor-invoice-list.tsx:89-114`, `src/lib/contractor-send.ts:32-96`, `src/lib/mail.ts:21-95`.

**Design target:** show To and optional CC for review, send only confirmed unsent invoices, and mark delivery only after the provider accepts it. Decide whether the client and bookkeeper need a ZIP, individual PDFs, or both; the current batch email is individual PDFs plus CSV. Do not describe queued mail as received.

### 6. Make import safe after the UI is settled

The form is a long schema/template explanation followed by a direct “Import drafts” button. There is no preview or row-by-row reconciliation. A blank `amount_paid` defaults to “Still owed, ready to send,” which is wrong for the AAA historical-paid use case unless the user changes it. Duplicate detection uses contractor, issue date, and amount because there is no source transaction ID; two real equal payments on the same date could collapse. Evidence: `src/components/import-invoices-form.tsx:11-65`, `src/actions/import.ts:57-61`, `src/actions/import.ts:94-114`.

**Design target:** preview proposed invoices and skipped rows before commit, show the chosen paid state prominently, and retain a source payment ID when available. Defer importing AAA's 2026 payments until the review/send flow is usable.

## Public site

The homepage loaded and clearly offers both contractor and bookkeeper audiences. Its hero and three-step sequence focus on creating a new invoice, downloading it, and getting paid; the missing-paperwork use case appears farther down in the bookkeeper card. The dedicated “How it works” and bookkeeper pages explain the payment-record workflow more directly. This is a smaller priority than the private bookkeeper work. Evidence: running homepage at `http://localhost:3000/`, `src/app/how-it-works/page.tsx:10-47`, `src/app/upgrades/bookkeeper/page.tsx:10-39`.

## Suggested Astra starting point

Use this review to redesign **bookkeeper home + one client invoice list** as a single compact mobile-first workflow. Inspect the current dirty worktree before editing. Validate at a 390px viewport with a safe fixture; do not load or alter AAA data. Then address contractor correction and delivery semantics before a live account is used. The highest-risk nonvisual bug is the send path in finding 5.
