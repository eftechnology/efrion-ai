"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

// ── Scripted demo sequence ──────────────────────────────────────────────────

type DemoStep = {
  id: number;
  label: string;
  detail: string;
  hudStatus: "idle" | "processing" | "listening" | "speaking";
  hudText: string;
  transcript?: string;
  erpState?: Partial<ErpState>;
  duration: number;
};

type ErpState = {
  activeTab: string;
  vendor: string;
  amount: string;
  notes: string;
  submitted: boolean;
  highlightField: string | null;
  cursorX: number;
  cursorY: number;
  cursorVisible: boolean;
};

const INITIAL_ERP: ErpState = {
  activeTab: "Dashboard",
  vendor: "",
  amount: "",
  notes: "",
  submitted: false,
  highlightField: null,
  cursorX: 50,
  cursorY: 50,
  cursorVisible: false,
};

const DEMO_STEPS: DemoStep[] = [
  {
    id: 0,
    label: "User speaks",
    detail: "\"Create an invoice for Amazon Web Services for $1,500\"",
    hudStatus: "listening",
    hudText: "Listening…",
    transcript: "Create an invoice for Amazon Web Services for $1,500",
    erpState: { cursorVisible: false },
    duration: 2200,
  },
  {
    id: 1,
    label: "AI plans",
    detail: "Gemini 2.5 processes voice + screen context",
    hudStatus: "processing",
    hudText: "Thinking…",
    transcript: "I'll create that invoice for you. Let me navigate to the Invoices tab first.",
    erpState: { cursorVisible: false },
    duration: 1800,
  },
  {
    id: 2,
    label: "Navigate to Invoices",
    detail: "Ghost cursor flies to Invoices tab",
    hudStatus: "idle",
    hudText: "AI Online",
    erpState: { activeTab: "Invoices", cursorX: 62, cursorY: 10, cursorVisible: true },
    duration: 1200,
  },
  {
    id: 3,
    label: "Select vendor",
    detail: "Selecting Amazon Web Services from dropdown",
    hudStatus: "idle",
    hudText: "AI Online",
    erpState: { vendor: "Amazon Web Services", highlightField: "vendor", cursorX: 30, cursorY: 38, cursorVisible: true },
    duration: 1400,
  },
  {
    id: 4,
    label: "Type amount",
    detail: "Typing $1,500 into the amount field",
    hudStatus: "idle",
    hudText: "AI Online",
    erpState: { amount: "1,500.00", highlightField: "amount", cursorX: 68, cursorY: 38, cursorVisible: true },
    duration: 1200,
  },
  {
    id: 5,
    label: "Submit invoice",
    detail: "Clicking the Submit Invoice button",
    hudStatus: "idle",
    hudText: "AI Online",
    erpState: { highlightField: "submit", cursorX: 30, cursorY: 72, cursorVisible: true },
    duration: 1200,
  },
  {
    id: 6,
    label: "Done!",
    detail: "Invoice submitted successfully",
    hudStatus: "speaking",
    hudText: "AI Speaking…",
    transcript: "Done! Invoice for Amazon Web Services for $1,500 has been submitted.",
    erpState: { submitted: true, cursorVisible: false, highlightField: null },
    duration: 3000,
  },
];

// ── Demo ERP Mockup ──────────────────────────────────────────────────────────

function DemoERP({ erp }: { erp: ErpState }) {
  const tabs = ["Dashboard", "Invoices", "Reports", "Settings"];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl shadow-black/60 select-none">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#0a0a10] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-slate-500">EFRION ERP</span>
      </div>

      {/* Nav */}
      <div className="flex gap-1.5 border-b border-white/[0.05] bg-[#0c0c12] px-4 py-2">
        {tabs.map((tab) => (
          <div
            key={tab}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-300 ${
              erp.activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-slate-600"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3 min-h-[220px]">
        {erp.activeTab === "Invoices" && !erp.submitted ? (
          <>
            <p className="text-xs font-semibold text-slate-300">Create New Invoice</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[10px] text-slate-500">Vendor</div>
                <div
                  className={`rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
                    erp.highlightField === "vendor"
                      ? "border-yellow-400/70 bg-yellow-400/5 text-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                      : "border-white/[0.07] bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {erp.vendor || (
                    <span className="text-slate-600">Select Vendor…</span>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] text-slate-500">Amount ($)</div>
                <div
                  className={`rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
                    erp.highlightField === "amount"
                      ? "border-yellow-400/70 bg-yellow-400/5 text-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                      : "border-white/[0.07] bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {erp.amount || <span className="text-slate-600">0.00</span>}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[10px] text-slate-500">Notes</div>
              <div className="h-10 rounded-lg border border-white/[0.07] bg-white/[0.04]" />
            </div>

            <div
              className={`inline-block rounded-lg border px-4 py-2 text-xs font-bold text-white transition-all duration-300 ${
                erp.highlightField === "submit"
                  ? "border-yellow-400/70 bg-green-600 shadow-[0_0_16px_rgba(250,204,21,0.3)]"
                  : "border-transparent bg-green-700/60"
              }`}
            >
              Submit Invoice
            </div>
          </>
        ) : erp.submitted ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-xl">
              ✓
            </div>
            <p className="text-sm font-semibold text-white">Invoice Submitted!</p>
            <p className="text-xs text-slate-500">
              #INV-994 · Amazon Web Services · $1,500.00
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-slate-600">Navigate to Invoices tab…</p>
          </div>
        )}
      </div>

      {/* Ghost cursor */}
      {erp.cursorVisible && (
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] transition-all duration-700 ease-out"
          style={{ left: `${erp.cursorX}%`, top: `${erp.cursorY}%` }}
        >
          <div className="absolute inset-0 rounded-full bg-rose-400/50 animate-pulse-ring" />
        </div>
      )}

      {/* HUD */}
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-full border border-white/10 bg-[#1a1a24] px-4 py-2 shadow-lg">
        <HudDot status="idle" />
        <span className="text-xs font-semibold text-white">AI Online</span>
        <div className="ml-auto h-4 w-px bg-white/10" />
        <span className="max-w-[160px] truncate text-[10px] text-slate-400">
          {erp.submitted
            ? "🤖 Invoice submitted successfully"
            : erp.activeTab === "Invoices"
            ? "🤖 Filling invoice form…"
            : "🤖 Navigating…"}
        </span>
      </div>
    </div>
  );
}

function HudDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-green-400",
    processing: "bg-yellow-400",
    listening: "bg-red-400",
    speaking: "bg-blue-400",
  };
  return (
    <div className="relative flex h-2.5 w-2.5 shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse-ring ${colors[status] ?? "bg-green-400"}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status] ?? "bg-green-400"}`} />
    </div>
  );
}

// ── Main demo player ─────────────────────────────────────────────────────────

function DemoPlayer() {
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [erp, setErp] = useState<ErpState>(INITIAL_ERP);
  const [hudStatus, setHudStatus] = useState<DemoStep["hudStatus"]>("idle");
  const [hudText, setHudText] = useState("AI Online");
  const [transcript, setTranscript] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runStep(index: number) {
    if (index >= DEMO_STEPS.length) {
      setRunning(false);
      return;
    }
    const step = DEMO_STEPS[index];
    setStepIndex(index);
    setHudStatus(step.hudStatus);
    setHudText(step.hudText);
    if (step.transcript) setTranscript(step.transcript);
    if (step.erpState) setErp((prev) => ({ ...prev, ...step.erpState }));

    timerRef.current = setTimeout(() => runStep(index + 1), step.duration);
  }

  function startDemo() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setErp(INITIAL_ERP);
    setTranscript("");
    setRunning(true);
    runStep(0);
  }

  function resetDemo() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
    setStepIndex(-1);
    setErp(INITIAL_ERP);
    setHudStatus("idle");
    setHudText("AI Online");
    setTranscript("");
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const currentStep = stepIndex >= 0 ? DEMO_STEPS[stepIndex] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {/* ERP mockup */}
      <div className="relative">
        <DemoERP erp={erp} />
        {/* HUD status overlay */}
        {running && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a24]/90 px-4 py-1.5 text-xs backdrop-blur-md whitespace-nowrap">
            <HudDot status={hudStatus} />
            <span className="font-semibold text-white">{hudText}</span>
          </div>
        )}
      </div>

      {/* Control panel */}
      <div className="flex flex-col gap-4">
        {/* Voice command bubble */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Voice Command
          </p>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm">
              👤
            </div>
            <div className="rounded-2xl rounded-tl-none border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm italic text-slate-300">
              {transcript
                ? `"${transcript}"`
                : running
                ? "Listening…"
                : '"Create an invoice for Amazon Web Services for $1,500"'}
            </div>
          </div>
        </div>

        {/* Step progress */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Execution Steps
          </p>
          <div className="flex flex-col gap-2">
            {DEMO_STEPS.filter((s) => s.id > 1).map((step) => {
              const done = stepIndex > step.id;
              const active = stepIndex === step.id;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all ${
                    active
                      ? "border border-blue-500/30 bg-blue-500/8 text-white"
                      : done
                      ? "text-slate-500"
                      : "text-slate-700"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done
                        ? "bg-green-500/20 text-green-400"
                        : active
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-white/5 text-slate-600"
                    }`}
                  >
                    {done ? "✓" : step.id - 1}
                  </span>
                  <span>{step.label}</span>
                  {active && (
                    <span className="ml-auto text-[10px] text-blue-400 animate-pulse">
                      running
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={startDemo}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {stepIndex >= 0 ? "Replay Demo" : "Start Demo"}
            </button>
          ) : (
            <button
              onClick={resetDemo}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop
            </button>
          )}
        </div>

        {currentStep && (
          <p className="text-center text-xs text-slate-600 italic">{currentStep.detail}</p>
        )}
      </div>
    </div>
  );
}

// ── Setup instructions ───────────────────────────────────────────────────────

const steps = [
  {
    n: "01",
    title: "Set up the backend",
    code: "cd backend\nexport GEMINI_API_KEY=your_key\nuv run main.py",
  },
  {
    n: "02",
    title: "Load the extension",
    code: "chrome://extensions → Developer mode\n→ Load unpacked → select /extension",
  },
  {
    n: "03",
    title: "Open the test ERP",
    code: "Open test_erp.html in Chrome\nClick the EFRION extension icon\nStart speaking!",
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

function ExtensionBanner() {
  const [extensionActive, setExtensionActive] = useState<boolean | null>(null);

  useEffect(() => {
    const detected =
      document.documentElement.getAttribute('data-efrion-extension') === 'active';
    setExtensionActive(detected);
  }, []);

  if (extensionActive === null || extensionActive) return null;

  return (
    <div className="border-b border-yellow-500/20 bg-yellow-500/[0.06] px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">🧩</span>
          <div>
            <p className="text-sm font-semibold text-yellow-300">
              Extension not detected
            </p>
            <p className="text-xs text-yellow-400/70">
              Install the EFRION Chrome extension to run the live autopilot on any ERP page.
            </p>
          </div>
        </div>
        <a
          href="/downloads/efrion-ai-extension.crx"
          download
          className="shrink-0 flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-yellow-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download Extension
        </a>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const router = useRouter();

  async function logout() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    await fetch(`${apiUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#05050a]/80 backdrop-blur-xl">

        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-white">EFRION</span>
            <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
              Private Demo
            </span>
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 py-1.5 text-xs text-slate-500 transition hover:border-white/10 hover:text-slate-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </header>
      <ExtensionBanner />

      <main className="mx-auto max-w-5xl px-6 py-16 space-y-20">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/8 px-4 py-1.5 text-xs font-semibold text-yellow-400">
            🏆 Gemini Live Agent Challenge — Private Demo
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            EFRION AI Autopilot — Live Demo
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Watch the scripted simulation below, then follow the setup guide to
            run the real AI autopilot locally with your own Gemini API key.
          </p>
        </div>

        {/* Animated simulation */}
        <section>
          <h2 className="mb-6 text-lg font-bold text-white">
            Interactive Simulation
          </h2>
          <DemoPlayer />
        </section>

        {/* Setup guide */}
        <section>
          <h2 className="mb-2 text-lg font-bold text-white">Run It Locally</h2>
          <p className="mb-6 text-sm text-slate-500">
            The real demo requires the Chrome extension and a local backend. Follow
            these three steps:
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <div className="mb-3 font-mono text-3xl font-black text-white/[0.06]">
                  {s.n}
                </div>
                <p className="mb-3 text-sm font-semibold text-white">{s.title}</p>
                <pre className="overflow-x-auto rounded-lg border border-white/[0.05] bg-black/30 px-3 py-3 font-mono text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                  {s.code}
                </pre>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Need the source code?{" "}
            <a href="https://github.com/eftechnology/efrion-ai" className="text-blue-400 hover:text-blue-300">
              View on GitHub →
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
