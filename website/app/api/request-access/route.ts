import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import AdminNotificationEmail from '@/emails/AdminNotificationEmail';
import AccessRequestConfirmEmail from '@/emails/AccessRequestConfirmEmail';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  NOTIFY_EMAIL,
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

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, company, role, erpSystem, message } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  const entry = {
    id: Date.now(),
    name,
    email,
    company: company || '',
    role: role || '',
    erpSystem: erpSystem || '',
    message: message || '',
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };

  // ── Persist to JSON file (backup) ────────────────────────────────────────
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, 'access-requests.json');
    const existing = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      : [];
    existing.push(entry);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  } catch (err) {
    console.error('Failed to persist access request:', err);
  }

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
          replyTo: email,
          subject: `Demo request: ${name}${company ? ` @ ${company}` : ''}`,
          html: adminHtml,
        }),
        transport.sendMail({
          from,
          to: email,
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
