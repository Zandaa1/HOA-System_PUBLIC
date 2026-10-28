'use server'

import nodemailer from 'nodemailer'
import { testConnection } from '@/lib/email'

export async function testSmtpConnection(formData: FormData) {
  const host = formData.get('host') as string
  const portStr = formData.get('port') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const senderName = (formData.get('senderName') as string) || 'HOA System'
  const senderEmail = (formData.get('senderEmail') as string) || username || 'noreply@example.invalid'

  if (!host) {
    return { success: false, error: 'SMTP Host is required.' }
  }

  const port = parseInt(portStr, 10) || 587
  const auth = username ? { user: username, pass: password } : undefined

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth,
    
  })

  try {
    await transport.verify()

    // Send a test email to verify delivery routing
    await transport.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: senderEmail,
      subject: 'HOA System - SMTP Test Email',
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">SMTP Verification</h2>
          <p>This is a test email sent from the <strong>HOA System HOA Management Platform</strong>.</p>
          <p>If you received this message, your SMTP credentials and connection are working correctly.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
            <strong>Configuration Details:</strong><br />
            • SMTP Host: ${host}:${port}<br />
            • Username: ${username || 'None'}<br />
            • Sender: "${senderName}" &lt;${senderEmail}&gt;<br />
            • Timestamp: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
          </p>
        </div>
      `,
    })

    return { success: true, host, port }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error',
    }
  } finally {
    transport.close()
  }
}

export async function pingSmtp() {
  return testConnection()
}
