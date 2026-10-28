import {
  Html,
  Body,
  Head,
  Preview,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Hr,
  Img,
} from '@react-email/components'

interface WaterLeakWarningProps {
  hoaName: string
  hoaLogoUrl: string
  hoaAddress: string
  hoaWebsite: string
  hoaHelpdeskEmail: string
  firstName: string
  lastName: string
  propertyAddress: string
  meterNumber: string
  readingDate: string
  consumption: string
  averageConsumption: string
  percentIncrease: string
  portalUrl: string
}

export default function WaterLeakWarning({
  hoaName = 'HOA System',
  hoaLogoUrl = '/placeholder-logo.svg',
  hoaAddress = '',
  hoaWebsite = '',
  hoaHelpdeskEmail = '',
  firstName = 'Resident',
  lastName = '',
  propertyAddress = '',
  meterNumber = '',
  readingDate = '',
  consumption = '',
  averageConsumption = '',
  percentIncrease = '',
  portalUrl = '',
}: WaterLeakWarningProps) {
  const previewText = `🚨 URGENT: High Water Consumption / Possible Leak Alert - ${hoaName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Bar */}
          <Section style={headerBar}>
            {hoaLogoUrl && (
              <Img
                src={hoaLogoUrl}
                alt={hoaName}
                width="64"
                style={logo}
              />
            )}
            <Heading as="h1" style={heading}>
              Water Consumption Alert
            </Heading>
            <Text style={subheading}>{hoaName}</Text>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <div style={warningPillContainer}>
              <span style={warningPill}>Potential Leak Detected</span>
            </div>

            <Text style={greeting}>Hello {firstName} {lastName},</Text>
            <Text style={paragraph}>
              Our utility metering team recorded a water reading for your property at <strong>{propertyAddress}</strong> that indicates an unusual spike in consumption compared to your historical averages:
            </Text>

            {/* Details Box */}
            <Section style={detailsBox}>
              <Heading as="h3" style={boxTitle}>Consumption Anomaly Details</Heading>
              <table style={tableStyle}>
                <tbody>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Meter Number:</td>
                    <td style={valueStyleMono}>{meterNumber}</td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Reading Date:</td>
                    <td style={valueStyle}>{readingDate}</td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Recorded Consumption:</td>
                    <td style={valueStyleHighlight}>{consumption} m³</td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>3-Month Average:</td>
                    <td style={valueStyle}>{averageConsumption} m³</td>
                  </tr>
                  <tr style={warningRowStyle}>
                    <td style={warningLabelStyle}>Increase:</td>
                    <td style={warningValueStyle}>+ {percentIncrease}%</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Text style={paragraph}>
              A spike of this nature typically indicates an unnoticed leak (such as a running toilet, faulty valve, or underground line break). We highly recommend checking your plumbing fixtures immediately to prevent water damage and high utility charges.
            </Text>

            {portalUrl && (
              <Section style={buttonSection}>
                <Link href={portalUrl} style={button}>
                  View Water Usage History
                </Link>
              </Section>
            )}
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              <strong>{hoaName}</strong>
              {hoaAddress && <> — {hoaAddress}</>}
            </Text>
            <div style={footerLinksContainer}>
              {hoaWebsite && (
                <Link href={hoaWebsite} style={footerLink}>
                  Subdivision Website
                </Link>
              )}
              {hoaWebsite && hoaHelpdeskEmail && <span style={footerSeparator}>|</span>}
              {hoaHelpdeskEmail && (
                <Link href={`mailto:${hoaHelpdeskEmail}`} style={footerLink}>
                  Support Helpdesk
                </Link>
              )}
            </div>
            <Text style={footerDisclaimer}>
              This is an automated administrative notification. Please do not reply directly to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/* Colors matching DESIGN.md */
const COLOR_PRIMARY = '#4E68A1' // Deep Slate Blue
const COLOR_TEXT = '#333333' // Charcoal
const COLOR_MUTED = '#4E68A1' // Muted Slate
const COLOR_BG_PAGE = '#FAF9F5' // Cream background
const COLOR_BORDER = '#cfd7e6' // Light slate border

const COLOR_WARN = '#b45309' // Amber-700
const COLOR_WARN_BG = '#fffbeb' // Amber-50
const COLOR_WARN_BORDER = '#fde68a' // Amber-200

const main = {
  backgroundColor: COLOR_BG_PAGE,
  fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: `1px solid ${COLOR_BORDER}`,
  borderTop: `4px solid ${COLOR_PRIMARY}`,
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '0',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
}

const headerBar = {
  padding: '40px 32px 32px',
  borderBottom: `1px solid ${COLOR_BORDER}`,
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto 16px',
  display: 'block',
}

const heading = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 6px',
  letterSpacing: '-0.02em',
}

const subheading = {
  color: COLOR_MUTED,
  fontSize: '12px',
  fontWeight: '600',
  lineHeight: '1.2',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
}

const contentSection = {
  padding: '32px 32px 40px',
}

const warningPillContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const warningPill = {
  backgroundColor: COLOR_WARN_BG,
  color: COLOR_WARN,
  border: `1px solid ${COLOR_WARN_BORDER}`,
  display: 'inline-block',
  padding: '4px 14px',
  borderRadius: '9999px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const greeting = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1.5',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#334155',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

const detailsBox = {
  backgroundColor: COLOR_WARN_BG,
  border: `1px solid ${COLOR_WARN_BORDER}`,
  borderLeft: `4px solid ${COLOR_WARN}`,
  borderRadius: '6px',
  margin: '24px 0',
  padding: '20px',
}

const boxTitle = {
  color: COLOR_WARN,
  fontSize: '12px',
  fontWeight: '700',
  lineHeight: '1.2',
  margin: '0 0 16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const rowStyle = {
  borderBottom: `1px solid ${COLOR_WARN_BORDER}`,
}

const labelStyle = {
  padding: '10px 0',
  color: '#475569',
  fontWeight: '500',
  fontSize: '13px',
  width: '35%',
}

const valueStyle = {
  padding: '10px 0',
  color: '#0f172a',
  fontWeight: '600',
  fontSize: '13px',
  textAlign: 'right' as const,
}

const valueStyleHighlight = {
  ...valueStyle,
  color: '#dc2626',
}

const valueStyleMono = {
  ...valueStyle,
  fontFamily: 'Geist Mono, SF Mono, Menlo, Consolas, monospace',
}

const warningRowStyle = {
  borderTop: `1px solid ${COLOR_WARN_BORDER}`,
}

const warningLabelStyle = {
  padding: '12px 0 0 0',
  color: '#0f172a',
  fontWeight: '700',
  fontSize: '14px',
}

const warningValueStyle = {
  padding: '12px 0 0 0',
  color: COLOR_WARN,
  fontWeight: '700',
  fontSize: '15px',
  textAlign: 'right' as const,
}

const buttonSection = {
  margin: '32px 0 24px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: COLOR_PRIMARY,
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  boxShadow: '0 4px 6px -1px rgba(78, 104, 161, 0.15)',
}

const hr = {
  border: 'none',
  borderTop: `1px solid ${COLOR_BORDER}`,
  margin: '0',
}

const footerSection = {
  padding: '32px 32px 48px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
  borderRadius: '0 0 8px 8px',
}

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 6px',
}

const footerLinksContainer = {
  margin: '8px 0 16px',
}

const footerLink = {
  color: COLOR_PRIMARY,
  fontSize: '12px',
  fontWeight: '500',
  textDecoration: 'underline',
}

const footerSeparator = {
  color: COLOR_BORDER,
  fontSize: '12px',
  margin: '0 8px',
}

const footerDisclaimer = {
  color: '#94a3b8',
  fontSize: '11px',
  lineHeight: '1.4',
  margin: '16px 0 0',
}
