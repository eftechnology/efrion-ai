"use client";

import { analytics } from "@/lib/analytics";

export default function Contact() {
  return (
    <section id="contact" className="relative px-6 py-28">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/8 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-400">
          Contact
        </span>
        <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
          Let&apos;s talk.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-slate-400">
          Have a question, partnership idea, or want to see EFRION running on your ERP?
          Drop us a message — we reply within 24 hours.
        </p>

        <a
          href="mailto:hello@efrion.com"
          onClick={() => analytics.clickContactEmail()}
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-100"
        >
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          hello@efrion.com
        </a>

        <p className="mt-6 text-sm text-slate-600">
          Or find us on{" "}
          <a
            href="https://github.com/eftechnology/efrion-ai"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => analytics.clickGitHub("contact")}
            className="text-slate-400 underline underline-offset-4 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </p>
      </div>
    </section>
  );
}
