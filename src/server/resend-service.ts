import { Resend } from 'resend';

export async function sendResendEmail(to: string | string[], subject: string, htmlContent: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[ResendService] RESEND_API_KEY is not set in environment variables. Email dispatch skipped.');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  try {
    const resend = new Resend(apiKey);
    const recipients = Array.isArray(to) ? to : [to];
    
    // Attempt sending
    const response = await resend.emails.send({
      from: 'Smart Ledger Security <onboarding@resend.dev>',
      to: recipients,
      subject,
      html: htmlContent,
    });

    if (response.error) {
      console.warn(`[ResendService] Resend API response error:`, response.error);
      
      // If batch sending failed due to unverified domain / test account restrictions,
      // try sending individually to each recipient so valid account emails still receive it
      if (recipients.length > 1) {
        let sentCount = 0;
        for (const recipient of recipients) {
          try {
            const singleRes = await resend.emails.send({
              from: 'Smart Ledger Security <onboarding@resend.dev>',
              to: [recipient],
              subject,
              html: htmlContent,
            });
            if (!singleRes.error) {
              sentCount++;
              console.log(`[ResendService] Individual email sent to ${recipient}`);
            }
          } catch (e) {}
        }
        if (sentCount > 0) {
          return { success: true, message: `Sent to ${sentCount} recipient(s)` };
        }
      }

      return { success: false, error: response.error.message || response.error.name };
    }

    console.log(`[ResendService] Email successfully sent to ${recipients.join(', ')} | Subject: "${subject}"`, response.data);
    return { success: true, response: response.data };
  } catch (error: any) {
    const errorMsg = error?.message || error?.response?.message || JSON.stringify(error) || 'Unknown Resend error';
    console.error(`[ResendService] Failed to send email via Resend:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// 1. Successful Login Alert (OAuth / Google Login / Password)
export async function sendLoginSuccessEmail(
  to: string | string[], 
  details: { 
    userName?: string;
    userEmail?: string;
    method?: string;
    time: string; 
    device: string; 
    browser: string; 
    location: string; 
    ip: string;
  }
) {
  const displayName = details.userName || 'Account Owner';
  const displayEmail = details.userEmail || (Array.isArray(to) ? to[0] : to);
  const subject = `Security Alert: New Sign-in to Smart Ledger (${displayName})`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0f1c; padding: 32px 16px; color: #e2e8f0;">
      <div style="max-width: 580px; margin: 0 auto; background: #131728; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        {/* Brand Header */}
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 28px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; padding: 8px 14px; background: rgba(255,255,255,0.15); border-radius: 30px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">
            Smart Ledger X Security
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">New Login Notification</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Sign-in event detected for your account</p>
        </div>

        {/* Content Body */}
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 12px; font-size: 16px; color: #f8fafc; font-weight: 600;">
            Hello ${displayName},
          </p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            A new successful login was verified for your account on <strong>Smart Ledger X</strong>. The session details are provided below for your verification:
          </p>
          
          <div style="background: #181d33; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 9px 0; color: #64748b; width: 38%; font-size: 13px;">User:</td>
                <td style="padding: 9px 0; color: #f1f5f9; font-weight: 600;">${displayName}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">Email:</td>
                <td style="padding: 9px 0; color: #818cf8; font-weight: 600;">${displayEmail}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">Auth Method:</td>
                <td style="padding: 9px 0; color: #34d399; font-weight: 600;">${details.method || 'Google Sign-In (OAuth)'}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">Time (IST):</td>
                <td style="padding: 9px 0; color: #f1f5f9; font-weight: 600;">${details.time}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">Device / OS:</td>
                <td style="padding: 9px 0; color: #f1f5f9; font-weight: 600;">${details.device}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">Browser:</td>
                <td style="padding: 9px 0; color: #f1f5f9; font-weight: 600;">${details.browser}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">IP Address:</td>
                <td style="padding: 9px 0; color: #cbd5e1; font-weight: 600; font-family: monospace;">${details.ip}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0; color: #64748b; font-size: 13px;">Location:</td>
                <td style="padding: 9px 0; color: #cbd5e1; font-weight: 600;">${details.location}</td>
              </tr>
            </table>
          </div>

          <div style="background: rgba(99,102,241,0.08); border-left: 3px solid #6366f1; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
              <strong>Was this you?</strong> If you recently signed in, you can safely ignore this notification.
            </p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #ef4444; line-height: 1.4;">
              <strong>Didn't log in?</strong> If you did not authorize this access, please immediately change your Google password and revoke active sessions in your Security Dashboard.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style="background: #0f1220; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #64748b;">
          This automated security notification was sent by Smart Ledger X.
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
