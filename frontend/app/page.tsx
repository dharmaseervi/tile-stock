"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode, Boxes, AlertTriangle, FileText, Users,
  Layers, Check, ArrowRight, Menu, X,
} from "lucide-react";
import { isLoggedIn } from "@/lib/api";
import Reveal from "@/components/Reveal";
import LogoMark from "@/components/LogoMark";

/* ────────────────────────────────────────────────────────────
   The hero is a tile showroom sample board. Each cell is a real
   tile carrying real product data — the way a dealer already
   reads their own wall.
   ──────────────────────────────────────────────────────────── */

type BoardTile = {
  brand: string;
  design: string;
  size: string;
  boxes: number;
  reorder: number;
  lot: string;
  tone: string;
  span?: string;
};

const BOARD: BoardTile[] = [
  { brand: "Kajaria", design: "Dolomite Grey", size: "600×1200", boxes: 184, reorder: 40, lot: "ZX-04", tone: "#C9CDC8", span: "col-span-2 row-span-2" },
  { brand: "Somany",  design: "Genoua Aqua",   size: "600×1200", boxes: 96,  reorder: 30, lot: "ZX-11", tone: "#AEC4C2" },
  { brand: "Johnson", design: "Sofita Grey",   size: "600×600",  boxes: 12,  reorder: 25, lot: "ZX-07", tone: "#B7B2AC" },
  { brand: "Orient",  design: "Valley White",  size: "300×600",  boxes: 240, reorder: 60, lot: "ZX-02", tone: "#D6D9D4" },
  { brand: "Simpolo", design: "Onyx Sand",     size: "800×800",  boxes: 58,  reorder: 20, lot: "ZX-19", tone: "#C6BBA6" },
];

function SampleBoard() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="grid grid-cols-3 grid-rows-3 gap-[3px] p-[3px] rounded-lg overflow-hidden"
      style={{ background: "var(--color-grout-strong)" }}
      aria-label="Tile sample board showing live stock"
    >
      {BOARD.map((t, i) => {
        const low = t.boxes <= t.reorder;
        return (
          <div
            key={t.design}
            className={`${t.span ?? ""} relative p-3 flex flex-col justify-between transition-all duration-700 ease-out motion-reduce:transition-none`}
            style={{
              background: t.tone,
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(8px)",
              transitionDelay: `${i * 90}ms`,
              minHeight: t.span ? "auto" : "104px",
            }}
          >
            {/* Glaze sheen — a real tile catches light across its face */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(148deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,.06) 100%)",
              }}
            />

            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[.09em] leading-none" style={{ color: "rgba(30,36,34,.55)" }}>
                  {t.brand}
                </p>
                <p className="text-[13px] leading-tight mt-1 truncate font-medium" style={{ color: "var(--color-ink)" }}>
                  {t.design}
                </p>
              </div>
              {low && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none flex items-center gap-0.5"
                  style={{ background: "var(--color-ochre)", color: "#fff" }}
                >
                  <AlertTriangle size={8} />
                  LOW
                </span>
              )}
            </div>

            <div className="relative">
              <p
                className="font-[family-name:var(--font-mono)] leading-none"
                style={{
                  color: low ? "var(--color-oxide)" : "var(--color-ink)",
                  fontSize: t.span ? "30px" : "20px",
                  fontWeight: 500,
                }}
              >
                {t.boxes}
                <span className="text-[10px] ml-1 font-normal" style={{ color: "rgba(30,36,34,.55)" }}>boxes</span>
              </p>
              <p
                className="text-[10px] mt-1.5 flex items-center gap-1 font-[family-name:var(--font-mono)]"
                style={{ color: "rgba(30,36,34,.5)" }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-[2px] border"
                  style={{ background: t.tone, borderColor: "rgba(0,0,0,.18)", filter: "brightness(.92)" }}
                />
                {t.size} · lot {t.lot}
              </p>
            </div>
          </div>
        );
      })}

      {/* The ninth cell is the scan target — how staff actually touch
          this product on the showroom floor. */}
      <div
        className="flex flex-col items-center justify-center gap-1.5 transition-all duration-700 ease-out motion-reduce:transition-none"
        style={{
          background: "var(--color-glaze)",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(8px)",
          transitionDelay: `${BOARD.length * 90}ms`,
          minHeight: "104px",
        }}
      >
        <QrCode size={26} color="#fff" strokeWidth={1.5} />
        <p className="text-[10px] text-white/85 text-center leading-tight px-2">Scan any tile</p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Boxes, title: "Stock that can't drift", body: "Every box in and out is a ledger entry, so the count you see is the count you have. No manual tallies to reconcile at month end." },
  { icon: Layers, title: "Shade lot tracking", body: "Record the lot number on every inward. When a customer comes back for four more boxes, you know which batch matched their floor." },
  { icon: QrCode, title: "QR on the display tile", body: "Print a label, stick it on the sample. Staff scan it and see live stock, rate, and lots — then record the sale in two taps." },
  { icon: AlertTriangle, title: "Reorder before you run out", body: "The app watches how fast each design moves and tells you which ones are weeks from zero, with a suggested order quantity." },
  { icon: FileText, title: "Challans your loaders can use", body: "Build a challan, hand the phone to the godown. They tick each design as it's loaded. Dispatch stays locked until everything's ticked." },
  { icon: Users, title: "Staff with the right access", body: "Invite your counter staff. They record stock and raise challans; rates, margins, and deletions stay with you." },
];

const STEPS = [
  { n: "01", title: "Add your designs", body: "Brand, series, size, finish, rate. Sizes come from a list, so sq.ft per box fills itself in." },
  { n: "02", title: "Record what arrives", body: "Log the inward with its lot number. Print a QR label and stick it on the display tile." },
  { n: "03", title: "Sell from the floor", body: "Scan, check stock, record the outward, raise a challan. The count updates as you go." },
  { n: "04", title: "See what's moving", body: "Best sellers, dead stock, brand-wise turnover, stock value — and a reorder list that writes itself." },
];

const SCREENS = [
  {
    src: "/screens/challan.png",
    alt: "A delivery challan with each tile design ticked off as it is loaded",
    title: "The loading checklist",
    body: "Each design on the challan gets a tick box. Loaders work down the list on the phone, and dispatch stays locked until every line is ticked — so nothing goes out short.",
  },
  {
    src: "/screens/analytics.png",
    alt: "Analytics showing best selling designs, brand turnover and dead stock",
    title: "What's moving, what's stuck",
    body: "Best sellers by boxes out, turnover per brand, and the designs sitting untouched for sixty days — the ones worth discounting before they age further.",
  },
];

const FAQS = [
  { q: "Do I have to enter all my designs before I can use it?", a: "No. Add the designs you sell most, start recording those, and grow the catalogue as you go. Most dealers start with 20–30 and expand over the first fortnight." },
  { q: "Can my staff use it without seeing my rates?", a: "Yes. Staff accounts record stock and raise challans but can't see margins, edit rates, or delete products. On a challan, prices are hidden by default — you switch them on when you're sharing it with a customer." },
  { q: "What happens to my data if I stop paying?", a: "Your data stays. You can export your full movement history as CSV and download stock reports as PDF at any time, including during the trial." },
  { q: "Does it work on a phone?", a: "The whole thing runs in a browser and is built for a phone first — that's where scanning and loading actually happen. No app to install for you or your staff." },
  { q: "Is this GST billing software?", a: "No. It's stock management with delivery challans. You keep using your existing billing software for GST invoices — this tells you what you have and what to reorder." },
];

export default function LandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  const nav = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div style={{ background: "var(--color-kiln)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "rgba(247,248,246,.85)", borderBottom: "1px solid var(--color-grout)" }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" style={{ color: "var(--color-glaze-deep)" }}>
            <LogoMark size={21} />
            <span className="font-[family-name:var(--font-display)] italic text-[17px] tracking-tight">
              Tiles Stock
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-[var(--color-ink)] transition-colors">{n.label}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm px-3 py-2" style={{ color: "var(--color-ink-soft)" }}>Log in</Link>
            <Link href="/signup" className="text-sm text-white px-4 py-2 rounded-md font-medium" style={{ background: "var(--color-glaze)" }}>
              Start free trial
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" style={{ color: "var(--color-ink-soft)" }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-5 pb-4 space-y-1" style={{ borderTop: "1px solid var(--color-grout)" }}>
            {nav.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {n.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm py-2 rounded-md grout-border" style={{ color: "var(--color-ink-soft)" }}>Log in</Link>
              <Link href="/signup" className="flex-1 text-center text-sm text-white py-2 rounded-md font-medium" style={{ background: "var(--color-glaze)" }}>Start free trial</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[.14em] mb-5 font-medium" style={{ color: "var(--color-glaze)" }}>
              Stock software for tile dealers
            </p>

            <h1
              className="font-[family-name:var(--font-display)] leading-[1.05] tracking-[-.02em]"
              style={{ color: "var(--color-ink)", fontSize: "clamp(2.4rem, 5.5vw, 3.9rem)" }}
            >
              Know what's on the{" "}
              <span className="italic" style={{ color: "var(--color-glaze-deep)" }}>godown floor</span>{" "}
              without walking it.
            </h1>

            <p className="mt-6 text-[17px] leading-relaxed max-w-lg" style={{ color: "var(--color-ink-soft)" }}>
              Track every box by design, size, and shade lot. Catch the fast movers before they hit
              zero. Hand your loaders a challan they can tick off — all from the phone in your pocket.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="text-white px-6 py-3 rounded-md font-medium text-[15px] inline-flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "var(--color-glaze)" }}
              >
                Start free trial
                <ArrowRight size={16} />
              </Link>
              <a
                href="#how"
                className="px-6 py-3 rounded-md font-medium text-[15px] grout-border transition-colors hover:bg-[var(--color-kiln-dim)]"
                style={{ color: "var(--color-ink)" }}
              >
                See how it works
              </a>
            </div>

            <p className="mt-4 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              30 days free · No card needed · Works on any phone
            </p>
          </div>

          <div className="lg:pl-4">
            <SampleBoard />
            <p className="mt-3 text-[12px] text-center" style={{ color: "var(--color-ink-soft)" }}>
              Your wall, with the numbers on it.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section style={{ borderTop: "1px solid var(--color-grout)", background: "var(--color-kiln-dim)" }}>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <Reveal as="h2" className="font-[family-name:var(--font-display)] text-[26px] sm:text-[32px] leading-tight max-w-2xl" style={{ color: "var(--color-ink)" }}>
            The register says one thing. The godown says another.
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-px mt-10 rounded-lg overflow-hidden" style={{ background: "var(--color-grout)" }}>
            {[
              { head: "A shade that doesn't match", body: "The customer comes back for four more boxes. Nobody noted which lot the first thirty came from, so the patch on their floor is a different grey." },
              { head: "The design that sold out quietly", body: "Your best mover ran dry three weeks ago. You found out when a contractor asked for it and left to buy elsewhere." },
              { head: "Capital sitting in a corner", body: "Forty boxes of a design nobody has asked for since Diwali, and no easy way to spot it against everything else on the floor." },
            ].map((c, i) => (
              <Reveal key={c.head} delay={i * 90} className="p-6 bg-white">
                <h3 className="text-[15px] font-medium mb-2" style={{ color: "var(--color-ink)" }}>{c.head}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{c.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-20">
        <Reveal as="p" className="text-[11px] uppercase tracking-[.14em] mb-4 font-medium" style={{ color: "var(--color-glaze)" }}>
          What you get
        </Reveal>
        <Reveal as="h2" delay={70} className="font-[family-name:var(--font-display)] text-[28px] sm:text-[36px] leading-tight max-w-xl" style={{ color: "var(--color-ink)" }}>
          Built around how a tile counter actually runs.
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px mt-12 rounded-lg overflow-hidden" style={{ background: "var(--color-grout)" }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 80} className="bg-white p-6">
                <div className="w-9 h-9 rounded-md flex items-center justify-center mb-4" style={{ background: "var(--color-glaze-tint)" }}>
                  <Icon size={17} style={{ color: "var(--color-glaze-deep)" }} />
                </div>
                <h3 className="text-[15px] font-medium mb-2" style={{ color: "var(--color-ink)" }}>{f.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{f.body}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20" style={{ borderTop: "1px solid var(--color-grout)", background: "var(--color-kiln-dim)" }}>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
          <Reveal as="p" className="text-[11px] uppercase tracking-[.14em] mb-4 font-medium" style={{ color: "var(--color-glaze)" }}>
            How it works
          </Reveal>
          <Reveal as="h2" delay={70} className="font-[family-name:var(--font-display)] text-[28px] sm:text-[36px] leading-tight max-w-xl" style={{ color: "var(--color-ink)" }}>
            Set up in an afternoon. Running by the next delivery.
          </Reveal>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <p
                  className="font-[family-name:var(--font-mono)] text-[13px] mb-3 pb-3"
                  style={{ color: "var(--color-glaze)", borderBottom: "1px solid var(--color-grout-strong)" }}
                >
                  {s.n}
                </p>
                <h3 className="text-[15px] font-medium mb-2" style={{ color: "var(--color-ink)" }}>{s.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* Screens — show the two moments that sell it: the loading
          checklist and what the numbers look like once data is in. */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <Reveal as="p" className="text-[11px] uppercase tracking-[.14em] mb-4 font-medium" style={{ color: "var(--color-glaze)" }}>
          On the floor
        </Reveal>
        <Reveal as="h2" delay={70} className="font-[family-name:var(--font-display)] text-[28px] sm:text-[36px] leading-tight max-w-xl" style={{ color: "var(--color-ink)" }}>
          What your staff sees when the truck is waiting.
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-5 mt-12">
          {SCREENS.map((sc, i) => (
            <Reveal key={sc.title} delay={i * 110} className="bg-white rounded-lg grout-border overflow-hidden">
              <div
                className="aspect-[16/10] flex items-center justify-center"
                style={{ background: "var(--color-kiln-dim)", borderBottom: "1px solid var(--color-grout)" }}
              >
                {/* Drop a screenshot into /public and swap this block for:
                    <img src={sc.src} alt={sc.alt} className="w-full h-full object-cover object-top" /> */}
                <img
                  src={sc.src}
                  alt={sc.alt}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="p-5">
                <h3 className="text-[15px] font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>{sc.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{sc.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-20">
        <Reveal className="text-center max-w-lg mx-auto">
          <p className="text-[11px] uppercase tracking-[.14em] mb-4 font-medium" style={{ color: "var(--color-glaze)" }}>Pricing</p>
          <h2 className="font-[family-name:var(--font-display)] text-[28px] sm:text-[36px] leading-tight" style={{ color: "var(--color-ink)" }}>
            One price. Your whole counter.
          </h2>
          <p className="mt-4 text-[15px]" style={{ color: "var(--color-ink-soft)" }}>
            Unlimited designs, unlimited staff, unlimited challans. No per-user charge — your loaders
            shouldn't cost extra.
          </p>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          <Reveal className="bg-white rounded-lg p-7 grout-border">
            <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-ink-soft)" }}>Monthly</p>
            <p className="font-[family-name:var(--font-mono)] text-[34px] leading-none" style={{ color: "var(--color-ink)" }}>
              ₹499<span className="text-[14px] ml-1" style={{ color: "var(--color-ink-soft)" }}>/month</span>
            </p>
            <Link
              href="/signup"
              className="mt-6 block text-center text-[14px] py-2.5 rounded-md font-medium grout-border transition-colors hover:bg-[var(--color-kiln-dim)]"
              style={{ color: "var(--color-ink)" }}
            >
              Start free trial
            </Link>
          </Reveal>

          <Reveal delay={100} className="bg-white rounded-lg p-7 relative" style={{ border: "2px solid var(--color-glaze)" }}>
            <span
              className="absolute -top-2.5 right-5 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide"
              style={{ background: "var(--color-glaze)", color: "#fff" }}
            >
              Two months free
            </span>
            <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-ink-soft)" }}>Yearly</p>
            <p className="font-[family-name:var(--font-mono)] text-[34px] leading-none" style={{ color: "var(--color-ink)" }}>
              ₹4,999<span className="text-[14px] ml-1" style={{ color: "var(--color-ink-soft)" }}>/year</span>
            </p>
            <Link
              href="/signup"
              className="mt-6 block text-center text-[14px] py-2.5 rounded-md font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--color-glaze)" }}
            >
              Start free trial
            </Link>
          </Reveal>
        </div>

        <ul className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-3 max-w-2xl mx-auto text-[14px]">
          {[
            "Unlimited designs and stock movements",
            "Unlimited staff accounts",
            "QR labels for every design",
            "Delivery challans with loading checklist",
            "Reorder suggestions and dead-stock alerts",
            "PDF stock reports and CSV export",
            "Customer ledger and supplier records",
            "Shareable public price list",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2.5" style={{ color: "var(--color-ink-soft)" }}>
              <Check size={15} className="mt-0.5 shrink-0" style={{ color: "var(--color-moss)" }} />
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20" style={{ borderTop: "1px solid var(--color-grout)", background: "var(--color-kiln-dim)" }}>
        <div className="max-w-3xl mx-auto px-5 py-16 sm:py-24">
          <Reveal as="h2" className="font-[family-name:var(--font-display)] text-[28px] sm:text-[36px] leading-tight mb-10" style={{ color: "var(--color-ink)" }}>
            Questions dealers ask.
          </Reveal>

          <div className="rounded-lg overflow-hidden bg-white grout-divide grout-border">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-[15px] font-medium" style={{ color: "var(--color-ink)" }}>{f.q}</span>
                  <span
                    className="shrink-0 transition-transform duration-200 font-[family-name:var(--font-mono)] text-lg leading-none"
                    style={{ color: "var(--color-glaze)", transform: openFaq === i ? "rotate(45deg)" : "none" }}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 -mt-1 text-[14px] leading-relaxed max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ borderTop: "1px solid var(--color-grout)" }}>
        <Reveal className="max-w-6xl mx-auto px-5 py-20 sm:py-28 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[30px] sm:text-[42px] leading-tight max-w-2xl mx-auto" style={{ color: "var(--color-ink)" }}>
            Start with the designs you sell most.
          </h2>
          <p className="mt-5 text-[16px] max-w-md mx-auto" style={{ color: "var(--color-ink-soft)" }}>
            Add twenty designs this evening and record tomorrow's delivery against them. That's the
            whole setup.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-md font-medium text-[15px] transition-opacity hover:opacity-90"
            style={{ background: "var(--color-glaze)" }}
          >
            Start free trial
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            30 days free · No card needed
          </p>
        </Reveal>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-grout)", background: "var(--color-kiln-dim)" }}>
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2" style={{ color: "var(--color-glaze-deep)" }}>
            <LogoMark size={17} />
            <span className="font-[family-name:var(--font-display)] italic text-[15px]">Tiles Stock</span>
          </span>
          <div className="flex items-center gap-6 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <a href="#features" className="hover:text-[var(--color-ink)] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[var(--color-ink)] transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-[var(--color-ink)] transition-colors">Log in</Link>
          </div>
          <p className="text-[12px]" style={{ color: "var(--color-ink-soft)" }}>Made for Indian tile dealers</p>
        </div>
      </footer>
    </div>
  );
}
