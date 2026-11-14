import { Resend } from 'resend';

export async function sendResendEmail(to: string, subject: string, htmlContent: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[ResendService] RESEND_API_KEY is not set in environment variables. Email dispatch skipped.');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Smart Ledger Security <security@smartledgerx.io>',
      to: [to],
      subject,
      html: htmlContent,
    });
    console.log(`[ResendService] Email successfully sent to ${to} | Subject: "${subject}"`, response);
    return { success: true, response };
  } catch (error: any) {
    const errorMsg = error?.message || error?.response?.message || JSON.stringify(error) || 'Unknown Resend error';
    console.error(`[ResendService] Failed to send email to ${to} via Resend:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// 1. Successful Login Alert
export async function sendLoginSuccessEmail(to: string, details: { time: string; device: string; browser: string; location: string; ip: string }) {
  const subject = 'Successful Login to Smart Ledger';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 30px 20px; color: #1f2937;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Smart Ledger Security</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">New Successful Account Login</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">Hello,</p>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.5;">We detected a successful login to your Smart Ledger account from a recognized device.</p>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 35%;">Time:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${details.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Device:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${details.device}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Browser:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${details.browser}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Location:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${details.location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${details.ip}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.4;">If this was you, no further action is needed. If you did not log in, please secure your account immediately.</p>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          &copy; 2026 Smart Ledger Financial Systems. All rights reserved.
        </div>
      </div>
    </div>
  `;
  return sendResendEmail(to, subject, html);
}

// 2. Password Change Alert
export async function sendPasswordChangeEmail(to: string, details: { time: string; ip: string; location: string }) {
  const subject = 'Your Password Was Changed';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 30px 20px; color: #1f2937;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #e11d48, #f43f5e); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Security Alert</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Password Modified</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">Hello,</p>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.5;">The password for your Smart Ledger account was successfully changed on <strong>${details.time}</strong>.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #e11d48; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #991b1b; font-size: 14px;">⚠️ Wasn't you?</p>
            <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.4;">If you did not change your password, please contact our support team immediately or reset your credentials to secure your account.</p>
          </div>

          <p style="margin: 0; font-size: 13px; color: #6b7280;">IP Address: ${details.ip} | Location: ${details.location}</p>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          &copy; 2026 Smart Ledger Financial Systems. All rights reserved.
        </div>
      </div>
    </div>
  `;
  return sendResendEmail(to, subject, html);
}

// 3. New Device Login Alert
export async function sendNewDeviceEmail(to: string, details: { time: string; device: string; browser: string; location: string; ip: string }) {
  const subject = 'New Device Login Detected';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 30px 20px; color: #1f2937;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Device Alert</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Unrecognized Browser or Device</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">Hello,</p>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.5;">We noticed a login to your Smart Ledger account from a device or browser that hasn't been used before:</p>
          
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #b45309; width: 35%;">Device:</td>
                <td style="padding: 6px 0; color: #78350f; font-weight: 600;">${details.device}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #b45309;">Browser:</td>
                <td style="padding: 6px 0; color: #78350f; font-weight: 600;">${details.browser}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #b45309;">Location:</td>
                <td style="padding: 6px 0; color: #78350f; font-weight: 600;">${details.location}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #b45309;">IP Address:</td>
                <td style="padding: 6px 0; color: #78350f; font-weight: 600;">${details.ip}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #b45309;">Time:</td>
                <td style="padding: 6px 0; color: #78350f; font-weight: 600;">${details.time}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.4;">If this was you, you can ignore this alert. If you do not recognize this login, please secure your account immediately.</p>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          &copy; 2026 Smart Ledger Financial Systems. All rights reserved.
        </div>
      </div>
    </div>
  `;
  return sendResendEmail(to, subject, html);
}

// 4. Failed Login Attempts Alert
export async function sendFailedAttemptsEmail(to: string, details: { attempts: number; ip: string; time: string }) {
  const subject = 'Multiple Failed Login Attempts Detected';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 30px 20px; color: #1f2937;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #b91c1c, #ef4444); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Security Warning</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Repeated Failed Logins</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">Hello,</p>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.5;">We detected <strong>${details.attempts} consecutive failed login attempts</strong> on your Smart Ledger account.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #b91c1c; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-weight: 600; color: #991b1b; font-size: 14px;">🔒 Account Temporary Lockout</p>
            <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.4;">For your security, sign-ins from this IP (${details.ip}) have been temporarily restricted for 15 minutes.</p>
          </div>

          <p style="margin: 0; font-size: 13px; color: #6b7280;">Time: ${details.time} | IP: ${details.ip}</p>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          &copy; 2026 Smart Ledger Financial Systems. All rights reserved.
        </div>
      </div>
    </div>
  `;
  return sendResendEmail(to, subject, html);
}

// 5. Test Email Template
export async function sendTestSecurityEmail(to: string) {
  const subject = 'Test Security Alert - Smart Ledger';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 30px 20px; color: #1f2937;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Smart Ledger Test Email</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Resend API Integration Verified</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">Hello,</p>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.5;">Congratulations! Your Resend email integration is successfully configured and working correctly.</p>
          
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: 500;">✓ All 4 automated security alert triggers (Successful Login, Password Change, New Device Detection, and Failed Login Lockouts) are active.</p>
          </div>

          <p style="margin: 0; font-size: 13px; color: #6b7280;">Dispatched via Resend (onboarding@resend.dev)</p>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          &copy; 2026 Smart Ledger Financial Systems. All rights reserved.
        </div>
      </div>
    </div>
  `;
  return sendResendEmail(to, subject, html);
}

// 6. Bank-Grade Admin MFA Verification Code Email
export async function sendAdminMfaEmail(
  to: string, 
  details: { 
    code: string; 
    expiresMinutes?: number; 
    ip: string; 
    device?: string; 
    browser?: string;
    location?: string;
  }
) {
  const subject = `🔐 ${details.code} is your SmartLedgerX Admin Verification Code`;
  const codeFormatted = details.code.split('').join(' ');
  const expires = details.expiresMinutes || 5;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; padding: 40px 20px; color: #f1f5f9;">
      <div style="max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; padding: 8px 16px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
            Bank-Grade Multi-Factor Authentication
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SmartLedgerX Admin Portal</h1>
          <p style="margin: 8px 0 0; font-size: 14px; color: #dbeafe;">Administrative Session Verification</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 32px;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
            A sign-in attempt was detected for your SmartLedgerX Administrator account. Use the one-time verification code below to authorize your administrative session:
          </p>
          
          <!-- Code Card -->
          <div style="background: #0f172a; border: 2px solid #3b82f6; border-radius: 16px; padding: 28px 20px; text-align: center; margin: 28px 0;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700; margin-bottom: 10px;">
              One-Time Verification Code
            </div>
            <div style="font-family: 'SF Mono', 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #60a5fa; text-shadow: 0 0 20px rgba(59,130,246,0.4); padding-left: 12px;">
              ${details.code}
            </div>
            <div style="margin-top: 14px; font-size: 12px; color: #f59e0b; font-weight: 600;">
              ⏱️ Expires in ${expires} minutes &bull; Single-use authorization
            </div>
          </div>

          <!-- Session Metadata -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
            <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              Session Verification Context
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; width: 35%;">IP Address:</td>
                <td style="padding: 6px 0; color: #f8fafc; font-weight: 600; font-family: monospace;">${details.ip}</td>
              </tr>
              ${details.device ? `
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Device / OS:</td>
                <td style="padding: 6px 0; color: #f8fafc; font-weight: 600;">${details.device}</td>
              </tr>` : ''}
              ${details.browser ? `
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Browser:</td>
                <td style="padding: 6px 0; color: #f8fafc; font-weight: 600;">${details.browser}</td>
              </tr>` : ''}
              ${details.location ? `
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Location:</td>
                <td style="padding: 6px 0; color: #f8fafc; font-weight: 600;">${details.location}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #fca5a5; line-height: 1.5;">
              <strong>Security Protocol:</strong> Never share this verification code with anyone. SmartLedgerX engineers and administrators will never request this code. If you did not initiate this login, trigger an Emergency Lockdown immediately.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #1f2937; font-size: 11px; color: #64748b;">
          &copy; 2026 SmartLedgerX Financial Systems &bull; Bank-Grade Multi-Factor Authentication
        </div>
      </div>
    </div>
  `;
  return sendResendEmail(to, subject, html);
}

