import nodemailer from "nodemailer";

const LOGO_URL = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1778619521/Zyvolalogo_yecrow.png";

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendVerificationEmail(email, code) {
  const transport = getTransport();
  if (!transport) return false;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0e17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e17;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d1525 0%,#111827 100%);padding:32px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
          <img src="${LOGO_URL}" alt="Zyvora" width="52" height="52" style="display:block;margin:0 auto 12px;" />
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#f0f6ff;letter-spacing:-0.02em;">Zyvora</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#8b949e;font-weight:600;">Digital Market</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#f0f6ff;">Verify your identity</h2>
          <p style="margin:0 0 28px;font-size:14px;color:#8b949e;line-height:1.6;">Enter the verification code below to access your customer dashboard. This code expires in <strong style="color:#c9d1d9;">10 minutes</strong>.</p>
          <div style="background:#0a0e17;border:1px solid rgba(37,99,235,0.25);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8b949e;">Your verification code</p>
            <p style="margin:0;font-size:38px;font-weight:900;letter-spacing:12px;color:#58a6ff;font-family:'Courier New',monospace;">${code}</p>
          </div>
          <p style="margin:0 0 6px;font-size:13px;color:#8b949e;line-height:1.5;">If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:#484f58;">&copy; ${new Date().getFullYear()} Zyvora. All rights reserved.</p>
          <p style="margin:6px 0 0;font-size:11px;color:#30363d;">This is an automated message. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await transport.sendMail({
    from: process.env.SMTP_FROM || "Zyvora Market <orders@zyvora.local>",
    to: email,
    subject: `${code} — Zyvora Dashboard Verification Code`,
    text: `Your Zyvora verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you didn't request this, ignore this email.`,
    html
  });
  return true;
}

export async function sendDeliveryEmail(invoice, order) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  const deliveryItems = Array.isArray(order.deliveryItems)
    ? (typeof order.deliveryItems[0] === "string" ? JSON.parse(order.deliveryItems) : order.deliveryItems)
    : [];
  const lines = deliveryItems.flatMap((item) => [
    item.name,
    `Delivery type: ${item.deliveryType}`,
    ...item.delivered.map((value) => `- ${value}`),
    ""
  ]);
  await transport.sendMail({
    from: process.env.SMTP_FROM || "orders@zyvory.local",
    to: invoice.customerEmail,
    subject: `Your Zyvory Market order ${order.id}`,
    text: `Thank you for your purchase.\n\n${lines.join("\n")}`
  });
  return true;
}

export async function sendDiscordWebhook(event, payload) {
  if (!process.env.DISCORD_WEBHOOK_URL) return false;
  try {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Zyvory Market",
        embeds: [
          {
            title: event,
            color: 2463999,
            fields: Object.entries(payload).map(([name, value]) => ({
              name,
              value: String(value).slice(0, 1024),
              inline: true
            })),
            timestamp: new Date().toISOString()
          }
        ]
      })
    });
  } catch {
    // Silently fail if webhook is not configured
  }
  return true;
}
