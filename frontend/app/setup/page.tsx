"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, clearToken, isLoggedIn, type OrgDetails, type OrgProfile } from "@/lib/api";
import LogoMark from "@/components/LogoMark";

const EMPTY: OrgDetails = {
  name: "", legal_name: "", gstin: "", phone: "", email: "",
  address: "", city: "", state: "", pincode: "",
};

const inputClass = "w-full rounded-md px-3 py-2 text-sm grout-border outline-none focus:ring-2";
const ring = { ["--tw-ring-color" as any]: "var(--color-glaze)" };

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink-soft)" }}>
      {children}
      {optional && <span className="font-normal"> (optional)</span>}
    </span>
  );
}

/** Shop details. Straight after signup it's the onboarding step; later it's
 *  reached from Settings to edit the same fields. */
export default function SetupPage() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [form, setForm] = useState<OrgDetails>(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    api.getOrg()
      .then((o) => {
        setOrg(o);
        setForm(Object.fromEntries(
          Object.keys(EMPTY).map((k) => [k, (o as any)[k] ?? ""]),
        ) as OrgDetails);
      })
      .catch((e) => setError(e.message));
  }, []);

  const onboarding = !!org && !org.setup_complete;
  const set = (k: keyof OrgDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: k === "gstin" ? e.target.value.toUpperCase() : e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.updateOrg(form);
      router.push(onboarding ? "/dashboard" : "/settings");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "var(--color-kiln)" }}>
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl grout-border w-full max-w-lg mx-auto space-y-4">
        <div>
          <span className="flex items-center gap-2" style={{ color: "var(--color-glaze-deep)" }}>
            <LogoMark size={18} />
            <span className="font-[family-name:var(--font-display)] italic text-lg">Tiles Stock</span>
          </span>
          <h1 className="mt-4 text-xl font-semibold" style={{ color: "var(--color-ink)" }}>
            {onboarding ? "Set up your shop" : "Shop details"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>
            These appear in the app and on your challans and reports.
            {onboarding && " You can change them later in Settings."}
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}

        {!org && !error ? (
          <p className="text-sm py-6" style={{ color: "var(--color-ink-soft)" }}>Loading…</p>
        ) : (
          <>
            <label className="block">
              <Label>Shop name</Label>
              <input value={form.name} onChange={set("name")} required placeholder="Balaji Tiles & Sanitary"
                className={inputClass} style={ring} />
            </label>
            <label className="block">
              <Label optional>Registered company name</Label>
              <input value={form.legal_name} onChange={set("legal_name")} placeholder="Balaji Ceramics Pvt Ltd"
                className={inputClass} style={ring} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <Label optional>GSTIN</Label>
                <input value={form.gstin} onChange={set("gstin")} placeholder="29ABCDE1234F1Z5" maxLength={15}
                  className={inputClass} style={ring} />
              </label>
              <label className="block">
                <Label>Phone</Label>
                <input value={form.phone} onChange={set("phone")} required type="tel" placeholder="98765 43210"
                  className={inputClass} style={ring} />
              </label>
            </div>
            <label className="block">
              <Label optional>Business email</Label>
              <input value={form.email} onChange={set("email")} type="email" placeholder="accounts@yourshop.com"
                className={inputClass} style={ring} />
            </label>
            <label className="block">
              <Label>Address</Label>
              <textarea value={form.address} onChange={set("address")} required rows={2} placeholder="Shop no., street, area"
                className={inputClass} style={ring} />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <Label>City</Label>
                <input value={form.city} onChange={set("city")} required placeholder="Bengaluru"
                  className={inputClass} style={ring} />
              </label>
              <label className="block">
                <Label>State</Label>
                <input value={form.state} onChange={set("state")} required placeholder="Karnataka"
                  className={inputClass} style={ring} />
              </label>
              <label className="block">
                <Label>PIN code</Label>
                <input value={form.pincode} onChange={set("pincode")} required inputMode="numeric" maxLength={6}
                  placeholder="560001" className={inputClass} style={ring} />
              </label>
            </div>

            <button type="submit" disabled={saving}
              className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ background: "var(--color-glaze)" }}>
              {saving ? "Saving…" : onboarding ? "Save and continue" : "Save"}
            </button>
          </>
        )}

        <p className="text-sm text-center" style={{ color: "var(--color-ink-soft)" }}>
          {onboarding ? (
            <button type="button" onClick={logout} className="underline underline-offset-2">Not your shop? Log out</button>
          ) : (
            <Link href="/settings" className="underline underline-offset-2">Back to settings</Link>
          )}
        </p>
      </form>
    </div>
  );
}
