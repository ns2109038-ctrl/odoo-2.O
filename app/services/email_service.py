import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from dotenv import load_dotenv

logger = logging.getLogger("email_service")


def get_smtp_settings():
    load_dotenv(override=True)
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM", smtp_user or "noreply@urbanfurniture.com").strip()
    configured = bool(smtp_host and smtp_user and smtp_password)
    return {
        "configured": configured,
        "smtp_host": smtp_host,
        "smtp_port": smtp_port,
        "smtp_user": smtp_user,
        "smtp_from": from_email,
        "has_password": bool(smtp_password),
    }


def update_smtp_env(
    smtp_host: str,
    smtp_port: int = 587,
    smtp_user: str = "",
    smtp_password: str = None,
    smtp_from: str = None,
) -> bool:
    """
    Safely update SMTP settings directly in .env file and reload environment variables.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(base_dir, ".env")
    if not os.path.exists(env_path):
        env_path = ".env"

    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    keys_to_set = {
        "SMTP_HOST": smtp_host.strip(),
        "SMTP_PORT": str(smtp_port).strip(),
        "SMTP_USER": smtp_user.strip(),
        "SMTP_FROM": (smtp_from or smtp_user or "noreply@urbanfurniture.com").strip(),
    }
    if smtp_password is not None and smtp_password.strip() != "":
        keys_to_set["SMTP_PASSWORD"] = smtp_password.strip()

    updated_keys = set()
    new_lines = []
    for line in lines:
        matched = False
        for k, v in keys_to_set.items():
            if line.startswith(f"{k}=") or line.startswith(f"#{k}="):
                new_lines.append(f"{k}={v}\n")
                updated_keys.add(k)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for k, v in keys_to_set.items():
        if k not in updated_keys:
            new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    load_dotenv(override=True)
    return True


def send_password_reset_email(to_email: str, login_id: str, reset_url: str) -> dict:
    load_dotenv(override=True)
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM", smtp_user or "noreply@urbanfurniture.com").strip()

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
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                server.starttls()

            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Password reset email sent successfully to {to_email}")
            return {
                "success": True,
                "delivered": True,
                "smtp_configured": True,
                "reset_url": reset_url,
                "error": None,
            }
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            # Fallback output
            print("\n" + "=" * 65)
            print(f"[SMTP DELIVERY FAILED]: {e}")
            print(f"To: {to_email} (User: {login_id})")
            print(f"Reset URL: {reset_url}")
            print("=" * 65 + "\n")
            return {
                "success": True,
                "delivered": False,
                "smtp_configured": True,
                "reset_url": reset_url,
                "error": str(e),
            }

    # Fallback / Development mode: Log cleanly to console
    print("\n" + "=" * 65)
    print(f"[PASSWORD RESET EMAIL DISPATCHED - DIRECT LINK READY]")
    print(f"To: {to_email} (User: {login_id})")
    print(f"Subject: {subject}")
    print(f"Reset URL: {reset_url}")
    print("=" * 65 + "\n")
    return {
        "success": True,
        "delivered": False,
        "smtp_configured": False,
        "reset_url": reset_url,
        "error": None,
    }


def test_smtp_connection(
    to_email: str,
    smtp_host: str = None,
    smtp_port: int = None,
    smtp_user: str = None,
    smtp_password: str = None,
    smtp_from: str = None,
) -> dict:
    """
    Test the SMTP configuration by sending a verification test email.
    """
    load_dotenv(override=True)
    host = (smtp_host if smtp_host is not None else os.getenv("SMTP_HOST", "")).strip()
    port = int(smtp_port if smtp_port is not None else os.getenv("SMTP_PORT", "587"))
    user = (smtp_user if smtp_user is not None else os.getenv("SMTP_USER", "")).strip()
    password = (smtp_password if smtp_password is not None else os.getenv("SMTP_PASSWORD", "")).strip()
    from_addr = (smtp_from if smtp_from is not None else os.getenv("SMTP_FROM", user or "noreply@urbanfurniture.com")).strip()

    if not (host and user and password):
        return {
            "success": False,
            "error": "Incomplete SMTP credentials: host, username, and password are required.",
        }

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Urban Furniture - SMTP Email Verification Test"
        msg["From"] = from_addr
        msg["To"] = to_email

        plain_text = f"Congratulations! Your transactional SMTP relay ({host}:{port}) is verified and can deliver emails."
        html_text = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #166534; margin-top: 0;">✓ SMTP Relay Verified!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your Urban Furniture accounting system is successfully connected to <strong>{host}:{port}</strong>.
          </p>
          <div style="background: #f8fafc; padding: 14px; border-radius: 8px; font-size: 13px; color: #475569; margin: 16px 0; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 4px;"><strong>Host:</strong> {host}</div>
            <div style="margin-bottom: 4px;"><strong>Port:</strong> {port}</div>
            <div style="margin-bottom: 4px;"><strong>Sender:</strong> {from_addr}</div>
            <div><strong>Delivered To:</strong> {to_email}</div>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
            Password reset links and notifications will now arrive directly in your inbox.
          </p>
        </div>
        """
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_text, "html"))

        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.starttls()

        server.login(user, password)
        server.sendmail(from_addr, [to_email], msg.as_string())
        server.quit()
        return {
            "success": True,
            "message": f"Test email successfully delivered to {to_email} via {host}:{port}!",
        }
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Auth error: {e}")
        return {
            "success": False,
            "error": f"Authentication failed: Invalid username or password ({e.smtp_error.decode() if hasattr(e, 'smtp_error') and isinstance(e.smtp_error, bytes) else str(e)})",
        }
    except Exception as e:
        logger.error(f"SMTP connection test error: {e}")
        return {
            "success": False,
            "error": f"Connection failed: {str(e)}",
        }


