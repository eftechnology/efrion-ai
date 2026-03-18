import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

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

    const adminHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#3b82f6">New Demo Access Request</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;width:130px">Name</td><td style="padding:8px 0;color:#111"><strong>${name}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0;color:#111">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Company</td><td style="padding:8px 0;color:#111">${company || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Role</td><td style="padding:8px 0;color:#111">${role || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">ERP System</td><td style="padding:8px 0;color:#111">${erpSystem || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:8px 0;color:#111">${message || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Submitted</td><td style="padding:8px 0;color:#111">${entry.submittedAt}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
        <p style="color:#9ca3af;font-size:12px">Reply directly to this email to contact the requester.</p>
      </div>
    `;

    const confirmHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#3b82f6">We received your request, ${name.split(' ')[0]}!</h2>
        <p style="color:#374151">Thanks for your interest in <strong>EFRION AI Autopilot</strong>.</p>
        <p style="color:#374151">We are reviewing your request and will send your demo credentials to <strong>${email}</strong> within 1-2 business days.</p>
        <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:8px">
          <p style="margin:0;color:#6b7280;font-size:14px">Your request summary:</p>
          <p style="margin:8px 0 0;color:#111;font-size:14px">ERP System: <strong>${erpSystem || 'Not specified'}</strong></p>
        </div>
        <p style="color:#374151">In the meantime, feel free to explore our <a href="https://ai.efrion.com" style="color:#3b82f6">website</a> or check the project on <a href="https://github.com/eftechnology/efrion-ai" style="color:#3b82f6">GitHub</a>.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
        <p style="color:#9ca3af;font-size:12px">EFRION AI · <a href="https://ai.efrion.com" style="color:#9ca3af">ai.efrion.com</a></p>
      </div>
    `;

    try {
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
