import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetUrl - Password reset URL with selector and token
 * @param {string} firstName - User's first name
 */
export async function sendPasswordResetEmail(to, resetUrl, firstName) {
  try {
    const emailFrom = process.env.EMAIL_FROM || 'Buildstate <no-reply@buildtstate.com.au>';

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: to,
      subject: 'Reset Your Buildstate Password',
      html: generatePasswordResetEmailHTML(firstName, resetUrl),
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

/**
 * Generate HTML content for password reset email
 */
function generatePasswordResetEmailHTML(firstName, resetUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 10px;
    }
    h1 {
      color: #333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 15px;
      color: #555;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #1976d2;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #1565c0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .link {
      word-break: break-all;
      color: #1976d2;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Buildstate</div>
    </div>

    <h1>Reset Your Password</h1>

    <p>Hi ${firstName},</p>

    <p>We received a request to reset your password for your Buildstate account. Click the button below to create a new password:</p>

    <div class="button-container">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>

    <p>Or copy and paste this link into your browser:</p>
    <p class="link">${resetUrl}</p>

    <div class="warning">
      <strong>Important:</strong> This link will expire in 20 minutes for security reasons. If you didn't request a password reset, you can safely ignore this email.
    </div>

    <p>For security reasons, this password reset link can only be used once.</p>

    <div class="footer">
      <p>This is an automated email from Buildstate. Please do not reply to this message.</p>
      <p>&copy; ${new Date().getFullYear()} Buildstate. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
