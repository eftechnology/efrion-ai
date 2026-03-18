"""Simple HTML email templates (dark-themed, matching the website style)."""


def _layout(preview: str, title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#05050a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">{preview}</span>

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#05050a;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#111128;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
    <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.4px;">EFRION</span>
    <span style="display:inline-block;margin-left:10px;font-size:11px;font-weight:600;color:#60a5fa;background:rgba(37,99,235,0.12);border:1px solid rgba(37,99,235,0.25);border-radius:20px;padding:2px 10px;">AI Autopilot</span>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#0d0d1a;padding:36px 40px;border-radius:0 0 16px 16px;">
    {body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 0;text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:#374151;">
      <a href="https://ai.efrion.com" style="color:#3b82f6;text-decoration:none;">ai.efrion.com</a>
      &nbsp;·&nbsp;
      <a href="mailto:hello@efrion.com" style="color:#3b82f6;text-decoration:none;">hello@efrion.com</a>
    </p>
    <p style="margin:0;font-size:11px;color:#1f2937;">© 2026 EFRION AI. Gemini Live Agent Challenge.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _row(label: str, value: str) -> str:
    if not value:
        return ""
    return f"""<tr>
      <td style="padding:8px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#4b5563;width:110px;vertical-align:top;">{label}</td>
      <td style="padding:8px 0;font-size:14px;color:#e5e7eb;">{value}</td>
    </tr>"""


def admin_notification(
    *,
    name: str,
    email: str,
    company: str,
    role: str,
    erp_system: str,
    message: str,
    submitted_at: str,
    approve_url: str | None = None,
) -> str:
    rows = (
        _row("Name", name)
        + _row("Email", f'<a href="mailto:{email}" style="color:#60a5fa;">{email}</a>')
        + _row("Company", company)
        + _row("Role", role)
        + _row("ERP", erp_system)
    )
    msg_block = ""
    if message:
        msg_block = f"""
        <div style="margin:20px 0 0;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#4b5563;">Message</p>
          <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.7;">{message}</p>
        </div>"""

    approve_block = ""
    if approve_url:
        approve_block = f"""
        <div style="margin:24px 0 0;text-align:center;">
          <a href="{approve_url}" style="display:inline-block;padding:12px 28px;background:#16a34a;border-radius:8px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">
            ✅ Approve Access
          </a>
          <p style="margin:10px 0 0;font-size:11px;color:#4b5563;">Clicking approves the request and emails credentials.</p>
        </div>"""

    body = f"""
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#4ade80;">🤖 New Demo Request</p>
      <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#fff;">{name}</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">{rows}</table>
      </div>
      {msg_block}
      {approve_block}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;">
      <p style="margin:0;font-size:13px;color:#4b5563;">
        Submitted: {submitted_at}
      </p>"""

    return _layout(
        preview=f"New demo request from {name}",
        title="New Demo Request — EFRION",
        body=body,
    )


def access_request_confirm(*, name: str, email: str, erp_system: str) -> str:
    first = name.split()[0]
    erp_badge = (
        f'<span style="display:inline-block;font-size:12px;font-weight:600;color:#60a5fa;background:rgba(37,99,235,0.12);border:1px solid rgba(37,99,235,0.25);border-radius:20px;padding:2px 8px;">{erp_system}</span>'
        if erp_system
        else '<span style="color:#6b7280;">Not specified</span>'
    )

    body = f"""
      <p style="margin:0 0 6px;display:inline-block;font-size:12px;font-weight:600;color:#4ade80;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:20px;padding:3px 10px;">✓ Request received</p>
      <p style="margin:12px 0 8px;font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.4px;">Thanks, {first}!</p>
      <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.7;">
        We received your demo access request for <strong style="color:#e5e7eb;">EFRION AI Autopilot</strong> and will review it shortly.
      </p>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;margin-bottom:16px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#4b5563;">Your request summary</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          {_row("Email", email)}
          <tr>
            <td style="padding:8px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#4b5563;width:110px;">ERP System</td>
            <td style="padding:8px 0;">{erp_badge}</td>
          </tr>
        </table>
      </div>

      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#4ade80;">① Request submitted</p>
        <p style="margin:0 0 14px;font-size:12px;color:#4b5563;">Your information has been received.</p>
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6b7280;">② Under review</p>
        <p style="margin:0 0 14px;font-size:12px;color:#4b5563;">We will review within 1–2 business days.</p>
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6b7280;">③ Credentials sent</p>
        <p style="margin:0;font-size:12px;color:#4b5563;">Demo credentials will be emailed to {email}.</p>
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;">While you wait:</p>
      <a href="https://ai.efrion.com" style="display:inline-block;margin-right:12px;padding:12px 24px;background:#2563eb;border-radius:8px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">Visit Website</a>
      <a href="https://github.com/eftechnology/efrion-ai" style="display:inline-block;padding:12px 24px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-size:14px;font-weight:600;color:#e5e7eb;text-decoration:none;">View on GitHub</a>

      <p style="margin:20px 0 0;font-size:13px;color:#4b5563;">
        Questions? Reply to this email or reach us at <a href="mailto:hello@efrion.com" style="color:#3b82f6;text-decoration:none;">hello@efrion.com</a>.
      </p>"""

    return _layout(
        preview=f"We received your EFRION demo request, {first}!",
        title="Request Received — EFRION",
        body=body,
    )


def access_granted(
    *, name: str, email: str, access_token: str, expires_at: str, login_url: str
) -> str:
    import datetime
    first = name.split()[0]
    try:
        expiry = datetime.datetime.fromisoformat(expires_at).strftime("%B %d, %Y")
    except Exception:
        expiry = expires_at

    body = f"""
      <p style="margin:0 0 6px;display:inline-block;font-size:12px;font-weight:600;color:#4ade80;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:20px;padding:3px 10px;">✓ Access approved</p>
      <p style="margin:12px 0 8px;font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.4px;">You&apos;re in, {first}!</p>
      <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.7;">
        Your demo access to <strong style="color:#e5e7eb;">EFRION AI Autopilot</strong> has been approved.
        Use the credentials below to sign in.
      </p>

      <div style="background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.2);border-radius:12px;padding:20px 24px;margin-bottom:16px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#60a5fa;">Your login credentials</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          {_row("Email", email)}
          <tr>
            <td style="padding:8px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#4b5563;width:110px;vertical-align:top;">Access Code</td>
            <td style="padding:8px 0;">
              <code style="font-family:ui-monospace,'Cascadia Code',Menlo,monospace;font-size:13px;color:#4ade80;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.15);border-radius:6px;padding:4px 8px;letter-spacing:0.05em;word-break:break-all;">{access_token}</code>
            </td>
          </tr>
          {_row("Valid until", expiry)}
        </table>
      </div>

      <div style="margin:0 0 20px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:10px 14px;">
        <p style="margin:0;font-size:12px;color:#f59e0b;">Keep this code private — it grants full access to the EFRION demo environment.</p>
      </div>

      <a href="{login_url}" style="display:inline-block;padding:12px 28px;background:#2563eb;border-radius:8px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">Sign In to EFRION →</a>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;">

      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#e5e7eb;">How to sign in:</p>
      <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#9ca3af;line-height:2;">
        <li>Go to the <a href="{login_url}" style="color:#3b82f6;text-decoration:none;">EFRION login page</a></li>
        <li>Enter your email address above</li>
        <li>Paste the access code exactly as shown</li>
      </ol>

      <p style="margin:0;font-size:13px;color:#4b5563;">
        Issues? Reply to this email or contact <a href="mailto:hello@efrion.com" style="color:#3b82f6;text-decoration:none;">hello@efrion.com</a>.
      </p>"""

    return _layout(
        preview=f"Your EFRION demo access is ready, {first}!",
        title="Access Approved — EFRION",
        body=body,
    )
