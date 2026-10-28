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

interface PaymentReceiptProps {
  hoaName: string
  hoaLogoUrl: string
  hoaAddress: string
  hoaWebsite: string
  hoaHelpdeskEmail: string
  firstName: string
  lastName: string
  receiptNumber: string
  invoiceNumber: string
  paymentMethod: string
  transactionId: string
  amountPaid: string
  remainingBalance: string
  portalUrl: string
}

export default function PaymentReceipt({
  hoaName = 'HOA System',
  hoaLogoUrl = '/placeholder-logo.svg',
  hoaAddress = '',
  hoaWebsite = '',
  hoaHelpdeskEmail = '',
  firstName = 'Resident',
  lastName = '',
  receiptNumber = '',
  invoiceNumber = '',
  paymentMethod = '',
  transactionId = '',
  amountPaid = '',
  remainingBalance = '',
  portalUrl = '',
}: PaymentReceiptProps) {
  const previewText = `Official Payment Receipt ${receiptNumber} confirmed - ${hoaName}`

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
              Payment Confirmed
            </Heading>
            <Text style={subheading}>{hoaName}</Text>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <div style={successPillContainer}>
              <span style={successPill}>Official Payment Receipt</span>
            </div>

            <Text style={greeting}>Dear {firstName} {lastName},</Text>
            <Text style={paragraph}>
              Thank you for your payment. We have successfully logged and credited your payment details to your account:
            </Text>

            {/* Details Box */}
            <Section style={detailsBox}>
              <Heading as="h3" style={boxTitle}>Receipt Details</Heading>
              <table style={tableStyle}>
                <tbody>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Receipt Number:</td>
                    <td style={valueStyleMono}>{receiptNumber}</td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Invoice Reference:</td>
                    <td style={valueStyleMono}>{invoiceNumber}</td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Payment Method:</td>
                    <td style={valueStyle}>{paymentMethod}</td>
                  </tr>
                  {transactionId && (
                    <tr style={rowStyle}>
                      <td style={labelStyle}>Transaction ID:</td>
                      <td style={valueStyleMono}>{transactionId}</td>
                    </tr>
                  )}
                  <tr style={successRowStyle}>
                    <td style={successLabelStyle}>Amount Paid:</td>
                    <td style={successValueStyle}>{amountPaid}</td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={labelStyle}>Remaining Balance:</td>
                    <td style={valueStyle}>{remainingBalance}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {portalUrl && (
              <Section style={buttonSection}>
                <Link href={portalUrl} style={button}>
                  View Billing History
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

const COLOR_SUCCESS = '#16a34a' // Green-600
const COLOR_SUCCESS_BG = '#f0fdf4' // Green-50
const COLOR_SUCCESS_BORDER = '#bbf7d0' // Green-200

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

const successPillContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const successPill = {
  backgroundColor: COLOR_SUCCESS_BG,
  color: COLOR_SUCCESS,
  border: `1px solid ${COLOR_SUCCESS_BORDER}`,
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
  backgroundColor: COLOR_SUCCESS_BG,
  border: `1px solid ${COLOR_SUCCESS_BORDER}`,
  borderLeft: `4px solid ${COLOR_SUCCESS}`,
  borderRadius: '6px',
  margin: '24px 0',
  padding: '20px',
}

const boxTitle = {
  color: COLOR_SUCCESS,
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
  borderBottom: `1px solid ${COLOR_SUCCESS_BORDER}`,
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

const valueStyleMono = {
  ...valueStyle,
  fontFamily: 'Geist Mono, SF Mono, Menlo, Consolas, monospace',
}

const successRowStyle = {
  borderTop: `1px solid ${COLOR_SUCCESS_BORDER}`,
}

const successLabelStyle = {
  padding: '12px 0 0 0',
  color: '#0f172a',
  fontWeight: '700',
  fontSize: '14px',
}

const successValueStyle = {
  padding: '12px 0 0 0',
  color: COLOR_SUCCESS,
  fontWeight: '700',
  fontSize: '18px',
  textAlign: 'right' as const,
}

const buttonSection = {
  margin: '32px 0 24px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: COLOR_SUCCESS,
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.15)',
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
