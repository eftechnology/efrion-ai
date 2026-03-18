"use client";

import Logo from "./Logo";
import { analytics } from "@/lib/analytics";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Logo size={32} className="shadow-lg shadow-blue-600/30" />
              <span className="text-base font-semibold text-white">EFRION</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              A real-time AI copilot for ERP systems. Powered by Gemini 2.5 Multimodal
              Live API. Built for the UI Navigator track.
            </p>
            {/* Hackathon badge */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/8 px-3 py-1.5">
              <span className="text-sm">🏆</span>
              <span className="text-xs font-medium text-yellow-400">
                Gemini Live Agent Challenge
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product</p>
              {["Features", "How It Works", "Architecture", "Demo Scenarios"].map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-sm text-slate-500 transition-colors hover:text-white"
                >
                  {l}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Docs</p>
              {["Setup Guide", "Extension Install", "Backend Config", "Test Lab"].map((l) => (
                <span key={l} className="text-sm text-slate-600 cursor-not-allowed select-none">
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Contact + Tech */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Contact</p>
              <a
                href="mailto:hello@efrion.com"
                className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-white"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                hello@efrion.com
              </a>
              <a
                href="https://github.com/eftechnology/efrion-ai"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickGitHub("footer")}
                className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
              <a
                href="https://www.youtube.com/@efrion-ai"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickYouTube("footer")}
                className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-red-400"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Stack</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Gemini 2.5 Live",
                "Chrome MV3",
                "FastAPI",
                "WebSocket",
                "AudioWorklet",
                "Next.js 16",
                "TypeScript",
                "Tailwind v4",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-500"
                >
                  {tech}
                </span>
              ))}
            </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-8 text-xs text-slate-600 sm:flex-row">
          <span>© 2026 EFRION AI Autopilot. Built with ❤️ for the Gemini Live Agent Challenge.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Powered by Gemini 2.5 Multimodal Live API
          </span>
        </div>
      </div>
    </footer>
  );
}
