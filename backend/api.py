"""
Public-facing REST API routes (moved from Next.js for security).
Included by main.py via app.include_router(router).
"""

import asyncio
import datetime
import os
import re
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, field_validator

import access_tokens
import email_templates
from session import sign_session

router = APIRouter()

# ── Config from env ────────────────────────────────────────────────────────────
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
COOKIE_DOMAIN: Optional[str] = os.environ.get("COOKIE_DOMAIN") or None  # e.g. ".efrion.com"
COOKIE_SECURE = APP_URL.startswith("https://")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM") or f"EFRION AI <{SMTP_USER}>"
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "hello@efrion.com")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

TURNSTILE_SECRET = os.environ.get("TURNSTILE_SECRET_KEY", "")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")
TTL_HOURS = int(os.environ.get("ACCESS_TOKEN_TTL_HOURS", "48"))

# ── Rate limiting (in-memory) ─────────────────────────────────────────────────
_rate: dict[str, dict] = {}
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_MAX", "10"))
RATE_WINDOW = 3600  # seconds

def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    entry = _rate.get(ip)
    if not entry or now > entry["reset_at"]:
        _rate[ip] = {"count": 1, "reset_at": now + RATE_WINDOW}
        return False
    if entry["count"] >= RATE_LIMIT:
        return True
    entry["count"] += 1
    return False

# ── Helpers ───────────────────────────────────────────────────────────────────
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

ERP_ALLOWED = {
    "SAP", "Oracle ERP", "Microsoft Dynamics 365", "NetSuite",
    "Odoo", "Epicor", "Infor", "Custom / In-house ERP", "Other", "",
}


async def _verify_turnstile(token: str, ip: str) -> bool:
    if not TURNSTILE_SECRET:
        return True  # skip if not configured
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                json={"secret": TURNSTILE_SECRET, "response": token, "remoteip": ip},
            )
            return r.json().get("success") is True
    except Exception:
        return False


def _send_email(to: str, subject: str, html: str, reply_to: str = "") -> None:
    """Synchronous SMTP send — called via asyncio.to_thread."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        return
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(html, "html", "utf-8"))
    use_ssl = SMTP_PORT == 465
    try:
        if use_ssl:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as s:
                s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(SMTP_FROM, to, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
                s.starttls()
                s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(SMTP_FROM, to, msg.as_string())
    except Exception as e:
        print(f"[email] Failed to send to {to}: {e}")


async def _send_telegram(entry: dict, approve_url: Optional[str] = None) -> None:
    if not (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID):
        return

    def line(label: str, value: str) -> str:
        return f"<b>{label}:</b> {value}" if value else ""

    lines = [
        "🤖 <b>EFRION — New Demo Request</b>",
        "",
        line("👤 Name", entry["name"]),
        line("📧 Email", entry["email"]),
        line("🏢 Company", entry.get("company", "")),
        line("💼 Role", entry.get("role", "")),
        line("⚙️ ERP", entry.get("erpSystem", "")),
    ]
    if entry.get("message"):
        lines += ["", f"💬 <b>Message:</b>\n{entry['message']}"]
    lines += ["", f"🕐 {entry['submittedAt']}"]
    text = "\n".join(l for l in lines if l is not None)

    payload: dict = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
    }
    if approve_url:
        payload["reply_markup"] = {
            "inline_keyboard": [[{"text": "✅ Approve Access", "url": approve_url}]]
        }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json=payload,
            )
    except Exception as e:
        print(f"[telegram] Failed: {e}")


def _set_session_cookie(response: Response, token_value: str, max_age: int) -> None:
    response.set_cookie(
        key="demo_session",
        value=token_value,
        max_age=max_age,
        path="/",
        domain=COOKIE_DOMAIN,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )


# ── Request Access ─────────────────────────────────────────────────────────────
class AccessRequest(BaseModel):
    name: str
    email: str
    company: str = ""
    role: str = ""
    erpSystem: str = ""
    message: str = ""
    turnstileToken: str = ""

    @field_validator("name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required.")
        if len(v) > 100:
            raise ValueError("Name must be 100 characters or fewer.")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Email is required.")
        if len(v) > 254:
            raise ValueError("Email must be 254 characters or fewer.")
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address.")
        return v.lower()

    @field_validator("company", "role", "message", mode="before")
    @classmethod
    def trim_optional(cls, v: str) -> str:
        return (v or "").strip()

    @field_validator("erpSystem")
    @classmethod
    def erp_allowed(cls, v: str) -> str:
        v = (v or "").strip()
        if v not in ERP_ALLOWED:
            raise ValueError("Invalid ERP system selection.")
        return v

    @field_validator("message")
    @classmethod
    def message_length(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("Message must be 2000 characters or fewer.")
        return v


@router.post("/api/request-access")
async def request_access(data: AccessRequest, request: Request):
    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "")
        or "unknown"
    )

    if _is_rate_limited(ip):
        return Response(
            content='{"error":"Too many requests. Please try again later."}',
            status_code=429,
            media_type="application/json",
        )

    if not await _verify_turnstile(data.turnstileToken, ip):
        return Response(
            content='{"error":"Security check failed. Please try again."}',
            status_code=400,
            media_type="application/json",
        )

    now = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
    entry = access_tokens.create_pending(
        name=data.name,
        email=data.email,
        company=data.company,
        role=data.role,
        erp_system=data.erpSystem,
        message=data.message,
        submitted_at=now,
    )

    approve_url = (
        f"{APP_URL}/api/admin/approve?id={entry['id']}&secret={ADMIN_SECRET}"
        if ADMIN_SECRET
        else None
    )

    # Fire-and-forget notifications
    asyncio.create_task(_send_telegram(entry, approve_url))
    asyncio.create_task(
        asyncio.to_thread(
            _send_email,
            NOTIFY_EMAIL,
            f"Demo request: {data.name}" + (f" @ {data.company}" if data.company else ""),
            email_templates.admin_notification(
                name=data.name,
                email=data.email,
                company=data.company,
                role=data.role,
                erp_system=data.erpSystem,
                message=data.message,
                submitted_at=now,
                approve_url=approve_url,
            ),
            data.email,
        )
    )
    asyncio.create_task(
        asyncio.to_thread(
            _send_email,
            data.email,
            "We received your EFRION demo request",
            email_templates.access_request_confirm(
                name=data.name,
                email=data.email,
                erp_system=data.erpSystem,
            ),
        )
    )

    return {"success": True}


# ── Auth Login ────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    accessCode: str


@router.post("/api/auth/login")
async def login(data: LoginRequest, response: Response):
    token = access_tokens.find_active(data.email, data.accessCode.strip())
    if not token:
        return Response(
            content='{"error":"Invalid credentials or access has expired."}',
            status_code=401,
            media_type="application/json",
        )

    expires_at = datetime.datetime.fromisoformat(token["expiresAt"])
    expires_at_ms = int(expires_at.timestamp() * 1000)
    max_age = max(0, int(expires_at.timestamp() - time.time()))

    session_value = sign_session(token["id"], expires_at_ms)
    _set_session_cookie(response, session_value, max_age)
    return {"success": True}


# ── Auth Logout ───────────────────────────────────────────────────────────────
@router.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="demo_session",
        path="/",
        domain=COOKIE_DOMAIN,
    )
    return {"success": True}


# ── Admin Approve ─────────────────────────────────────────────────────────────
@router.get("/api/admin/approve", response_class=HTMLResponse)
async def admin_approve(id: str = "", secret: str = ""):
    if not ADMIN_SECRET or secret != ADMIN_SECRET:
        return HTMLResponse(_page("Unauthorized", "<p>Invalid or missing secret.</p>"), status_code=401)

    if not id:
        return HTMLResponse(_page("Bad Request", "<p>Missing id parameter.</p>"), status_code=400)

    existing = access_tokens.find_by_id(id)
    if not existing:
        return HTMLResponse(_page("Not Found", "<p>Request not found.</p>"), status_code=404)
    if existing["status"] == "active":
        return HTMLResponse(
            _page("Already Approved", f"<p>Access for <strong>{existing['email']}</strong> was already approved.</p>"),
        )

    entry = access_tokens.approve(id, TTL_HOURS)
    if not entry:
        return HTMLResponse(_page("Error", "<p>Failed to approve request.</p>"), status_code=500)

    login_url = f"{APP_URL}/login"
    import datetime as _dt
    try:
        expiry = _dt.datetime.fromisoformat(entry["expiresAt"]).strftime("%B %d, %Y")
    except Exception:
        expiry = entry["expiresAt"]

    # Send credentials email (background)
    asyncio.create_task(
        asyncio.to_thread(
            _send_email,
            entry["email"],
            "Your EFRION demo access is ready",
            email_templates.access_granted(
                name=entry["name"],
                email=entry["email"],
                access_token=entry["accessToken"],
                expires_at=entry["expiresAt"],
                login_url=login_url,
            ),
        )
    )

    return HTMLResponse(
        _page(
            "Access Granted ✓",
            f"""
            <p>Access granted for <strong>{entry['name']}</strong>
               (<code>{entry['email']}</code>).</p>
            <p>Access code: <code>{entry['accessToken']}</code></p>
            <p>Valid until: <strong>{expiry}</strong></p>
            <p style="color:#6b7280">Credentials email sent (if SMTP configured).</p>
            """,
        )
    )


def _page(title: str, body: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title}</title>
<style>body{{font-family:system-ui,sans-serif;background:#05050a;color:#e5e7eb;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}}
.card{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
border-radius:16px;padding:40px;max-width:480px;width:100%}}
h1{{color:#4ade80;margin:0 0 16px;font-size:22px}}
code{{font-family:monospace;background:rgba(255,255,255,0.06);
padding:2px 6px;border-radius:4px;font-size:13px;word-break:break-all}}
p{{line-height:1.6;margin:0 0 12px;color:#9ca3af}}strong{{color:#e5e7eb}}</style>
</head><body><div class="card"><h1>{title}</h1>{body}</div></body></html>"""
