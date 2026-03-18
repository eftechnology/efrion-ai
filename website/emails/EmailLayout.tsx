import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Row,
  Column,
  Hr,
  Link,
  Text,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export default function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* ── Header ── */}
          <Section style={header}>
            <Row>
              <Column>
                <Row>
                  <Column width={48}>
                    <Img
                      src="https://ai.efrion.com/efrion-logo.svg"
                      width={40}
                      height={40}
                      alt="EFRION"
                      style={logo}
                    />
                  </Column>
                  <Column>
                    <Text style={brandName}>EFRION</Text>
                    <Text style={brandBadge}>AI Autopilot</Text>
                  </Column>
                </Row>
              </Column>
              <Column align="right">
                <Text style={hackathonBadge}>🏆 Gemini Live Agent Challenge</Text>
              </Column>
            </Row>
            <Hr style={headerDivider} />
          </Section>

          {/* ── Content ── */}
          <Section style={content}>
            {children}
          </Section>

          {/* ── Footer ── */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Row>
              <Column>
                <Text style={footerLinks}>
                  <Link href="https://ai.efrion.com" style={footerLinkBlue}>ai.efrion.com</Link>
                  {' · '}
                  <Link href="https://ai.efrion.com/#features" style={footerLink}>Features</Link>
                  {' · '}
                  <Link href="https://github.com/eftechnology/efrion-ai" style={footerLink}>GitHub</Link>
                  {' · '}
                  <Link href="mailto:hello@efrion.com" style={footerLink}>hello@efrion.com</Link>
                </Text>
              </Column>
              <Column align="right">
                <Text style={footerCopy}>© 2026 EFRION AI</Text>
              </Column>
            </Row>
            <Text style={footerSub}>
              Powered by Gemini 2.5 Multimodal Live API · Built for the UI Navigator track
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#0a0a12',
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  margin: 0,
  padding: '40px 16px',
};

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#0d0d1a',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  overflow: 'hidden',
};

const header: React.CSSProperties = {
  backgroundColor: '#111128',
  padding: '28px 40px 0',
};

const logo: React.CSSProperties = {
  borderRadius: '10px',
  display: 'block',
};

const brandName: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0',
  lineHeight: '1.2',
};

const brandBadge: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#60a5fa',
  backgroundColor: 'rgba(37,99,235,0.15)',
  border: '1px solid rgba(37,99,235,0.3)',
  borderRadius: '20px',
  padding: '2px 8px',
  margin: '4px 0 0',
};

const hackathonBadge: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#fbbf24',
  backgroundColor: 'rgba(250,204,21,0.1)',
  border: '1px solid rgba(250,204,21,0.2)',
  borderRadius: '20px',
  padding: '4px 10px',
  margin: '0',
};

const headerDivider: React.CSSProperties = {
  borderColor: 'rgba(37,99,235,0.3)',
  margin: '24px 0 0',
};

const content: React.CSSProperties = {
  padding: '36px 40px',
};

const footer: React.CSSProperties = {
  backgroundColor: '#0a0a14',
  padding: '0 40px 24px',
};

const footerDivider: React.CSSProperties = {
  borderColor: 'rgba(255,255,255,0.06)',
  margin: '0 0 20px',
};

const footerLinks: React.CSSProperties = {
  fontSize: '12px',
  color: '#4b5563',
  margin: '0',
};

const footerLinkBlue: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
};

const footerLink: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'none',
};

const footerCopy: React.CSSProperties = {
  fontSize: '12px',
  color: '#374151',
  margin: '0',
};

const footerSub: React.CSSProperties = {
  fontSize: '11px',
  color: '#374151',
  margin: '8px 0 0',
};
