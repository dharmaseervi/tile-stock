"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
      router.push("/dashboard");
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
        className="bg-black p-8 rounded-xl grout-border w-full max-w-sm space-y-4"
      >
        <div>
          <h1 className="font-[family-name:var(--font-display)]  text-2xl italic" style={{ color: "var(--color-glaze-deep)" }}>
            Tiles Stock
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>Log in to your dealership</p>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--color-oxide)" }}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm grout-border outline-none focus:ring-2 text-white"
          style={{ ["--tw-ring-color" as any]: "var(--color-glaze)" }} 
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm grout-border outline-none focus:ring-2 text-white"
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
