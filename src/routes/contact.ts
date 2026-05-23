import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { query } from '../db/pool';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const BRAND_NAME  = 'Manikya Money Service Pvt. Ltd.';
const BRAND_COLOR = '#1a3a5c';
const BRAND_ACCENT= '#f59e0b';

// ── Admin emails that receive every enquiry ───────────────────
const ADMIN_EMAILS = [
  'manikyamoneyservices@gmail.com',
  'newsjunctiondigital@gmail.com',
];

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

// ── Email wrapper ─────────────────────────────────────────────
function emailWrapper(content: string): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:40px 0;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="background:${BRAND_COLOR};padding:24px 32px">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">${BRAND_NAME}</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">Trusted Financial Services</p>
        </div>
        <div style="padding:32px">${content}</div>
        <div style="background:#f1f5f9;padding:18px 32px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">
            © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br/>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;
}

// ── Send notification to both admin emails ────────────────────
async function sendAdminNotification(lead: {
  name: string; email?: string; phone?: string;
  interest?: string; message: string; id: string;
}) {
  const transporter = getTransporter();
  const interestLine = lead.interest
    ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9">Service Interest</td><td style="padding:8px 12px;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9">${lead.interest}</td></tr>`
    : '';

  const html = emailWrapper(`
    <div style="display:inline-block;padding:6px 14px;background:#fef3c7;border:1px solid #f59e0b;border-radius:20px;margin-bottom:20px">
      <span style="color:#92400e;font-size:13px;font-weight:700">🔔 New Enquiry Received</span>
    </div>
    <p style="color:#475569;font-size:15px;margin:0 0 20px">A new contact form submission has been received on your website.</p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
      <tr style="background:#f8fafc">
        <td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;width:40%">Name</td>
        <td style="padding:8px 12px;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9">${lead.name}</td>
      </tr>
      ${lead.email ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9">Email</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f1f5f9"><a href="mailto:${lead.email}" style="color:#1d4ed8">${lead.email}</a></td></tr>` : ''}
      ${lead.phone ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9">Phone</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f1f5f9"><a href="tel:${lead.phone}" style="color:#1d4ed8">${lead.phone}</a></td></tr>` : ''}
      ${interestLine}
      <tr>
        <td style="padding:8px 12px;color:#64748b;font-size:14px;vertical-align:top">Message</td>
        <td style="padding:8px 12px;font-size:14px">${lead.message}</td>
      </tr>
    </table>

    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${lead.email ? `<a href="mailto:${lead.email}?subject=Re: Your enquiry at ${BRAND_NAME}&body=Dear ${lead.name},%0A%0AThank you for contacting us.%0A%0ARegards,%0A${BRAND_NAME}" style="display:inline-block;padding:12px 24px;background:${BRAND_COLOR};color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Reply via Email</a>` : ''}
      ${lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/\D/g,'')}?text=Hello ${encodeURIComponent(lead.name)}, thank you for contacting ${encodeURIComponent(BRAND_NAME)}." style="display:inline-block;padding:12px 24px;background:#22c55e;color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Reply on WhatsApp</a>` : ''}
    </div>
  `);

  await transporter.sendMail({
    from:    `"${BRAND_NAME}" <${process.env.SMTP_USER}>`,
    to:      ADMIN_EMAILS.join(', '),
    subject: `🔔 New Enquiry from ${lead.name}${lead.interest ? ` — ${lead.interest}` : ''}`,
    html,
  });
}

// ── Send confirmation to customer ─────────────────────────────
async function sendCustomerConfirmation(lead: {
  name: string; email: string; interest?: string;
}) {
  const transporter = getTransporter();

  const html = emailWrapper(`
    <p style="color:#475569;font-size:15px;margin:0 0 6px">Dear <strong>${lead.name}</strong>,</p>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">
      Thank you for reaching out to us. We have received your enquiry and our team will get back to you within <strong>24 hours</strong>.
    </p>

    <div style="background:#f8fafc;border-left:4px solid ${BRAND_ACCENT};padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px">
      <p style="margin:0;color:#475569;font-size:14px">
        ${lead.interest ? `You enquired about: <strong>${lead.interest}</strong><br/><br/>` : ''}
        If you need immediate assistance, please contact us directly:
      </p>
      <p style="margin:12px 0 0;font-size:14px">
        📞 <a href="tel:+917411642999" style="color:#1d4ed8;text-decoration:none">+91 74116 42999</a> &nbsp;|&nbsp;
        📞 <a href="tel:+917411742999" style="color:#1d4ed8;text-decoration:none">+91 74117 42999</a>
      </p>
      <p style="margin:8px 0 0;font-size:14px">
        💬 <a href="https://wa.me/917411642999" style="color:#22c55e;text-decoration:none;font-weight:600">Chat with us on WhatsApp</a>
      </p>
    </div>

    <p style="color:#64748b;font-size:13px;margin:0">
      📍 #215, MGES, 2nd Floor, 5th Main Road, RPC Layout, Hampi Nagar, Bengaluru – 560104
    </p>
  `);

  await transporter.sendMail({
    from:    `"${BRAND_NAME}" <${process.env.SMTP_USER}>`,
    to:      lead.email,
    subject: `Thank you for contacting ${BRAND_NAME}`,
    html,
  });
}

// ── POST /api/contact  (public) ───────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { name, email, phone, interest, message } = req.body;

  if (!name || !message || (!email && !phone)) {
    res.status(400).json({ error: 'name, message, and email or phone are required' });
    return;
  }

  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO contact_leads (name, email, phone, interest, message, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, email || null, phone || null, interest || null, message, req.ip]
    );

    const leadId = rows[0].id;

    // ── Send emails (non-blocking — don't fail the request if email fails) ──
    Promise.allSettled([
      // 1. Notify both admin emails
      sendAdminNotification({ name, email, phone, interest, message, id: leadId }),
      // 2. Confirmation to customer (only if they gave an email)
      ...(email ? [sendCustomerConfirmation({ name, email, interest })] : []),
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`Email ${i} failed:`, r.reason);
      });
    });

    res.status(201).json({ message: 'Thank you! We will get in touch soon.', id: leadId });
  } catch (err) {
    console.error('contact insert error:', err);
    res.status(500).json({ error: 'Failed to save your message. Please try again.' });
  }
});

// ── GET /api/contact (admin) ──────────────────────────────────
router.get('/', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT id, name, email, phone, interest, message, status, ip_address, created_at
     FROM contact_leads
     ORDER BY created_at DESC`
  );
  res.json(rows);
});

// ── PATCH /api/contact/:id/status (admin) ────────────────────
router.patch('/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['new', 'contacted', 'closed'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }
  await query(
    `UPDATE contact_leads SET status = $1 WHERE id = $2`,
    [status, req.params.id]
  );
  res.json({ message: 'Status updated' });
});

// ── DELETE /api/contact/:id (admin) ──────────────────────────
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM contact_leads WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Lead deleted' });
});

export default router;
