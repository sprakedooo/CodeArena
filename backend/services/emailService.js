/**
 * emailService.js
 * Nodemailer wrapper for sending OTP verification emails.
 */

const nodemailer = require('nodemailer');

// ─── Transporter (Gmail SMTP) ─────────────────────────────────────────────────
let _transporter = null;
function getTransporter() {
    if (!_transporter) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('EMAIL_USER and EMAIL_PASS must be set in your .env file.');
        }
        _transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    return _transporter;
}

// ─── Generate a 6-digit OTP ───────────────────────────────────────────────────
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Send OTP email ───────────────────────────────────────────────────────────
async function sendOTPEmail(toEmail, fullName, otp) {
    const transporter = getTransporter();

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:28px;text-align:center;">
                <div style="font-family:monospace;font-size:1.1rem;color:#fff;font-weight:700;letter-spacing:1px;">
                  &lt;<span style="color:#a78bfa;">Code</span><span style="color:#fff;">Arena</span>/&gt;
                </div>
                <div style="color:rgba(255,255,255,0.8);font-size:0.85rem;margin-top:4px;">Email Verification</div>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="color:#e6edf3;font-size:0.95rem;margin:0 0 8px;">Hi <strong>${fullName || 'there'}</strong>,</p>
                <p style="color:#8b949e;font-size:0.88rem;margin:0 0 28px;line-height:1.6;">
                  Welcome to CodeArena! Use the code below to verify your email address.
                  This code expires in <strong style="color:#e6edf3;">10 minutes</strong>.
                </p>

                <!-- OTP Box -->
                <div style="background:#0d1117;border:1px solid #7c3aed;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                  <div style="font-family:monospace;font-size:2.4rem;font-weight:700;letter-spacing:10px;color:#a78bfa;">
                    ${otp}
                  </div>
                </div>

                <p style="color:#8b949e;font-size:0.8rem;margin:0;line-height:1.6;">
                  If you didn't create a CodeArena account, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#0d1117;padding:16px;text-align:center;border-top:1px solid #30363d;">
                <span style="color:#484f58;font-size:0.75rem;">© 2025 CodeArena · AI-Powered Learning</span>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    await transporter.sendMail({
        from: `"CodeArena" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `${otp} is your CodeArena verification code`,
        html,
    });
}

module.exports = { generateOTP, sendOTPEmail };
