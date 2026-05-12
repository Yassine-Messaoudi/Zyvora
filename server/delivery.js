import nodemailer from "nodemailer";

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
