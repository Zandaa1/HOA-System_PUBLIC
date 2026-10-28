import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

interface SmtpConfig {
  host: string
  port: number
  username: string
  password: string
  senderName: string
  senderEmail: string
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const supabase = await createAdminClient()

  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'smtp_host',
      'smtp_port',
      'smtp_username',
      'smtp_password',
      'smtp_sender_name',
      'smtp_sender_email',
    ])

  const get = (key: string, fallback = '') =>
    settings?.find((s) => s.setting_key === key)?.setting_value || fallback

  const host = get('smtp_host')
  const port = parseInt(get('smtp_port', '587'), 10)
  const username = get('smtp_username')
  const password = get('smtp_password')

  return {
    host: host || 'localhost',
    port: host ? port : 1025,
    username,
    password,
    senderName: get('smtp_sender_name', 'HOA Portal'),
    senderEmail: get('smtp_sender_email', 'noreply@example.invalid'),
  }
}

function createTransport(config: SmtpConfig) {
  const auth =
    config.host !== 'localhost' && config.username
      ? { user: config.username, pass: config.password }
      : undefined

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth,
  })
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const config = await getSmtpConfig()
  const transport = createTransport(config)

  try {
    await transport.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to,
      subject,
      html,
    })
  } finally {
    transport.close()
  }
}

export async function testConnection() {
  const config = await getSmtpConfig()
  const transport = createTransport(config)

  try {
    await transport.verify()

    // Send a test email to verify routing/delivery
    await transport.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: config.senderEmail,
      subject: 'HOA System - System SMTP Ping',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">System SMTP Ping Successful</h2>
          <p>This is a verification email sent from the <strong>HOA System HOA Management Platform</strong> settings.</p>
          <p>If you received this message, the saved SMTP credentials are valid and active.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
            <strong>Configuration Details:</strong><br />
            • SMTP Host: ${config.host}:${config.port}<br />
            • Username: ${config.username || 'None'}<br />
            • Sender: "${config.senderName}" &lt;${config.senderEmail}&gt;<br />
            • Timestamp: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
          </p>
        </div>
      `,
    })

    return { success: true, host: config.host, port: config.port }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      host: config.host,
      port: config.port,
    }
  } finally {
    transport.close()
  }
}

export async function isSmtpConfigured() {
  const config = await getSmtpConfig()
  return !!(config.host && config.host !== 'localhost' && config.username)
}
