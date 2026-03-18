import {
  Button,
  Hr,
  Link,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';
import EmailLayout from './EmailLayout';

export interface AccessGrantedEmailProps {
  name: string;
  email: string;
  accessToken: string;
  expiresAt: string; // ISO string
  loginUrl: string;
}

export default function AccessGrantedEmail({
  name,
  email,
  accessToken,
  expiresAt,
  loginUrl,
}: AccessGrantedEmailProps) {
  const firstName = name.split(' ')[0];
  const expiry = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <EmailLayout preview={`Your EFRION demo access is ready, ${firstName}!`}>

      {/* Badge */}
      <Text style={badgeGreen}>✓ Access approved</Text>
      <Text style={h1}>You&apos;re in, {firstName}!</Text>
      <Text style={p}>
        Your demo access to{' '}
        <strong style={{ color: '#e5e7eb' }}>EFRION AI Autopilot</strong> has been approved.
        Use the credentials below to sign in.
      </Text>

      {/* Credentials card */}
      <Section style={credCard}>
        <Text style={cardLabel}>Your login credentials</Text>

        <Row style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 0' }}>
          <Column width={100}>
            <Text style={detailLabel}>Email</Text>
          </Column>
          <Column>
            <Text style={detailValue}>{email}</Text>
          </Column>
        </Row>

        <Row style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 0' }}>
          <Column width={100}>
            <Text style={detailLabel}>Access Code</Text>
          </Column>
          <Column>
            <Text style={codeValue}>{accessToken}</Text>
          </Column>
        </Row>

        <Row style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 0 0' }}>
          <Column width={100}>
            <Text style={detailLabel}>Valid until</Text>
          </Column>
          <Column>
            <Text style={detailValue}>{expiry}</Text>
          </Column>
        </Row>
      </Section>

      <Text style={pWarning}>
        Keep this code private — it grants full access to the EFRION demo environment.
      </Text>

      {/* CTA */}
      <Button href={loginUrl} style={btnPrimary}>
        Sign In to EFRION →
      </Button>

      <Hr style={divider} />

      {/* Instructions */}
      <Text style={p}>
        <strong style={{ color: '#e5e7eb' }}>How to sign in:</strong>
      </Text>
      <ol style={list}>
        <li style={listItem}>Go to the <Link href={loginUrl} style={linkBlue}>EFRION login page</Link></li>
        <li style={listItem}>Enter your email address above</li>
        <li style={listItem}>Paste the access code exactly as shown</li>
      </ol>

      <Text style={pMuted}>
        Questions or issues? Reply to this email or contact us at{' '}
        <Link href="mailto:hello@efrion.com" style={linkBlue}>hello@efrion.com</Link>.
      </Text>

    </EmailLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const badgeGreen: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#4ade80',
  backgroundColor: 'rgba(34,197,94,0.1)',
  border: '1px solid rgba(34,197,94,0.2)',
  borderRadius: '20px',
  padding: '3px 10px',
  margin: '0 0 16px',
};

const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 8px',
  letterSpacing: '-0.4px',
};

const p: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#9ca3af',
  margin: '0 0 20px',
};

const pWarning: React.CSSProperties = {
  fontSize: '12px',
  color: '#f59e0b',
  backgroundColor: 'rgba(245,158,11,0.08)',
  border: '1px solid rgba(245,158,11,0.2)',
  borderRadius: '8px',
  padding: '10px 14px',
  margin: '0 0 20px',
};

const pMuted: React.CSSProperties = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '20px 0 0',
};

const credCard: React.CSSProperties = {
  backgroundColor: 'rgba(37,99,235,0.06)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '16px',
};

const cardLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: '#60a5fa',
  margin: '0 0 8px',
};

const detailLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: '#4b5563',
  margin: '0',
};

const detailValue: React.CSSProperties = {
  fontSize: '14px',
  color: '#e5e7eb',
  margin: '0',
};

const codeValue: React.CSSProperties = {
  fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Monaco, monospace',
  fontSize: '13px',
  color: '#4ade80',
  backgroundColor: 'rgba(74,222,128,0.08)',
  border: '1px solid rgba(74,222,128,0.15)',
  borderRadius: '6px',
  padding: '4px 8px',
  letterSpacing: '0.05em',
  margin: '0',
};

const divider: React.CSSProperties = {
  borderColor: 'rgba(255,255,255,0.06)',
  margin: '24px 0',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 28px',
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  textDecoration: 'none',
  marginBottom: '4px',
};

const list: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '2',
  color: '#9ca3af',
  margin: '0 0 20px',
  paddingLeft: '20px',
};

const listItem: React.CSSProperties = {
  marginBottom: '4px',
};

const linkBlue: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
};
