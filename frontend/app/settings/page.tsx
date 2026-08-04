"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus, Trash2, Users, Store, Building2, IndianRupee, ExternalLink } from "lucide-react";
import { api, isLoggedIn, getOrgId } from "@/lib/api";
import Nav from "@/components/Nav";

const inputClass = "border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 w-full";
const inputStyle = { borderColor: "var(--color-grout)", ["--tw-ring-color" as any]: "var(--color-glaze)" };

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg grout-border overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--color-grout)" }}>
        <Icon size={16} style={{ color: "var(--color-glaze-deep)" }} />
        <h2 className="font-medium text-sm" style={{ color: "var(--color-ink)" }}>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const orgId = getOrgId();

  const [staff, setStaff] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [branchForm, setBranchForm] = useState({ name: "", address: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_name: "", phone: "", email: "" });

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/price-list/${orgId}` : "";

  function loadAll() {
    api.listStaff().then((s) => setStaff(s ?? []));
    api.getSubscription().then(setSubscription).catch(() => {});
    api.listBranches().then((b) => setBranches(b ?? []));
    api.listSuppliers().then((s) => setSuppliers(s ?? []));
  }

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadAll();
  }, [router]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    try {
      const { invite_link } = await api.createInvite({ email: inviteEmail });
      setInviteLink(invite_link);
      setInviteEmail("");
      loadAll();
    } catch (err: any) {
      setInviteError(err.message);
    }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPublicUrl() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    await api.createBranch(branchForm);
    setBranchForm({ name: "", address: "" });
    loadAll();
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    await api.createSupplier(supplierForm);
    setSupplierForm({ name: "", contact_name: "", phone: "", email: "" });
    loadAll();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-kiln)" }}>
      <Nav />
      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-10">
        <h1 className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--color-ink)" }}>Settings</h1>

        {/* Subscription */}
        <Section title="Subscription" icon={IndianRupee}>
          {subscription ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize" style={{ color: "var(--color-ink)" }}>
                    {subscription.subscription.plan} plan
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                    {subscription.subscription.status === "active" ? "Active" : "Expired"}
                    {subscription.subscription.trial_ends_at
                      ? ` · Trial ends ${new Date(subscription.subscription.trial_ends_at).toLocaleDateString("en-IN")}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--color-glaze-tint)", color: "var(--color-glaze-deep)" }}>
                  {subscription.subscription.plan === "trial" ? "30-day free trial" : "Paid"}
                </span>
              </div>
              {subscription.subscription.plan === "trial" && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>Upgrade</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg p-3 grout-border text-center">
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>₹499/month</p>
                      <button className="mt-2 w-full text-white text-xs py-1.5 rounded-md" style={{ background: "var(--color-glaze)" }}>
                        Subscribe monthly
                      </button>
                    </div>
                    <div className="rounded-lg p-3 border-2 text-center" style={{ borderColor: "var(--color-glaze)" }}>
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>₹4,999/year</p>
                      <p className="text-xs" style={{ color: "var(--color-moss)" }}>Save ₹989</p>
                      <button className="mt-2 w-full text-white text-xs py-1.5 rounded-md" style={{ background: "var(--color-glaze)" }}>
                        Subscribe yearly
                      </button>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                    Razorpay integration — connect your key in backend .env to enable payments.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Loading subscription…</p>
          )}
        </Section>

        {/* Public price list */}
        <Section title="Public Price List" icon={ExternalLink}>
          <p className="text-xs mb-3" style={{ color: "var(--color-ink-soft)" }}>
            Share this link with customers and contractors — shows your tile catalogue with prices, no login required.
          </p>
          <div className="flex gap-2">
            <input readOnly value={publicUrl} className={`${inputClass} font-[family-name:var(--font-mono)] text-xs`} style={inputStyle} />
            <button onClick={copyPublicUrl} className="px-3 py-2 rounded-md grout-border shrink-0" style={{ color: "var(--color-glaze-deep)" }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md grout-border shrink-0" style={{ color: "var(--color-glaze-deep)" }}>
              <ExternalLink size={15} />
            </a>
          </div>
        </Section>

        {/* Staff */}
        <Section title="Staff" icon={Users}>
          <div className="space-y-3">
            {staff.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-ink)" }}>{u.email}</span>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "var(--color-kiln-dim)", color: "var(--color-ink-soft)" }}>
                  {u.role}
                </span>
              </div>
            ))}
            <form onSubmit={handleInvite} className="flex gap-2 pt-2">
              <input type="email" required placeholder="Staff email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={inputClass} style={inputStyle} />
              <button type="submit" className="px-3 py-2 text-white rounded-md text-sm shrink-0" style={{ background: "var(--color-glaze)" }}>
                <Plus size={15} />
              </button>
            </form>
            {inviteError && <p className="text-xs" style={{ color: "var(--color-oxide)" }}>{inviteError}</p>}
            {inviteLink && (
              <div className="flex gap-2 items-center">
                <input readOnly value={inviteLink} className="flex-1 border rounded px-2 py-1.5 text-xs font-[family-name:var(--font-mono)]" style={{ borderColor: "var(--color-grout)" }} />
                <button onClick={copyInviteLink} className="px-2 py-1.5 rounded grout-border" style={{ color: "var(--color-glaze-deep)" }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Branches / Godowns */}
        <Section title="Branches / Godowns" icon={Building2}>
          <div className="space-y-2 mb-3">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-ink)" }}>{b.name}</span>
                {b.address && <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>{b.address}</span>}
              </div>
            ))}
          </div>
          <form onSubmit={addBranch} className="space-y-2">
            <div className="flex gap-2">
              <input placeholder="Branch name" required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className={inputClass} style={inputStyle} />
              <button type="submit" className="px-3 py-2 text-white rounded-md text-sm shrink-0" style={{ background: "var(--color-glaze)" }}>
                <Plus size={15} />
              </button>
            </div>
            <input placeholder="Address (optional)" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} className={inputClass} style={inputStyle} />
          </form>
        </Section>

        {/* Suppliers */}
        <Section title="Suppliers" icon={Store}>
          <div className="space-y-2 mb-3">
            {suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <span style={{ color: "var(--color-ink)" }}>{s.name}</span>
                  {s.contact_name && <span className="text-xs ml-2" style={{ color: "var(--color-ink-soft)" }}>{s.contact_name}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--color-ink-soft)" }}>{s.product_count} products</span>
                  {s.phone && <a href={`tel:${s.phone}`} className="text-xs" style={{ color: "var(--color-glaze)" }}>{s.phone}</a>}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={addSupplier} className="grid grid-cols-2 gap-2">
            <input placeholder="Supplier name" required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Contact name" value={supplierForm.contact_name} onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })} className={inputClass} style={inputStyle} />
            <input placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className={inputClass} style={inputStyle} />
            <input type="email" placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className={inputClass} style={inputStyle} />
            <button type="submit" className="col-span-2 text-white rounded-md py-2 text-sm font-medium" style={{ background: "var(--color-glaze)" }}>
              Add Supplier
            </button>
          </form>
        </Section>
      </main>
    </div>
  );
}
