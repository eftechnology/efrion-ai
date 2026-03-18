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

export interface AdminNotificationEmailProps {
  name: string;
  email: string;
  company?: string;
  role?: string;
  erpSystem?: string;
  message?: string;
  submittedAt: string;
}

export default function AdminNotificationEmail({
  name,
  email,
  company,
  role,
  erpSystem,
  message,
  submittedAt,
}: AdminNotificationEmailProps) {
  return (
    <EmailLayout preview={`New demo request from ${name}${company ? ` @ ${company}` : ''}`}>

      {/* Badge + heading */}
      <Text style={badge}>📬 New Request</Text>
      <Text style={h1}>Demo Access Request</Text>
      <Text style={p}>
        A new request has been submitted. Reply to this email to respond directly to the applicant.
      </Text>

      {/* Details card */}
      <Section style={card}>
        <Text style={cardLabel}>Applicant Details</Text>

        <DetailRow label="Name" value={<strong style={{ color: '#ffffff' }}>{name}</strong>} />
        <DetailRow
          label="Email"
          value={<Link href={`mailto:${email}`} style={linkBlue}>{email}</Link>}
        />
        {company && <DetailRow label="Company" value={company} />}
        {role    && <DetailRow label="Role"    value={role} />}
        {erpSystem && (
          <DetailRow
            label="ERP System"
            value={<Text style={{ ...badgeBlue, display: 'inline' }}>{erpSystem}</Text>}
          />
        )}
        <DetailRow
          label="Submitted"
          value={<span style={{ color: '#6b7280' }}>{new Date(submittedAt).toUTCString()}</span>}
        />
      </Section>

      {/* Message card */}
      {message && (
        <Section style={card}>
          <Text style={cardLabel}>Message</Text>
          <Text style={pWhite}>{message}</Text>
        </Section>
      )}

      <Hr style={divider} />

      {/* Reply CTA */}
      <Button href={`mailto:${email}`} style={btnPrimary}>
        Reply to {name.split(' ')[0]}
      </Button>

      <Text style={pMuted}>
        Your reply will go directly to{' '}
        <Link href={`mailto:${email}`} style={linkBlue}>{email}</Link>.
      </Text>

    </EmailLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Row style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 0' }}>
      <Column width={120} style={{ verticalAlign: 'top' }}>
        <Text style={detailLabel}>{label}</Text>
      </Column>
      <Column>
        <Text style={detailValue}>{value as string}</Text>
      </Column>
    </Row>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const badge: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#60a5fa',
  backgroundColor: 'rgba(37,99,235,0.12)',
  border: '1px solid rgba(37,99,235,0.25)',
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
  margin: '0 0 24px',
};

const pWhite: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#e5e7eb',
  margin: '0',
};

const pMuted: React.CSSProperties = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '16px 0 0',
};

const card: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '16px',
};

const cardLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: '#4b5563',
  margin: '0 0 12px',
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

const badgeBlue: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#60a5fa',
  backgroundColor: 'rgba(37,99,235,0.12)',
  border: '1px solid rgba(37,99,235,0.25)',
  borderRadius: '20px',
  padding: '2px 8px',
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
};

const linkBlue: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
};
