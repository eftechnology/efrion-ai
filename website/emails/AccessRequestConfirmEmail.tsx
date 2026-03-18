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

export interface AccessRequestConfirmEmailProps {
  name: string;
  email: string;
  erpSystem?: string;
}

export default function AccessRequestConfirmEmail({
  name,
  email,
  erpSystem,
}: AccessRequestConfirmEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <EmailLayout preview={`We received your EFRION demo request, ${firstName}!`}>

      {/* Badge + heading */}
      <Text style={badgeGreen}>✓ Request received</Text>
      <Text style={h1}>Thanks, {firstName}!</Text>
      <Text style={p}>
        We have received your demo access request for{' '}
        <strong style={{ color: '#e5e7eb' }}>EFRION AI Autopilot</strong> and will
        review it shortly.
      </Text>

      {/* Summary card */}
      <Section style={card}>
        <Text style={cardLabel}>Your request summary</Text>
        <Row style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 0' }}>
          <Column width={120}>
            <Text style={detailLabel}>Email</Text>
          </Column>
          <Column>
            <Text style={detailValue}>{email}</Text>
          </Column>
        </Row>
        <Row style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 0' }}>
          <Column width={120}>
            <Text style={detailLabel}>ERP System</Text>
          </Column>
          <Column>
            {erpSystem
              ? <Text style={badgeBlue}>{erpSystem}</Text>
              : <Text style={{ ...detailValue, color: '#6b7280' }}>Not specified</Text>
            }
          </Column>
        </Row>
      </Section>

      {/* Timeline */}
      <Section style={timelineCard}>
        <Row>
          <Column width={36}>
            <Text style={stepDot}>1</Text>
          </Column>
          <Column>
            <Text style={stepTitle}>Request submitted</Text>
            <Text style={stepDesc}>Your information has been received.</Text>
          </Column>
        </Row>
        <Row>
          <Column width={36}>
            <Text style={stepDotPending}>2</Text>
          </Column>
          <Column>
            <Text style={stepTitlePending}>Under review</Text>
            <Text style={stepDesc}>We will review your request within 1–2 business days.</Text>
          </Column>
        </Row>
        <Row>
          <Column width={36}>
            <Text style={stepDotPending}>3</Text>
          </Column>
          <Column>
            <Text style={stepTitlePending}>Credentials sent</Text>
            <Text style={stepDesc}>Demo credentials will be emailed to {email}.</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* CTAs */}
      <Text style={p}>While you wait:</Text>
      <Row>
        <Column style={{ paddingRight: '12px' }}>
          <Button href="https://ai.efrion.com" style={btnPrimary}>
            Visit Website
          </Button>
        </Column>
        <Column>
          <Button href="https://github.com/eftechnology/efrion-ai" style={btnSecondary}>
            View on GitHub
          </Button>
        </Column>
      </Row>

      <Text style={pMuted}>
        Questions? Reply to this email or reach us at{' '}
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

const badgeBlue: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#60a5fa',
  backgroundColor: 'rgba(37,99,235,0.12)',
  border: '1px solid rgba(37,99,235,0.25)',
  borderRadius: '20px',
  padding: '2px 8px',
  margin: '0',
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

const pMuted: React.CSSProperties = {
  fontSize: '13px',
  color: '#4b5563',
  margin: '20px 0 0',
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

const timelineCard: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '24px',
};

const stepDot: React.CSSProperties = {
  width: '24px',
  height: '24px',
  backgroundColor: '#2563eb',
  borderRadius: '50%',
  fontSize: '12px',
  fontWeight: '700',
  color: '#ffffff',
  textAlign: 'center',
  lineHeight: '24px',
  margin: '0',
};

const stepDotPending: React.CSSProperties = {
  ...stepDot,
  backgroundColor: 'rgba(255,255,255,0.06)',
  color: '#4b5563',
};

const stepTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#4ade80',
  margin: '0 0 2px',
};

const stepTitlePending: React.CSSProperties = {
  ...stepTitle,
  color: '#6b7280',
};

const stepDesc: React.CSSProperties = {
  fontSize: '12px',
  color: '#4b5563',
  margin: '0 0 14px',
};

const divider: React.CSSProperties = {
  borderColor: 'rgba(255,255,255,0.06)',
  margin: '24px 0',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  textDecoration: 'none',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#e5e7eb',
  textDecoration: 'none',
};

const linkBlue: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
};
