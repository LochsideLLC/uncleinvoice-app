import Image from "next/image";
import Link from "next/link";
import { UncleStamp } from "@/components/brand-mark";

const FAQS = [
  {
    question: "Is Uncle Invoice really free?",
    answer:
      "Yes. You can create and download a professional invoice for free. A free account also lets you save invoices and send them from Uncle Invoice.",
  },
  {
    question: "Does Uncle Invoice process payments?",
    answer:
      "No. Uncle Invoice helps you create, send, and track invoices. Your customer pays you through the payment method you put on the invoice.",
  },
  {
    question: "Do I need an account to create an invoice?",
    answer:
      "No. You can make and download your first invoice without an account. Create a free account when you want Uncle Invoice to save your details and invoice history.",
  },
  {
    question: "Can I mark an invoice as paid?",
    answer:
      "Yes. Signed-in users can record full or partial payments and keep the amount still due clear.",
  },
  {
    question: "Can I email invoices through Uncle Invoice?",
    answer:
      "Yes. With a free account, you can email an invoice to your customer and keep a record of when it was sent.",
  },
  {
    question: "How does the Bookkeeper feature work?",
    answer:
      "Bookkeepers import payment records, prepare invoice drafts, and send each contractor a private link to check, correct, and confirm the invoices before sending. The Bookkeeper workspace is free, and one account can use both workspaces.",
  },
  {
    question: "Are both workspaces really free?",
    answer:
      "Yes. The Contractor workspace and the Bookkeeper workspace are both free, with no subscription. Your account can use either or both.",
  },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniInvoice({ paid = false }: { paid?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[15rem] bg-white p-4 text-[#201a15] shadow-[0_16px_40px_-28px_rgba(42,31,22,.55)] ring-1 ring-black/5">
      {paid ? (
        <span className="absolute right-4 top-5 -rotate-6 rounded border-2 border-emerald-600 px-2 py-0.5 [font-size:.78rem] font-black uppercase tracking-[.08em] text-emerald-600">
          Paid
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="[font-size:.68rem] font-bold">Your Business Name</p>
          <p className="mt-1 [font-size:.48rem] leading-[1.45] text-black/60">
            123 Main St.<br />Conroe, TX 77301<br />(936) 555-1234
          </p>
        </div>
        <p className="[font-size:.78rem] font-black tracking-wide">INVOICE</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 [font-size:.48rem] leading-[1.45]">
        <div>
          <p className="font-bold">Bill To</p>
          <p>Sally&apos;s Window Cleaning Service</p>
          <p>456 Oak Lane</p>
          <p>The Woodlands, TX 77380</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-right">
          <dt className="font-bold">Invoice #</dt><dd>INV-001</dd>
          <dt className="font-bold">Date</dt><dd>Oct 13, 2026</dd>
          <dt className="font-bold">Due Date</dt><dd>Nov 12, 2026</dd>
        </dl>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-black/20 pb-1 [font-size:.48rem] font-bold">
        <span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-black/10 py-2 [font-size:.48rem]">
        <span>Window Cleaning</span><span>1</span><span>$200.00</span><span>$200.00</span>
      </div>
      <div className="mt-2 flex justify-end gap-5 [font-size:.58rem] font-bold">
        <span>Total</span><span>$200.00</span>
      </div>
    </div>
  );
}

const invoiceRows = [
  ["INV-001", "Sally's Window Cleaning", "$200.00", "Paid", "emerald"],
  ["INV-002", "Johnson Properties", "$750.00", "Sent", "sky"],
  ["INV-003", "Martinez Landscaping", "$450.00", "Unpaid", "rose"],
  ["INV-004", "Green Leaf Maintenance", "$300.00", "Paid", "emerald"],
] as const;

function MiniDashboard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`w-full rounded-lg border border-black/10 bg-white p-3 shadow-sm ${compact ? "max-w-[18rem]" : ""}`}>
      <div className="flex items-center gap-3 border-b border-black/10 pb-2">
        <span className="[font-size:.7rem] font-bold">Invoices</span>
        <span className="flex-1 rounded border border-black/10 px-2 py-1 [font-size:.48rem] text-black/35">
          Search invoices...
        </span>
      </div>
      <div className="mt-1">
        {invoiceRows.map(([number, name, amount, status, color]) => (
          <div
            key={number}
            className="grid grid-cols-[.15fr_.55fr_.2fr_.18fr] items-center gap-1 border-b border-black/5 py-2 [font-size:.45rem] last:border-0"
          >
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm border border-black/15" />{number}</span>
            <span className="truncate">{name}</span>
            <span className="text-right">{amount}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-center font-semibold ${
                color === "emerald"
                  ? "bg-emerald-100 text-emerald-700"
                  : color === "sky"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-rose-100 text-rose-700"
              }`}
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuilderMockup() {
  return (
    <div className="h-full rounded-xl border border-line bg-paper p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <UncleStamp className="h-5 w-5" />
        <span className="display [font-size:.72rem]">Uncle Invoice</span>
      </div>
      <p className="mt-3 [font-size:.55rem] text-muted">Customer</p>
      <div className="mt-1 rounded border border-line bg-white px-2 py-1.5 [font-size:.58rem]">
        Sally&apos;s Window Cleaning Service
      </div>
      <p className="mt-3 [font-size:.55rem] font-bold">Items</p>
      <div className="mt-1 overflow-hidden rounded border border-line bg-white [font-size:.48rem]">
        <div className="grid grid-cols-[1fr_.2fr_.25fr_.28fr] bg-black/[.03] px-2 py-1.5 font-semibold">
          <span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span>
        </div>
        <div className="grid grid-cols-[1fr_.2fr_.25fr_.28fr] px-2 py-2">
          <span>Window Cleaning</span><span>1</span><span>$200.00</span><span>$200.00</span>
        </div>
      </div>
      <p className="mt-2 [font-size:.52rem] font-semibold text-accent">＋ Add item</p>
    </div>
  );
}

function AudienceCard({
  image,
  alt,
  title,
  copy,
  href,
  cta,
}: {
  image: string;
  alt: string;
  title: string;
  copy: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="grid min-h-[19rem] overflow-hidden rounded-[1.35rem] border border-line bg-paper shadow-[0_20px_50px_-42px_rgba(42,31,22,.55)] sm:grid-cols-[1.05fr_.95fr]">
      <div className="relative min-h-64 sm:min-h-full">
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 28vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col justify-center p-6 lg:p-7">
        <h3 className="text-2xl leading-tight text-ink">{title}</h3>
        <p className="mt-3 text-detail leading-relaxed text-muted">{copy}</p>
        <Link href={href} className="btn btn-primary mt-5 self-start">
          {cta} <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}

export function HomeSections() {
  return (
    <>
      <section className="border-t border-line bg-paper/70 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl leading-tight text-ink sm:text-5xl">
              Built for the people who do the work.
            </h2>
            <p className="mt-3 text-detail leading-relaxed text-muted sm:text-lg">
              Whether you&apos;re sending invoices or helping clients get their
              paperwork in order, Uncle Invoice makes it easier.
            </p>
          </div>
          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <AudienceCard
              image="/images/home-sections/contractor.webp"
              alt="Independent contractor standing beside his service van"
              title="For Contractors & Small Businesses — Free"
              copy="Create professional invoices, send them to customers, accept payments, and track what’s been paid. No accounting experience required."
              href="/create"
              cta="Create an Invoice — Free"
            />
            <AudienceCard
              image="/images/home-sections/bookkeeper.webp"
              alt="Bookkeeper working at her laptop in a warm office"
              title="For Bookkeepers — Free"
              copy="Turn client payment records into draft invoices that contractors can verify and send, helping resolve missing documentation."
              href="/signup?workspace=bookkeeper"
              cta="Explore Bookkeeper Tools — Free"
            />
          </div>
        </div>
      </section>

      <section id="home-how-it-works" className="bg-paper py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-4xl leading-tight text-ink sm:text-5xl">How it works</h2>
            <p className="mt-2 text-detail text-muted sm:text-lg">
              Create and send a professional invoice in three simple steps.
            </p>
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-3 lg:gap-0">
            <article className="flex flex-col lg:border-r lg:border-line lg:pr-8">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">1</span>
                <div>
                  <h3 className="text-2xl leading-tight">Create</h3>
                  <p className="mt-1 text-detail leading-snug text-muted">
                    Enter your business and customer details, add the items or services, and review.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex-1"><BuilderMockup /></div>
            </article>
            <article className="flex flex-col lg:border-r lg:border-line lg:px-8">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">2</span>
                <div>
                  <h3 className="text-2xl leading-tight">Download</h3>
                  <p className="mt-1 text-detail leading-snug text-muted">
                    Generate a professional PDF invoice with your logo and payment details.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-1 items-center justify-center rounded-xl bg-[#f4eee5] p-4">
                <MiniInvoice />
              </div>
            </article>
            <article className="flex flex-col lg:pl-8">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">3</span>
                <div>
                  <h3 className="text-2xl leading-tight">Get paid</h3>
                  <p className="mt-1 text-detail leading-snug text-muted">
                    Send it to your customer and keep track of what&apos;s been paid.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-1 items-center rounded-xl bg-[#f4eee5] p-4">
                <MiniDashboard />
              </div>
            </article>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="grid min-h-56 items-center gap-6 overflow-hidden rounded-[1.35rem] bg-[linear-gradient(120deg,#e9f0e3,#f5f2e9)] p-6 sm:grid-cols-[.9fr_1.1fr]">
              <MiniInvoice paid />
              <div>
                <h3 className="text-3xl leading-tight">Professional invoices build trust.</h3>
                <p className="mt-3 text-detail leading-relaxed text-muted">
                  Send clean, professional invoices with your logo, payment terms,
                  and all the details your customers expect.
                </p>
              </div>
            </article>
            <article className="grid min-h-56 items-center gap-6 overflow-hidden rounded-[1.35rem] bg-[linear-gradient(120deg,#e4f2f8,#f1f7fa)] p-6 sm:grid-cols-[1.05fr_.95fr]">
              <div className="rounded-xl bg-[#2c302f] p-2 pb-4 shadow-xl">
                <MiniDashboard compact />
              </div>
              <div>
                <h3 className="text-3xl leading-tight">Create a free account to do more.</h3>
                <p className="mt-3 text-detail leading-relaxed text-muted">
                  Save your invoices, email them directly through Uncle Invoice,
                  and keep track of what&apos;s been paid and unpaid.
                </p>
                <Link href="/signup" className="btn btn-ghost link-accent mt-5 border-accent">
                  Create a free account <ArrowIcon />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-background py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div>
            <h2 className="text-4xl leading-tight text-ink sm:text-5xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-detail leading-relaxed text-muted sm:text-lg">
              Everything you need to know about using Uncle Invoice.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {FAQS.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-line bg-paper px-4 shadow-sm open:md:col-span-2"
              >
                <summary className="flex min-h-12 list-none items-center justify-between gap-4 py-3 text-detail font-semibold text-ink marker:content-none">
                  {item.question}
                  <span className="text-xl font-normal text-muted transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="border-t border-line pb-4 pt-3 text-detail leading-relaxed text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(110deg,#96331f,#b7492c)] text-accent-ink">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-6 px-6 py-9 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-3xl leading-tight sm:text-4xl">Create your first invoice — free.</h2>
            <p className="mt-2 text-detail text-white/80">
              No account required. Professional invoices in minutes.
            </p>
          </div>
          <Link href="/create" className="btn btn-white shrink-0 px-7 py-4">
            Create Invoice — Free
          </Link>
        </div>
      </section>
    </>
  );
}
