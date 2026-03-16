"use client";

import { useState, FormEvent } from "react";

const erpSystems = [
  "SAP",
  "Oracle ERP",
  "Microsoft Dynamics 365",
  "NetSuite",
  "Odoo",
  "Epicor",
  "Infor",
  "Custom / In-house ERP",
  "Other",
];

export default function RequestAccessPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    erpSystem: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05050a] px-4 py-20">
      {/* Background glow */}
      <div className="pointer-events-none fixed left-1/2 top-1/3 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/6 blur-[140px]" />

      <div className="relative mx-auto max-w-lg">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-2">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30">
              EF
            </div>
            <span className="text-lg font-semibold text-white">EFRION</span>
          </a>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-3xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Request received!</h2>
              <p className="mt-2 text-sm text-slate-400">
                We&apos;ve received your request. The EFRION team will review it and
                send your access credentials to{" "}
                <span className="text-white font-medium">{form.email}</span> within
                1–2 business days.
              </p>
            </div>
            <a
              href="/"
              className="rounded-xl border border-white/[0.08] px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              ← Back to homepage
            </a>
          </div>
        ) : (
          /* ── Form ── */
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/8 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span className="text-xs font-semibold text-blue-400">Exclusive access</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-white">Request Demo Access</h1>
            <p className="mt-2 mb-7 text-sm text-slate-500">
              EFRION is currently in private demo. Tell us about yourself and we&apos;ll
              get back to you with credentials.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name *" htmlFor="name">
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Jane Smith"
                    className={inputCls}
                  />
                </Field>
                <Field label="Work Email *" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="jane@company.com"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Company + Role */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company" htmlFor="company">
                  <input
                    id="company"
                    type="text"
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Acme Corp"
                    className={inputCls}
                  />
                </Field>
                <Field label="Your Role" htmlFor="role">
                  <input
                    id="role"
                    type="text"
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                    placeholder="ERP Administrator"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* ERP System */}
              <Field label="ERP System you use" htmlFor="erp">
                <select
                  id="erp"
                  value={form.erpSystem}
                  onChange={(e) => update("erpSystem", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select your ERP...</option>
                  {erpSystems.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              {/* Message */}
              <Field label="Why are you interested?" htmlFor="message">
                <textarea
                  id="message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Tell us how you'd use EFRION and what ERP workflows you'd automate…"
                  className={`${inputCls} resize-none`}
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-3.75a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  "Request Access →"
                )}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-700">
          Already have credentials?{" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            Sign in →
          </a>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
