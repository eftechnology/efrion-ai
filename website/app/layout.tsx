import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EFRION AI Autopilot — Voice-Powered ERP Navigation",
  description:
    "EFRION is a real-time AI copilot for ERP systems. Just speak — Gemini 2.5 Live sees your screen, understands your intent, and navigates for you.",
  openGraph: {
    title: "EFRION AI Autopilot",
    description:
      "Voice-powered AI that navigates any ERP interface. Built with Gemini 2.5 Multimodal Live API.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
