import { AttachmentBuilder } from "discord.js";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMessage(message) {
  const author = escapeHtml(message.author?.tag || "Unknown");
  const avatar = message.author?.displayAvatarURL?.({ extension: "png", size: 64 }) || "";
  const time = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(message.createdAt || new Date());
  const content = escapeHtml(message.content || "[component/embed/file message]").replaceAll("\n", "<br>");
  const attachments = [...message.attachments.values()]
    .map((attachment) => `<a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.name || attachment.url)}</a>`)
    .join("");

  return `
    <article class="msg">
      <img src="${escapeHtml(avatar)}" alt="" />
      <div>
        <header><strong>${author}</strong><span>${escapeHtml(time)}</span></header>
        <p>${content}</p>
        ${attachments ? `<div class="files">${attachments}</div>` : ""}
      </div>
    </article>
  `;
}

export async function buildTranscriptAttachment(channel, label = "ticket") {
  const messages = await channel.messages.fetch({ limit: 100 });
  const ordered = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "ticket";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Zyvory Ticket Transcript</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,Arial,sans-serif;background:#050b16;color:#eef7ff}
    body{margin:0;padding:32px;background:linear-gradient(135deg,#020812,#07111f)}
    main{max-width:980px;margin:auto;border:1px solid rgba(125,249,255,.18);border-radius:18px;background:rgba(8,24,39,.72);overflow:hidden}
    .top{padding:24px;border-bottom:1px solid rgba(125,249,255,.14);background:rgba(0,217,255,.06)}
    h1{margin:0;font-size:26px}.meta{margin-top:8px;color:#9cb6c9}
    .msg{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(125,249,255,.08)}
    .msg img{width:42px;height:42px;border-radius:50%;background:#0b1b2c}
    header{display:flex;gap:10px;align-items:center}header span{color:#6b7c93;font-size:12px}
    p{margin:8px 0 0;color:#d9e7f6;line-height:1.55}.files{margin-top:8px}a{color:#7df9ff}
  </style>
</head>
<body>
  <main>
    <section class="top">
      <h1>Zyvory Ticket Transcript</h1>
      <div class="meta">Channel: #${escapeHtml(channel.name)} • Messages: ${ordered.length} • Created: ${escapeHtml(new Date().toLocaleString())}</div>
    </section>
    ${ordered.map(renderMessage).join("")}
  </main>
</body>
</html>`;

  return new AttachmentBuilder(Buffer.from(html, "utf8"), {
    name: `${safeLabel}-transcript.html`
  });
}
