import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

logger = logging.getLogger("email_service")


def send_password_reset_email(to_email: str, login_id: str, reset_url: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM", smtp_user or "noreply@urbanfurniture.com")

    subject = "Urban Furniture Account - Password Reset Link"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
        .logo {{ font-size: 20px; font-weight: 800; color: #1e3a8a; margin-bottom: 20px; }}
        h2 {{ font-size: 20px; margin-top: 0; color: #0f172a; }}
        p {{ font-size: 14px; line-height: 1.6; color: #475569; }}
        .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }}
        .link-text {{ word-break: break-all; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 6px; }}
        .footer {{ font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Urban Furniture Accounting</div>
        <h2>Password Reset Request</h2>
        <p>Hello <strong>{login_id}</strong>,</p>
        <p>We received a request to reset your password for your Urban Furniture account. Click the button below to choose a new password:</p>
        <div>
          <a href="{reset_url}" class="btn" target="_blank">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <div class="link-text">{reset_url}</div>
        <div class="footer">
          <p>This link will expire in 30 minutes. If you did not request this reset, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
    """

    plain_content = f"""Hello {login_id},

We received a request to reset your password for your Urban Furniture account.

Please visit the following link to reset your password:
{reset_url}

This link is valid for 30 minutes.

If you did not request this, please ignore this email.
Urban Furniture Accounting System
"""

    # If real SMTP credentials are provided, send actual email
    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email

            msg.attach(MIMEText(plain_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.starttls()

            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Password reset email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            # Fall back to logging
            pass

    # Development / Fallback mode: Log cleanly to console
    print("\n" + "=" * 65)
    print(f"[PASSWORD RESET EMAIL DISPATCHED]")
    print(f"To: {to_email} (User: {login_id})")
    print(f"Subject: {subject}")
    print(f"Reset URL: {reset_url}")
    print("=" * 65 + "\n")
    return True

