import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import LogoMark from "@/components/LogoMark";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Tiles Stock collects from dealers and their staff, why, who processes it, and how to delete your account.",
  alternates: { canonical: "/privacy" },
};

const CONTACT = "dharmaseervijb18239@gmail.com";
const UPDATED = "16 September 2026";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-10">
      <h2
        className="font-[family-name:var(--font-display)] text-[22px] leading-snug tracking-tight"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[var(--color-grout-strong)]">{children}</ul>;
}

function B({ children }: { children: ReactNode }) {
  return <strong className="font-medium" style={{ color: "var(--color-ink)" }}>{children}</strong>;
}

function Mail({ subject }: { subject?: string }) {
  const href = `mailto:${CONTACT}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return (
    <a href={href} className="underline underline-offset-2 break-all" style={{ color: "var(--color-glaze)" }}>
      {CONTACT}
    </a>
  );
}

const contents = [
  ["collect", "Information we collect"],
  ["device", "App permissions"],
  ["use", "How we use it"],
  ["your-customers", "Your customers' and suppliers' details"],
  ["sharing", "Who we share it with"],
  ["storage", "Where it is stored and how it is protected"],
  ["retention", "How long we keep it"],
  ["delete-account", "Deleting your account"],
  ["rights", "Your rights"],
  ["children", "Children"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact"],
];

export default function PrivacyPage() {
  return (
    <div style={{ background: "var(--color-kiln)", minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--color-grout)" }}>
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" style={{ color: "var(--color-glaze-deep)" }}>
            <LogoMark size={21} />
            <span className="font-[family-name:var(--font-display)] italic text-[17px] tracking-tight">Tiles Stock</span>
          </Link>
          <Link href="/login" className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Log in</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-soft)" }}>
          Last updated {UPDATED}
        </p>
        <h1
          className="mt-3 font-[family-name:var(--font-display)] text-[36px] sm:text-[44px] leading-[1.1] tracking-tight"
          style={{ color: "var(--color-ink)" }}
        >
          Privacy Policy
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          Tiles Stock (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is stock management software for tile dealers, available as
          a website and as an Android and iOS app. This policy explains what information we collect when you or your
          staff use Tiles Stock, why we collect it, who processes it for us, and the choices you have. It applies to
          the website, the mobile apps and the Tiles Stock API they talk to.
        </p>
        <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          The short version: we collect what you type into the app to run your stock records, and nothing more. We do
          not show ads, do not use analytics or tracking tools, and do not sell your data.
        </p>

        <nav
          aria-label="Contents"
          className="mt-10 rounded-lg p-5"
          style={{ background: "var(--color-kiln-dim)", border: "1px solid var(--color-grout)" }}
        >
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-soft)" }}>
            Contents
          </p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2 list-decimal pl-5">
            {contents.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:underline underline-offset-2" style={{ color: "var(--color-glaze)" }}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="collect" title="1. Information we collect">
          <p><B>Account information.</B>{" "}When a dealer signs up we collect the shop name, an email address and a
            password. Passwords are stored only as a one-way hash; we cannot read them. When an owner invites staff,
            we store the staff member&rsquo;s email address and role (owner or staff) and create an invite link for
            the owner to share with them.</p>
          <p><B>Business records you enter.</B>{" "}Everything you add to run your shop:</p>
          <List>
            <li>Products and designs: name, brand, size, finish, category, prices, godown location and shade/lot numbers.</li>
            <li>Stock movements (stock in, stock out, adjustments), including which user recorded each one and when.</li>
            <li>Delivery challans and orders, and the reports and PDFs generated from them.</li>
            <li>Customers: name, phone number, address, credit limit and notes.</li>
            <li>Suppliers: business name, contact person, phone number, email, address and notes.</li>
            <li>Branch names and addresses.</li>
          </List>
          <p><B>Product photos.</B>{" "}Photos you take or choose for a product are uploaded to our storage so they can be
            shown in the app and on your price list.</p>
          <p><B>Login sessions.</B>{" "}When you sign in we create a session with its start and expiry time so you stay
            logged in and can be signed out. We store a hash of the session token, not the token itself.</p>
          <p><B>Subscription status.</B>{" "}Your plan (trial, monthly or yearly), trial end date and renewal date. If paid
            plans are enabled, payments are handled by our payment provider; we never receive or store your card or UPI
            details.</p>
          <p><B>What we do not collect.</B>{" "}We do not collect your location, contacts, call logs, SMS, microphone
            audio, advertising ID, or browsing activity, and we do not use third-party analytics, advertising or
            crash-tracking SDKs.</p>
        </Section>

        <Section id="device" title="2. App permissions">
          <List>
            <li><B>Camera</B>{" "}&mdash; to scan the QR codes on tile box labels and to take product photos. Scanning happens
              on your phone; camera frames are not recorded or uploaded. Only a photo you choose to save to a product is
              uploaded.</li>
            <li><B>Photos</B>{" "}&mdash; to pick an existing image as a product photo. We only access the image you select.</li>
            <li><B>Internet and local network</B>{" "}&mdash; to sync with your Tiles Stock account and to send labels to a
              Brother label printer on your Wi-Fi. The printer&rsquo;s IP address and your label layout settings are
              saved only on your phone.</li>
          </List>
          <p>Your login token is kept in the phone&rsquo;s secure storage (Android Keystore / iOS Keychain). You can
            withdraw camera or photo access at any time in your phone&rsquo;s settings; the rest of the app keeps
            working.</p>
        </Section>

        <Section id="use" title="3. How we use it">
          <List>
            <li>To provide the service: keep your stock ledger, generate challans, reports, reorder suggestions and price lists.</li>
            <li>To sign you in, keep your account secure, and separate each dealer&rsquo;s data from every other dealer&rsquo;s.</li>
            <li>To let owners see which staff member made each change.</li>
            <li>To manage your trial and subscription.</li>
            <li>To reply when you contact us and to tell account owners about important changes to the service.</li>
            <li>To comply with the law and to investigate misuse.</li>
          </List>
          <p>We do not use your data for advertising, and we do not sell or rent it to anyone.</p>
        </Section>

        <Section id="your-customers" title="4. Your customers' and suppliers' details">
          <p>The customer and supplier details you enter belong to your business. We store and process them only on
            your behalf and only to provide Tiles Stock to you. As the dealer you are responsible for having a proper
            reason to record them and for answering their requests; we will help you correct or delete those records
            when asked.</p>
        </Section>

        <Section id="sharing" title="5. Who we share it with">
          <p>We share information only with service providers that host and run Tiles Stock, under their own security
            and confidentiality terms, and only as needed to operate the service:</p>
          <List>
            <li><B>Supabase</B>{" "}&mdash; database and product photo storage.</li>
            <li><B>Render</B>{" "}&mdash; hosting for the Tiles Stock API.</li>
            <li><B>Vercel</B>{" "}&mdash; hosting for the Tiles Stock website.</li>
            <li><B>Payment provider</B>{" "}(such as Razorpay) &mdash; only if you buy a paid plan, to process that payment.</li>
          </List>
          <p><B>Inside your business.</B>{" "}Owners and staff of the same shop can see that shop&rsquo;s records.</p>
          <p><B>Public price list.</B>{" "}If you share your price list link, anyone with the link can see your shop name
            and the product names, details, prices and photos on it. Product photos are served from a public address so they can be
            displayed there. Do not put personal information in product photos or product fields.</p>
          <p><B>Legal reasons.</B>{" "}We may disclose information if required by law, court order or a government
            authority, or to protect the rights and safety of our users or the public.</p>
        </Section>

        <Section id="storage" title="6. Where it is stored and how it is protected">
          <p>Our database and photo storage are hosted on Supabase servers in South Korea, and our API and website run
            on Render and Vercel infrastructure, which may be outside India. By using Tiles Stock you understand that
            your information is transferred to and stored in those locations.</p>
          <p>All traffic between the app and our servers is encrypted with HTTPS. Passwords and session tokens are
            stored as hashes, each dealer&rsquo;s records are isolated by account, and access to production systems is
            limited. No system is perfectly secure, but we work to protect your information and will notify affected
            users and authorities of a breach as the law requires.</p>
        </Section>

        <Section id="retention" title="7. How long we keep it">
          <p>We keep your account and business records for as long as your account is open, so that your stock history
            stays complete. Expired login sessions are no longer valid and can be cleared at any time. When an account is
            deleted, its records are removed from our live database within 30 days; copies in routine backups are
            overwritten shortly after. We may keep information longer only where the law requires it.</p>
        </Section>

        <Section id="delete-account" title="8. Deleting your account">
          <p>You can ask us to delete your Tiles Stock account and its data at any time.</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Email <Mail subject="Delete my Tiles Stock account" /> from the email address you use to sign in, with the
              subject &ldquo;Delete my Tiles Stock account&rdquo; and your shop name.</li>
            <li>We may reply to confirm the request comes from the account owner.</li>
            <li>Within 30 days we delete the shop&rsquo;s account, all its users and sessions, products, stock
              movements, challans, customers, suppliers, branches, subscription record and product photos.</li>
          </ol>
          <p><B>Only the owner can delete a whole shop account</B>, because it removes data for every user in that
            shop. A staff member who wants their own access and email address removed can ask the shop owner or email
            us. Records they created stay with the shop, without their login.</p>
          <p>If you only want some data removed, you can delete products, suppliers and branches inside the app, edit a
            customer&rsquo;s details, or email us and we will delete specific records for you.</p>
        </Section>

        <Section id="rights" title="9. Your rights">
          <p>Subject to applicable law, including India&rsquo;s Digital Personal Data Protection Act, 2023, you can ask
            us to:</p>
          <List>
            <li>tell you what personal information we hold about you and give you a copy;</li>
            <li>correct or update information that is wrong or incomplete;</li>
            <li>delete your information (see section 8);</li>
            <li>stop processing that is based on your consent &mdash; note that we cannot run your account without the
              information described in section 1;</li>
            <li>nominate another person to exercise these rights if you die or become unable to; and</li>
            <li>hear and resolve a complaint about how we handle your information.</li>
          </List>
          <p>Email <Mail subject="Privacy request" /> to make any of these requests. We will reply within 30 days. If
            you are not satisfied with our response, you may complain to the Data Protection Board of India.</p>
        </Section>

        <Section id="children" title="10. Children">
          <p>Tiles Stock is a business tool meant for people aged 18 and over. We do not knowingly collect information
            from children. If you believe a child has given us personal information, contact us and we will delete it.</p>
        </Section>

        <Section id="changes" title="11. Changes to this policy">
          <p>We may update this policy as Tiles Stock changes. We will change the &ldquo;last updated&rdquo; date above
            and, for significant changes, tell account owners by email or in the app before the change takes effect.</p>
        </Section>

        <Section id="contact" title="12. Contact">
          <p>For privacy questions, requests or complaints (including as our grievance contact), email <Mail subject="Privacy question" />.</p>
        </Section>
      </main>

      <footer style={{ borderTop: "1px solid var(--color-grout)", background: "var(--color-kiln-dim)" }}>
        <div className="max-w-3xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          <Link href="/" className="hover:text-[var(--color-ink)] transition-colors">&larr; Back to Tiles Stock</Link>
          <span>&copy; 2026 Tiles Stock</span>
        </div>
      </footer>
    </div>
  );
}
