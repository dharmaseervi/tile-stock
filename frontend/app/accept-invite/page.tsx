"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Suspense } from "react";

function AcceptForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token: jwt } = await api.acceptInvite({ token, password });
      setToken(jwt);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-kiln)" }}>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl grout-border w-full max-w-sm space-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl italic" style={{ color: "var(--color-glaze-deep)" }}>
            Join your team
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>Set a password to accept your invite.</p>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
        {!token && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>Invalid or missing invite token.</p>}
        <input
          type="password"
          placeholder="Create a password (min 8 characters)"
          value={password}
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 grout-border"
          style={{ ["--tw-ring-color" as any]: "var(--color-glaze)" }}
        />
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-glaze)" }}
        >
          {loading ? "Joining…" : "Accept invite"}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptForm />
    </Suspense>
  );
}
