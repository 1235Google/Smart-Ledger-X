import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import cron from "node-cron";
import { Resend } from "resend";
import { generateAndSendReport } from "./src/server/report-generator";
import { 
  hashPassword, 
  getStoredHash, 
  updateStoredHash, 
  checkRateLimit, 
  recordFailedAttempt, 
  resetFailedAttempts, 
  createSessionToken, 
  verifySessionToken, 
  invalidateSessionToken 
} from "./src/server/admin-auth";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

// Load environment variables from .env file
dotenv.config();


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Centralized Admin Authentication API Endpoints ---
  app.post("/api/admin/login", (req, res) => {
    try {
      const { password } = req.body;
      const clientIp = (req.ip || req.headers['x-forwarded-for'] || 'default_client') as string;

      // Check rate limit
      const rateLimitStatus = checkRateLimit(clientIp);
      if (rateLimitStatus.locked) {
        return res.status(429).json({
          success: false,
          error: "Too many failed attempts. Login locked for 5 minutes."
        });
      }

      if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({
          success: false,
          error: "Please enter the admin password."
        });
      }

      const inputHash = hashPassword(password.trim());
      const currentHash = getStoredHash();

      if (inputHash === currentHash) {
        resetFailedAttempts(clientIp);
        const token = createSessionToken();
        return res.json({
          success: true,
          token,
          message: "Admin authenticated successfully."
        });
      } else {
        const attemptResult = recordFailedAttempt(clientIp);
        if (attemptResult.locked) {
          return res.status(429).json({
            success: false,
            error: "Too many failed attempts. Login locked for 5 minutes."
          });
        } else {
          return res.status(401).json({
            success: false,
            error: "Invalid Admin Password"
          });
        }
      }
    } catch (err: any) {
      console.error("[AdminAuth] Login error:", err);
      return res.status(500).json({ success: false, error: "An internal server error occurred." });
    }
  });

  app.post("/api/admin/change-password", (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: "Missing required fields." });
      }

      const cPass = currentPassword.trim();
      const nPass = newPassword.trim();

      const inputHash = hashPassword(cPass);
      const currentHash = getStoredHash();

      if (inputHash !== currentHash) {
        return res.status(401).json({ success: false, error: "Current password is incorrect." });
      }

      // Password Validation Rules
      if (nPass.length < 8) {
        return res.status(400).json({ success: false, error: "Password must be at least 8 characters long." });
      }
      if (!/[A-Z]/.test(nPass)) {
        return res.status(400).json({ success: false, error: "Password must contain at least one uppercase letter." });
      }
      if (!/[a-z]/.test(nPass)) {
        return res.status(400).json({ success: false, error: "Password must contain at least one lowercase letter." });
      }
      if (!/[0-9]/.test(nPass)) {
        return res.status(400).json({ success: false, error: "Password must contain at least one number." });
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nPass)) {
        return res.status(400).json({ success: false, error: "Password must contain at least one special character." });
      }
      if (nPass === cPass) {
        return res.status(400).json({ success: false, error: "New password cannot be the same as current password." });
      }

      const newHash = hashPassword(nPass);
      updateStoredHash(newHash);

      return res.json({ success: true, message: "Password updated successfully." });
    } catch (err: any) {
      console.error("[AdminAuth] Change password error:", err);
      return res.status(500).json({ success: false, error: "An internal server error occurred." });
    }
  });

  app.post("/api/admin/verify-session", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = req.body?.token || (authHeader ? authHeader.replace("Bearer ", "") : "");
    const isValid = verifySessionToken(token);
    return res.json({ valid: isValid });
  });

  app.post("/api/admin/logout", (req, res) => {
    const { token } = req.body;
    if (token) invalidateSessionToken(token);
    return res.json({ success: true });
  });

  // WebAuthn state storage (in-memory for this stateless demo)
  const userChallenges: { [userId: string]: string } = {};
  const rpName = 'SmartLedger';
  
  app.post("/api/webauthn/generate-registration-options", async (req, res) => {
    try {
      const { userId, userName } = req.body;
      const expectedRPID = process.env.NODE_ENV === 'production' ? 'smartledgerx.vercel.app' : (req.headers.host?.split(':')[0] || 'localhost');
      
      const options = await generateRegistrationOptions({
        rpName,
        rpID: expectedRPID,
        userID: new Uint8Array(Buffer.from(userId)),
        userName: userName,
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials: [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
      });
      
      userChallenges[userId] = options.challenge;
      res.json(options);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webauthn/verify-registration", async (req, res) => {
    try {
      const { userId, response } = req.body;
      const expectedChallenge = userChallenges[userId];
      
      if (!expectedChallenge) {
        return res.status(400).json({ error: "Challenge not found" });
      }

      const expectedOrigin = req.headers.origin!;
      const expectedRPID = process.env.NODE_ENV === 'production' ? 'smartledgerx.vercel.app' : (req.headers.host?.split(':')[0] || 'localhost');

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
      });
      
      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        delete userChallenges[userId];
        res.json({
          verified: true,
          credential: {
            id: Buffer.from(credential.id).toString('base64url'),
            publicKey: Buffer.from(credential.publicKey).toString('base64url')
          }
        });
      } else {
        console.warn(`[WebAuthn] Registration verification failed for userId: ${userId}`);
        res.json({ verified: false });
      }
    } catch (error: any) {
      console.error(`[WebAuthn] Registration verification error for userId: ${req.body.userId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webauthn/generate-authentication-options", async (req, res) => {
    try {
      const { userId, allowCredentials } = req.body;
      const expectedRPID = process.env.NODE_ENV === 'production' ? 'smartledgerx.vercel.app' : (req.headers.host?.split(':')[0] || 'localhost');
      
      const options = await generateAuthenticationOptions({
        rpID: expectedRPID,
        timeout: 60000,
        allowCredentials: allowCredentials.map((cred: any) => ({
          id: Uint8Array.from(Buffer.from(cred.id, 'base64url')),
          type: 'public-key',
          transports: cred.transports,
        })),
        userVerification: 'required',
      });
      
      userChallenges[userId] = options.challenge;
      res.json(options);
    } catch (error: any) {
      console.error(`[WebAuthn] Authentication options generation error for userId: ${req.body.userId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webauthn/verify-authentication", async (req, res) => {
    try {
      const { userId, response, authenticator } = req.body;
      const expectedChallenge = userChallenges[userId];
      
      if (!expectedChallenge) {
        return res.status(400).json({ error: "Challenge not found" });
      }

      const expectedOrigin = req.headers.origin!;
      const expectedRPID = process.env.NODE_ENV === 'production' ? 'smartledgerx.vercel.app' : (req.headers.host?.split(':')[0] || 'localhost');

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        credential: {
          id: authenticator.id,
          publicKey: Uint8Array.from(Buffer.from(authenticator.publicKey, 'base64url')),
          counter: 0,
        }
      });
      
      if (verification.verified) {
        delete userChallenges[userId];
        res.json({ verified: true });
      } else {
        console.warn(`[WebAuthn] Authentication verification failed for userId: ${userId}`);
        res.json({ verified: false });
      }
    } catch (error: any) {
      console.error(`[WebAuthn] Authentication verification error for userId: ${req.body.userId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // API route for xAI Grok chatbot
  app.post("/api/send-monthly-report", async (req, res) => {
    try {
      console.log("Starting email request for monthly report...");
      const { 
        email, 
        month, 
        currentBalance, 
        incomeThisMonth, 
        highestPaymentReceived, 
        numberOfIncomeTransactions, 
        aiSummary 
      } = req.body;
      
      if (!email || !month || currentBalance === undefined || incomeThisMonth === undefined) {
        res.status(400).json({ error: "Missing required fields." });
        return;
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("Missing RESEND_API_KEY in environment variables.");
        res.status(500).json({ error: "Email provider is not configured. Missing RESEND_API_KEY." });
        return;
      }

      console.log("Connecting to Resend provider...");
      const resend = new Resend(resendApiKey);

      const formattedIncome = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(incomeThisMonth);

      const formattedBalance = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(currentBalance);

      const generatedDateTime = new Date().toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const highestPaymentHtml = highestPaymentReceived ? `
        <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 16px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Highest Payment Received</h3>
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <div>
              <p style="margin: 0; color: #0f172a; font-weight: 600; font-size: 18px;">${highestPaymentReceived.personName}</p>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Received on ${highestPaymentReceived.dateReceived}</p>
            </div>
            <p style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(highestPaymentReceived.amount)}</p>
          </div>
        </div>
      ` : `
        <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 16px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Highest Payment Received</h3>
          <p style="margin: 0; color: #94a3b8; font-size: 15px;">No payments received this month.</p>
        </div>
      `;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; border-radius: 0 !important; }
              .content { padding: 20px !important; }
              .stats-grid { display: block !important; }
              .stat-card { width: 100% !important; box-sizing: border-box !important; margin-bottom: 16px !important; }
              .stat-card:last-child { margin-bottom: 0 !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table class="container" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border-collapse: collapse;">
            <tr>
              <td style="padding: 0;">
                
                <!-- HEADER -->
                <div style="background-color: #2563eb; padding: 40px 32px; text-align: left;">
                  <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">SmartLedger</h1>
                  <h2 style="color: #93c5fd; margin: 0 0 24px; font-size: 18px; font-weight: 400;">Monthly Financial Report</h2>
                  
                  <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px 16px; display: inline-block;">
                    <p style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 500;">Reporting Period: ${month}</p>
                  </div>
                  <p style="color: #bfdbfe; margin: 16px 0 0; font-size: 12px;">Generated: ${generatedDateTime}</p>
                </div>

                <!-- CONTENT -->
                <div class="content" style="padding: 40px 32px; background-color: #f8fafc;">
                  
                  <h2 style="margin: 0 0 24px; color: #0f172a; font-size: 20px; font-weight: 600;">Financial Summary</h2>

                  <!-- GRID STATS -->
                  <table class="stats-grid" style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px;">
                    <tr>
                      <td class="stat-card" style="width: 48%; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; vertical-align: top;">
                        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Current Balance</p>
                        <p style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">${formattedBalance}</p>
                      </td>
                      <td style="width: 4%;"></td>
                      <td class="stat-card" style="width: 48%; background-color: #eff6ff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #bfdbfe; vertical-align: top;">
                        <p style="margin: 0 0 8px; color: #1e40af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Income This Month</p>
                        <p style="margin: 0; color: #1d4ed8; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">${formattedIncome}</p>
                      </td>
                    </tr>
                  </table>

                  ${highestPaymentHtml}

                  <h2 style="margin: 32px 0 24px; color: #0f172a; font-size: 20px; font-weight: 600;">Quick Summary</h2>
                  
                  <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 15px;">Current Balance</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;">${formattedBalance}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 15px;">Income This Month</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;">${formattedIncome}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 15px;">Highest Payment</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;">${highestPaymentReceived ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(highestPaymentReceived.amount) : '-'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: #475569; font-size: 15px;">Number of Income Transactions</td>
                        <td style="padding: 12px 0; color: #0f172a; font-size: 15px; font-weight: 600; text-align: right;">${numberOfIncomeTransactions}</td>
                      </tr>
                    </table>
                  </div>

                  <h2 style="margin: 32px 0 24px; color: #0f172a; font-size: 20px; font-weight: 600;">AI Summary</h2>
                  <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0; color: #334155; font-size: 16px; line-height: 1.6;">
                      ${aiSummary}
                    </p>
                  </div>

                </div>

                <!-- FOOTER -->
                <div style="background-color: #ffffff; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">This report was automatically generated by SmartLedger.</p>
                  <p style="margin: 0 0 24px; color: #64748b; font-size: 14px;">No action is required.</p>
                  <p style="margin: 0 0 16px; color: #0f172a; font-size: 15px; font-weight: 500;">Thank you for using SmartLedger.</p>
                  <p style="margin: 0; color: #94a3b8; font-size: 13px;">&copy; 2026 SmartLedger</p>
                </div>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const domains = await resend.domains.list();
      const domainList = Array.isArray(domains.data) ? domains.data : (domains.data?.data || []);
      const verifiedDomain = domainList.find((d: any) => d.status === 'verified');
      
      let fromAddress = "SmartLedger <onboarding@resend.dev>";
      let finalToAddress = email;
      
      if (verifiedDomain) {
        fromAddress = `SmartLedger <updates@${verifiedDomain.name}>`;
      } else {
        // Testing mode override
        finalToAddress = process.env.RESEND_OWNER_EMAIL || "souvikdashbbsr@gmail.com";
      }

      console.log(`Sending HTML email to ${finalToAddress}...`);
      const data = await resend.emails.send({
        from: fromAddress,
        to: finalToAddress,
        subject: `SmartLedger Monthly Financial Report - ${month}`,
        html: htmlContent,
      });

      if (data.error) {
        console.error("Provider Response Error:", data.error);
        let errorMsg = data.error.message;
        if (errorMsg.includes("verify") || errorMsg.includes("onboarding")) {
          errorMsg = "Domain verification issue. Ensure your domain is verified on Resend, or test using the verified owner's email address.";
        }
        res.status(400).json({ error: errorMsg });
        return;
      }

      console.log("Email delivery successful! Message ID:", data.data?.id);
      res.json({ success: true, messageId: data.data?.id });
    } catch (error: any) {
      console.error("Email Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while sending the email." });
    }
  });

  app.post("/api/generate-business-report", async (req, res) => {
    try {
      const { email, month, transactions, customers, includePdf, aiSummary } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Missing email" });
      }
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.status(500).json({ error: "Email provider is not configured" });
      }

      const result = await generateAndSendReport(email, month, transactions || [], customers || [], includePdf, aiSummary, resendApiKey);
      
      if (result.success) {
        return res.json({ success: true, fileSizeXlsx: result.fileSizeXlsx, fileSizePdf: result.fileSizePdf });
      } else {
        let errorMsg = result.error?.message || 'Unknown error';
        if (errorMsg.includes("verify") || errorMsg.includes("onboarding")) {
          errorMsg = "Domain verification issue. Ensure your domain is verified on Resend, or test using the verified owner's email address.";
        }
        return res.status(500).json({ error: errorMsg });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'An error occurred' });
    }
  });

  app.post("/api/verify-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Missing required field: email." });
        return;
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        res.status(500).json({ error: "Email provider is not configured." });
        return;
      }

      const resend = new Resend(resendApiKey);
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="padding: 32px 24px;">
            <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Hello,</p>
            <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Please verify your email address for SmartLedger.</p>
          </div>
        </div>
      `;

      const data = await resend.emails.send({
        from: 'SmartLedger <onboarding@resend.dev>',
        to: email,
        subject: 'Verify your email address for SmartLedger',
        html: htmlContent,
      });

      if (data.error) {
        res.status(500).json({ error: data.error.message });
      } else {
        res.status(200).json({ success: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "An error occurred." });
    }
  });

  app.post("/api/send-test-email", async (req, res) => {
    try {
      console.log("Starting email request for test email...");
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ error: "Missing required field: email." });
        return;
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("Missing RESEND_API_KEY in environment variables.");
        res.status(500).json({ error: "Email provider is not configured. Missing RESEND_API_KEY." });
        return;
      }

      console.log("Connecting to Resend provider...");
      const resend = new Resend(resendApiKey);

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="padding: 32px 24px;">
            <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">Hello,</p>
            <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">This is a test email from SmartLedger.</p>
            <p style="color: #475569; font-size: 16px; margin: 0 0 16px;">If you received this email, the email system is working correctly.</p>
          </div>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">Generated Automatically by SmartLedger.</p>
          </div>
        </div>
      `;

      const domains = await resend.domains.list();
      const domainList = Array.isArray(domains.data) ? domains.data : (domains.data?.data || []);
      const verifiedDomain = domainList.find((d: any) => d.status === 'verified');
      
      let fromAddress = "SmartLedger <onboarding@resend.dev>";
      let finalToAddress = email;
      
      if (verifiedDomain) {
        fromAddress = `SmartLedger <updates@${verifiedDomain.name}>`;
      } else {
        // Testing mode override
        finalToAddress = process.env.RESEND_OWNER_EMAIL || "souvikdashbbsr@gmail.com";
      }

      console.log(`Sending HTML email to ${finalToAddress}...`);
      const data = await resend.emails.send({
        from: fromAddress,
        to: finalToAddress,
        subject: `SmartLedger Test Email`,
        html: htmlContent,
      });

      if (data.error) {
        console.error("Provider Response Error:", data.error);
        let errorMsg = data.error.message;
        if (errorMsg.includes("verify") || errorMsg.includes("onboarding")) {
          errorMsg = "Domain verification issue. Ensure your domain is verified on Resend, or test using the verified owner's email address.";
        }
        res.status(400).json({ error: errorMsg });
        return;
      }

      console.log("Email delivery successful! Message ID:", data.data?.id);
      res.json({ success: true, messageId: data.data?.id });
    } catch (error: any) {
      console.error("Email Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while sending the email." });
    }
  });


  app.get("/api/email-config", async (req, res) => {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.json({ configured: false });
      }
      const resend = new Resend(resendApiKey);
      const domains = await resend.domains.list();
      
      if (domains.error) {
        return res.json({
          configured: true,
          isTestingMode: true,
          fromAddress: "SmartLedger <onboarding@resend.dev>",
          ownerEmail: process.env.RESEND_OWNER_EMAIL || "souvikdashbbsr@gmail.com",
          error: domains.error.message
        });
      }

      const domainList = Array.isArray(domains.data) ? domains.data : (domains.data?.data || []);
      const verifiedDomain = domainList.find((d: any) => d.status === 'verified');

      if (verifiedDomain) {
        res.json({
          configured: true,
          isTestingMode: false,
          fromAddress: `SmartLedger <updates@${verifiedDomain.name}>`
        });
      } else {
        res.json({
          configured: true,
          isTestingMode: true,
          fromAddress: "SmartLedger <onboarding@resend.dev>",
          ownerEmail: process.env.RESEND_OWNER_EMAIL || "souvikdashbbsr@gmail.com"
        });
      }
    } catch (err: any) {
      res.json({ configured: false, error: err.message });
    }
  });

  // Scheduled job: Run at 08:00 AM on the 1st of every month
  cron.schedule('0 8 1 * *', () => {
    console.log("Running scheduled monthly report generation (Cron)...");
    // In a real application, you would query Firebase for all users with emailSettings.enabled = true,
    // calculate their income for the past month, and send the email using transporter.sendMail().
    // For this environment, since we use local storage without a centralized database, the scheduled
    // logic is purely theoretical.
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
