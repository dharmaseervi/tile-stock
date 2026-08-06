"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Where the visitor was headed before they hit the login wall — a QR scan
  // lands on a product page, so sending them to the dashboard loses the scan.
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login({ email, password });
      setToken(token);
      // Only follow same-site paths, never an absolute URL from the query
      // string — that would be an open redirect.
      const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.push(dest);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-kiln)" }}>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl grout-border w-full max-w-sm space-y-4"
      >
        <div>
          <a href="/" className="font-[family-name:var(--font-display)] text-2xl italic block" style={{ color: "var(--color-glaze-deep)" }}>
            Tiles Stock
          </a>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>
            {next ? "Log in to see this tile" : "Log in to your dealership"}
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm grout-border outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as any]: "var(--color-glaze)" }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm grout-border outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as any]: "var(--color-glaze)" }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--color-glaze)" }}
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          No account?{" "}
          <a href="/signup" style={{ color: "var(--color-glaze-deep)" }} className="underline underline-offset-2">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
