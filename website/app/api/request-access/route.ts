import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

  // Persist to a local JSON file.
  // For production (Vercel / serverless) replace this with a DB or email service.
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
    // Non-fatal — log and continue so the user still gets a success response.
    console.error('Failed to persist access request:', err);
  }

  console.log('📬 New demo access request:', entry);

  return NextResponse.json({ success: true });
}
