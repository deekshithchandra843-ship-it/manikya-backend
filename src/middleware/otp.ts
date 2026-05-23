import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { query } from '../db/pool';

const BRAND_NAME = 'Manikya Money Service Pvt. Ltd.';
const BRAND_COLOR = '#1a3a5c';
const BRAND_ACCENT = '#f59e0b';

// ── Generate a 6-digit OTP ────────────────────────────────────
export function generateOTP(): string {
  return String(crypto.randomInt(100000, 999999));
}

// ── Generate a secure token ───────────────────────────────────
export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ── Save token to DB ─────────────────────────────────────────
export async function saveOTP(
  identifier: string,
  method: 'email' | 'phone',
  type: 'otp' | 'magic_link',
  token: string
): Promise<void> {
  const expiresMin = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
  await query(
    `INSERT INTO otp_tokens (identifier, method, type, token, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + $5::interval)`,
    [identifier, method, type, token, `${expiresMin} minutes`]
  );
}

// ── Verify OTP from DB ────────────────────────────────────────
export async function verifyOTPToken(
  identifier: string,
  token: string
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM otp_tokens
     WHERE identifier = $1
       AND token      = $2
       AND used       = FALSE
       AND expires_at > NOW()
     LIMIT 1`,
    [identifier, token]
  );
  if (rows.length === 0) return false;
  await query(`UPDATE otp_tokens SET used = TRUE WHERE id = $1`, [rows[0].id]);
  return true;
}

// ── Nodemailer transporter ────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Shared email wrapper ──────────────────────────────────────
function emailWrapper(content: string): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:40px 0;min-height:100vh">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <div style="background:${BRAND_COLOR};padding:28px 32px">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px">${BRAND_NAME}</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">Trusted Financial Services</p>
        </div>

        <!-- Body -->
        <div style="padding:32px">
          ${content}
        </div>

        <!-- Footer -->
        <div style="background:#f1f5f9;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">
            © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br/>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>

      </div>
    </div>
  `;
}

// ── Send OTP email ────────────────────────────────────────────
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const expiresMin = process.env.OTP_EXPIRES_MINUTES || 10;
  const transporter = getTransporter();

  await transporter.sendMail({
    from:    `"${BRAND_NAME}" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Your verification code: ${otp}`,
    html: emailWrapper(`
      <p style="margin:0 0 8px;color:#475569;font-size:15px">Hello,</p>
      <p style="margin:0 0 24px;color:#475569;font-size:15px">
        Use the code below to verify your identity. Do not share this code with anyone.
      </p>

      <div style="background:#f8fafc;border:2px dashed ${BRAND_ACCENT};border-radius:10px;padding:24px;text-align:center;margin:0 0 24px">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;letter-spacing:1px;text-transform:uppercase">Your verification code</p>
        <div style="font-size:42px;font-weight:800;letter-spacing:16px;color:${BRAND_COLOR};font-family:monospace">${otp}</div>
      </div>

      <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center">
        This code is valid for <strong>${expiresMin} minutes</strong> only.
      </p>
    `),
  });
}

// ── Send sign-in link email ───────────────────────────────────
export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/auth/verify-otp?magic=${token}&email=${encodeURIComponent(email)}`;
  const expiresMin = process.env.OTP_EXPIRES_MINUTES || 10;
  const transporter = getTransporter();

  await transporter.sendMail({
    from:    `"${BRAND_NAME}" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Sign in to your ${BRAND_NAME} account`,
    html: emailWrapper(`
      <p style="margin:0 0 8px;color:#475569;font-size:15px">Hello,</p>
      <p style="margin:0 0 28px;color:#475569;font-size:15px">
        We received a request to sign in to your account. Click the button below to continue.
      </p>

      <div style="text-align:center;margin:0 0 28px">
        <a href="${link}"
           style="display:inline-block;padding:16px 36px;background:${BRAND_ACCENT};color:#000000;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px">
          Sign In to Your Account
        </a>
      </div>

      <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-align:center">
        This link is valid for <strong>${expiresMin} minutes</strong> only.
      </p>
      <p style="margin:0;color:#cbd5e1;font-size:12px;text-align:center">
        If you did not request this, please ignore this email. Your account remains secure.
      </p>
    `),
  });
}

// ── Send OTP via SMS (Twilio) ─────────────────────────────────
export async function sendOTPSMS(phone: string, otp: string): Promise<void> {
  const expiresMin = process.env.OTP_EXPIRES_MINUTES || 10;

  const twilio = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await twilio.messages.create({
    body: `${otp} is your ${BRAND_NAME} verification code. Valid for ${expiresMin} minutes. Do not share this code with anyone.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to:   phone,
  });
}
