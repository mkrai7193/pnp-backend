import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/** The placeholder shipped in .env.example — a real key never looks like this. */
const PLACEHOLDER_KEY_PATTERN = /^re_x+$/i

/** Actionable hints for the Resend status codes we've actually hit or expect to. */
const RESEND_STATUS_HINTS: Record<number, string> = {
  400: 'Malformed request — check EMAIL_FROM format and the recipient address.',
  401: 'RESEND_API_KEY is invalid — create a key in Resend → API Keys, put it in the server .env and restart.',
  403: 'Key lacks permission or the EMAIL_FROM domain is not verified in Resend → Domains.',
  422: 'Resend rejected the payload — usually an unverified sender domain or invalid "to"/"from".',
  429: 'Rate limit / daily quota hit on the Resend plan.',
}

/** "player@email.com" → "pl***@email.com", so logs identify the attempt without storing full PII. */
function maskEmail(email: string): string {
  const [user, domain] = String(email).split('@')
  if (!domain) return '***'
  return `${user.slice(0, 2)}***@${domain}`
}

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
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly config: ConfigService) {}

  /**
   * Surface a broken email config at boot instead of on the first registration — the
   * placeholder key from .env.example once sat in production for a month unnoticed.
   * Logs only; the app still starts so registrations keep being saved.
   */
  onModuleInit(): void {
    const apiKey = this.config.get<string>('RESEND_API_KEY')
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not set — verification emails WILL NOT be sent.')
    } else if (PLACEHOLDER_KEY_PATTERN.test(apiKey)) {
      this.logger.error(
        'RESEND_API_KEY is still the .env.example placeholder — verification emails WILL NOT be sent.',
      )
    } else if (!apiKey.startsWith('re_')) {
      this.logger.warn('RESEND_API_KEY does not start with "re_" — it is probably not a valid Resend key.')
    } else {
      this.logger.log(
        `Email configured: Resend key re_…${apiKey.slice(-4)}, from "${this.config.get<string>('EMAIL_FROM') || '(default)'}".`,
      )
    }
  }

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
    // Every log line carries this, so a failure can be tied to the DB row (publicId) and user.
    const ctx = `[${publicId} → ${maskEmail(to)}]`

    if (!apiKey) {
      this.logger.error(`${ctx} RESEND_API_KEY is not set — verification email not sent.`)
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

    const startedAt = Date.now()
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
      })
      const ms = Date.now() - startedAt
      const body = await res.text()

      if (!res.ok) {
        let detail = body
        try {
          const parsed = JSON.parse(body) as { name?: string; message?: string }
          detail = [parsed.name, parsed.message].filter(Boolean).join(': ') || body
        } catch {
          // non-JSON body — log it raw
        }
        const hint = RESEND_STATUS_HINTS[res.status] ?? (res.status >= 500 ? 'Resend-side error — retry later.' : '')
        this.logger.error(
          `${ctx} Verification email FAILED — Resend ${res.status} (${detail}) after ${ms}ms, from "${from}".` +
            (hint ? ` Hint: ${hint}` : ''),
        )
        return false
      }

      let messageId = 'unknown'
      try {
        messageId = (JSON.parse(body) as { id?: string }).id ?? messageId
      } catch {
        // success with an unexpected body — still a success
      }
      this.logger.log(`${ctx} Verification email sent (Resend id ${messageId}, ${ms}ms).`)
      return true
    } catch (err) {
      // fetch() network failures hide the real reason (ENOTFOUND, ECONNRESET, …) in err.cause.
      const error = err as Error & { cause?: { code?: string; message?: string } }
      const cause = error.cause ? ` (cause: ${error.cause.code ?? error.cause.message ?? String(error.cause)})` : ''
      this.logger.error(
        `${ctx} Verification email FAILED — could not reach Resend after ${Date.now() - startedAt}ms: ${error.message}${cause}`,
        error.stack,
      )
      return false
    }
  }
}
