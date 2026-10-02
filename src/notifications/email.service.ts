import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

function escapeHtml(str: string): string {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

export interface RecapRow {
  label: string
  value: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends a "verify your submission" email: a recap table of exactly what was submitted,
   * the assigned public ID, and a verification link/button. Same Resend REST API already
   * used by pnp-web/worker/index.js for the waitlist notification, kept consistent here.
   */
  async sendVerificationEmail(params: {
    to: string
    recipientName: string
    subject: string
    heading: string
    publicId: string
    recap: RecapRow[]
    verifyUrl: string
  }): Promise<boolean> {
    const { to, recipientName, subject, heading, publicId, recap, verifyUrl } = params
    const apiKey = this.config.get<string>('RESEND_API_KEY')
    const from = this.config.get<string>('EMAIL_FROM') || 'PNP Sports <notifications@pnpsports.in>'
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://pnpsports.in'
    const logoUrl = `${frontendUrl.replace(/\/+$/, '')}/logo.png`

    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not set — cannot send verification email.')
      return false
    }

    const rows = recap
      .map(
        (row) =>
          `<tr><td style="padding:6px 12px;color:#555;"><strong>${escapeHtml(row.label)}</strong></td><td style="padding:6px 12px;">${escapeHtml(row.value)}</td></tr>`,
      )
      .join('')

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <p style="margin-bottom:16px;"><img src="${logoUrl}" alt="PNP Sports" height="40" style="height:40px;width:auto;display:block;" /></p>
        <h2 style="color:#1b3fab;">${escapeHtml(heading)}</h2>
        <p>Dear ${escapeHtml(recipientName)},</p>
        <p>Thank you for registering with PNP Sports. Reference ID: <strong>${escapeHtml(publicId)}</strong></p>
        <p>Here's what was submitted:</p>
        <table cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-collapse:collapse;width:100%;">
          ${rows}
        </table>
        <p style="margin-top:20px;">Please confirm this is you by verifying your email — this link expires in 48 hours.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${verifyUrl}" style="background:#1b3fab;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color:#888;font-size:12px;">If the button doesn't work, copy and paste this link: ${escapeHtml(verifyUrl)}</p>
        <p style="color:#888;font-size:12px;">Didn't submit this? You can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;">— The PNP Sports Team</p>
      </div>
    `

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
      })

      if (!res.ok) {
        this.logger.error(`Resend responded with ${res.status}: ${await res.text()}`)
      }
      return res.ok
    } catch (err) {
      this.logger.error('Failed to send verification email', err as Error)
      return false
    }
  }
}
