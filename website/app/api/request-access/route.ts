import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import AdminNotificationEmail from '@/emails/AdminNotificationEmail';
import AccessRequestConfirmEmail from '@/emails/AccessRequestConfirmEmail';
import { createPendingEntry } from '@/lib/access-tokens';

// ── Cloudflare Turnstile verification ────────────────────────────────────────
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // skip verification if not configured

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification failed:', err);
    return false;
  }
}

// ── Rate limiting (in-memory, per IP) ────────────────────────────────────────
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;          // max submissions
const RATE_WINDOW = 60 * 60 * 1000; // per 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── Input limits ──────────────────────────────────────────────────────────────
const LIMITS = {
  name:      { max: 100 },
  email:     { max: 254 },  // RFC 5321
  company:   { max: 100 },
  role:      { max: 100 },
  erpSystem: { max: 100 },
  message:   { max: 2000 },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: Record<string, unknown>): string | null {
  const { name, email, company, role, erpSystem, message } = body;

  if (!name || typeof name !== 'string' || !name.trim())
    return 'Name is required.';
  if (!email || typeof email !== 'string' || !email.trim())
    return 'Email is required.';
  if (!EMAIL_RE.test(String(email).trim()))
    return 'Invalid email address.';

  for (const [field, { max }] of Object.entries(LIMITS)) {
    const val = body[field];
    if (val && typeof val === 'string' && val.length > max)
      return `${field} must be ${max} characters or fewer.`;
  }

  // Reject unexpected types
  for (const key of ['name', 'email', 'company', 'role', 'erpSystem', 'message']) {
    if (body[key] !== undefined && typeof body[key] !== 'string')
      return `Invalid value for ${key}.`;
  }

  const allowed = new Set(['Oracle ERP', 'SAP', 'Microsoft Dynamics 365', 'NetSuite',
    'Odoo', 'Epicor', 'Infor', 'Custom / In-house ERP', 'Other', '']);
  if (erpSystem && !allowed.has(String(erpSystem)))
    return 'Invalid ERP system selection.';

  return null;
}

// ── Telegram notification ─────────────────────────────────────────────────────
async function sendTelegram(entry: {
  id: string; name: string; email: string; company: string;
  role: string; erpSystem: string; message: string; submittedAt: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const line = (label: string, value: string) =>
    value ? `<b>${label}:</b> ${value}` : '';

  const lines = [
    '🤖 <b>EFRION — New Demo Request</b>',
    '',
    line('👤 Name',    entry.name),
    line('📧 Email',   entry.email),
    line('🏢 Company', entry.company),
    line('💼 Role',    entry.role),
    line('⚙️ ERP',     entry.erpSystem),
    entry.message ? `💬 <b>Message:</b>\n${entry.message}` : '',
    '',
    `🕐 ${new Date(entry.submittedAt).toUTCString()}`,
  ].filter(Boolean).join('\n');

  // Build approve button URL if admin secret is configured
  const adminSecret = process.env.ADMIN_SECRET;
  const appUrl = process.env.APP_URL ?? 'https://ai.efrion.com';
  const approveUrl = adminSecret
    ? `${appUrl}/api/admin/approve?id=${entry.id}&secret=${adminSecret}`
    : null;

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: lines,
    parse_mode: 'HTML',
  };

  if (approveUrl) {
    payload.reply_markup = {
      inline_keyboard: [[
        { text: '✅ Approve Access', url: approveUrl },
      ]],
    };
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
  }
}

// ── SMTP transport ────────────────────────────────────────────────────────────
const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NOTIFY_EMAIL,
} = process.env;

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Parse + validate body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Verify Turnstile token
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';
  if (!turnstileToken) {
    return NextResponse.json({ error: 'Security check required.' }, { status: 400 });
  }
  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { name, email, company, role, erpSystem, message } = body as Record<string, string>;

  // ── Create pending token entry ────────────────────────────────────────────
  const entry = createPendingEntry({
    name:        name.trim(),
    email:       email.trim().toLowerCase(),
    company:     (company   ?? '').trim(),
    role:        (role      ?? '').trim(),
    erpSystem:   (erpSystem ?? '').trim(),
    message:     (message   ?? '').trim(),
    submittedAt: new Date().toISOString(),
  });

  // ── Also persist to legacy backup JSON ───────────────────────────────────
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, 'access-requests.json');
    const existing: unknown[] = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : [];
    existing.push({ ...entry });
    if (existing.length > 1000) existing.splice(0, existing.length - 1000);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  } catch (err) {
    console.error('Failed to persist access request backup:', err);
  }

  // ── Telegram notification ─────────────────────────────────────────────────
  sendTelegram(entry); // fire-and-forget, non-blocking

  // ── Send emails via SMTP ──────────────────────────────────────────────────
  const transport = createTransport();

  if (transport) {
    const from = SMTP_FROM ?? `EFRION AI <${SMTP_USER}>`;
    const notifyTo = NOTIFY_EMAIL ?? 'hello@efrion.com';

    try {
      const [adminHtml, confirmHtml] = await Promise.all([
        render(AdminNotificationEmail(entry)),
        render(AccessRequestConfirmEmail(entry)),
      ]);

      await Promise.all([
        transport.sendMail({
          from,
          to: notifyTo,
          replyTo: entry.email,
          subject: `Demo request: ${entry.name}${entry.company ? ` @ ${entry.company}` : ''}`,
          html: adminHtml,
        }),
        transport.sendMail({
          from,
          to: entry.email,
          subject: 'We received your EFRION demo request',
          html: confirmHtml,
        }),
      ]);
    } catch (err) {
      console.error('Failed to send email:', err);
      // Non-fatal — request already saved to JSON
    }
  } else {
    console.warn('SMTP not configured — skipping email. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
  }

  return NextResponse.json({ success: true });
}
