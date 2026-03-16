"use client";

import { useState } from "react";

const scenarios = [
  {
    category: "Invoice Management",
    color: "blue",
    commands: [
      {
        voice: "Create an invoice for Amazon Web Services for $1,500 due next Friday.",
        steps: [
          "Navigate to Invoices tab",
          "Select 'Amazon Web Services' in vendor dropdown",
          "Type '1500' in the Amount field",
          "Set due date to next Friday",
          "Click Submit Invoice",
        ],
        result: "Invoice #INV-994 created and submitted ✓",
      },
      {
        voice: "Which invoices are overdue?",
        steps: [
          "Navigate to Invoice History",
          "Scan status column for 'Overdue' entries",
          "Read matching rows aloud",
        ],
        result: "INV-992 (Stripe, $80) — overdue since March 1st ✓",
      },
    ],
  },
  {
    category: "Multi-Step Workflow",
    color: "violet",
    commands: [
      {
        voice: "Create a purchase order from TechDirect for 2 laptops at $1,200 each, approved by Lisa.",
        steps: [
          "Navigate to Purchase Orders",
          "Select 'TechDirect Inc.' as supplier",
          "Add line item: '2 × Laptop @ $1,200'",
          "Select 'Lisa Park' as approver",
          "Accept procurement policy",
          "Submit Purchase Order",
        ],
        result: "PO #PO-044 submitted for Lisa Park's approval ✓",
      },
    ],
  },
  {
    category: "Scrolling & Navigation",
    color: "green",
    commands: [
      {
        voice: "Go to Inventory, scroll down to the Master Inventory list, and sync the database.",
        steps: [
          "Click 'Inventory' tab",
          "Scroll page down past archive section",
          "Click 'Sync Database' button",
          "Confirm success toast notification",
        ],
        result: "Inventory synced. 248 SKUs updated ✓",
      },
    ],
  },
  {
    category: "AI Undo & Safety",
    color: "orange",
    commands: [
      {
        voice: "Enable SMS alerts in settings and save.",
        steps: [
          "Navigate to Settings tab",
          "Toggle 'SMS alerts' switch ON",
          "Click 'Save Preferences'",
        ],
        result: "Notification preferences saved ✓",
      },
      {
        voice: "Undo that.",
        steps: [
          "Locate last action in history stack",
          "Toggle 'SMS alerts' switch back OFF",
          "Confirm undo complete",
        ],
        result: "SMS alerts setting restored to OFF ✓",
      },
    ],
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; stepDot: string }> = {
  blue:   { border: "border-blue-500/20",   bg: "bg-blue-500/5",   text: "text-blue-400",   stepDot: "bg-blue-400" },
  violet: { border: "border-violet-500/20", bg: "bg-violet-500/5", text: "text-violet-400", stepDot: "bg-violet-400" },
  green:  { border: "border-green-500/20",  bg: "bg-green-500/5",  text: "text-green-400",  stepDot: "bg-green-400" },
  orange: { border: "border-orange-500/20", bg: "bg-orange-500/5", text: "text-orange-400", stepDot: "bg-orange-400" },
};

export default function DemoScenarios() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeCommand, setActiveCommand] = useState(0);

  const category = scenarios[activeCategory];
  const command = category.commands[activeCommand];
  const c = colorMap[category.color];

  return (
    <section id="demo" className="relative px-6 py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-green-600/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-4 rounded-full border border-green-500/20 bg-green-500/8 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-green-400">
            Live Demo
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            See it in action.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            These are real commands you can speak to EFRION. Watch it decompose
            intent into precise UI actions.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Category sidebar */}
          <div className="flex flex-row gap-2 lg:flex-col">
            {scenarios.map((s, i) => {
              const col = colorMap[s.color];
              return (
                <button
                  key={s.category}
                  onClick={() => { setActiveCategory(i); setActiveCommand(0); }}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all lg:flex-none ${
                    i === activeCategory
                      ? `${col.border} ${col.bg} ${col.text}`
                      : "border-white/[0.06] text-slate-500 hover:border-white/10 hover:text-slate-300"
                  }`}
                >
                  {s.category}
                </button>
              );
            })}
          </div>

          {/* Command viewer */}
          <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
            {/* Command tabs */}
            {category.commands.length > 1 && (
              <div className="flex gap-2 border-b border-white/[0.06] px-5 pt-4">
                {category.commands.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCommand(i)}
                    className={`pb-3 text-xs font-semibold transition-all ${
                      i === activeCommand
                        ? `${c.text} border-b-2 ${c.border}`
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Command {i + 1}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Voice command bubble */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-base">
                  👤
                </div>
                <div className="rounded-2xl rounded-tl-none border border-white/[0.06] bg-white/[0.04] px-4 py-3">
                  <p className="text-sm italic text-white">
                    &ldquo;{command.voice}&rdquo;
                  </p>
                </div>
              </div>

              {/* AI Plan steps */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-base">
                  🤖
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-none border border-white/[0.06] bg-white/[0.02] px-4 py-4 space-y-3">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>
                    Executing Plan ({command.steps.length} steps)
                  </p>
                  <ol className="space-y-2">
                    {command.steps.map((step, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.stepDot} text-[10px] font-bold text-black`}>
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  {/* Result */}
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/8 px-4 py-2.5">
                    <svg className="h-4 w-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-green-400 font-medium">{command.result}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
