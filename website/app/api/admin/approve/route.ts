import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { approveEntry, findById } from '@/lib/access-tokens';
import AccessGrantedEmail from '@/emails/AccessGrantedEmail';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  const secret = searchParams.get('secret') ?? '';

  // Validate admin secret
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  // Check if already approved
  const existing = findById(id);
  if (!existing) {
    return new NextResponse('Request not found', { status: 404 });
  }
  if (existing.status === 'active') {
    return new NextResponse(
      html(`Already approved`, `Access for <strong>${existing.email}</strong> was already approved.`),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Approve and generate token
  const ttlHours = Number(process.env.ACCESS_TOKEN_TTL_HOURS ?? '48');
  const entry = approveEntry(id, ttlHours);
  if (!entry) {
    return new NextResponse('Failed to approve', { status: 500 });
  }

  // Send access granted email
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  const appUrl = process.env.APP_URL ?? 'https://ai.efrion.com';
  const loginUrl = `${appUrl}/login`;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transport = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: Number(SMTP_PORT ?? 587) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      const html = await render(
        AccessGrantedEmail({
          name: entry.name,
          email: entry.email,
          accessToken: entry.accessToken,
          expiresAt: entry.expiresAt!,
          loginUrl,
        })
      );

      await transport.sendMail({
        from: SMTP_FROM ?? `EFRION AI <${SMTP_USER}>`,
        to: entry.email,
        subject: 'Your EFRION demo access is ready',
        html,
      });
    } catch (err) {
      console.error('Failed to send access granted email:', err);
      // Don't fail the approval — credentials are saved
    }
  }

  const expiry = new Date(entry.expiresAt!).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return new NextResponse(
    html(
      `Access granted ✓`,
      `
        <p>Access granted for <strong>${entry.name}</strong> (<code>${entry.email}</code>).</p>
        <p>Access code: <code>${entry.accessToken}</code></p>
        <p>Valid until: <strong>${expiry}</strong></p>
        <p style="color:#6b7280">Credentials email has been sent (if SMTP is configured).</p>
      `
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

function html(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #05050a; color: #e5e7eb;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 40px; max-width: 480px; width: 100%; }
  h1 { color: #4ade80; margin: 0 0 16px; font-size: 22px; }
  code { font-family: monospace; background: rgba(255,255,255,0.06);
         padding: 2px 6px; border-radius: 4px; font-size: 13px; word-break: break-all; }
  p { line-height: 1.6; margin: 0 0 12px; color: #9ca3af; }
  strong { color: #e5e7eb; }
</style>
</head><body>
<div class="card"><h1>${title}</h1>${body}</div>
</body></html>`;
}
