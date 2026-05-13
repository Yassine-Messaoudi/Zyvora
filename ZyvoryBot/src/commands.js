import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { lookupOrder, fetchLogs, formatOrderStatus, formatCoin, formatDate } from "./orderLookup.js";

const STORE_NAME = process.env.STORE_NAME || "Zyvora";
const ACCENT_COLOR = 0x5865f2;
const SUPPORT_URL = process.env.SUPPORT_URL || "";

function ephemeral(payload) {
  return { ...payload, flags: MessageFlags.Ephemeral };
}

function isStaff(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    (process.env.STAFF_ROLE_ID && interaction.member?.roles?.cache?.has(process.env.STAFF_ROLE_ID))
  );
}

// ── Slash command definitions ──
export const slashCommands = [
  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Post the Zyvora ticket panel in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Display the store rules and terms.")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available bot commands and how to get support.")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("order")
    .setDescription("Look up an order by Order ID (staff only).")
    .addStringOption((opt) => opt
      .setName("id")
      .setDescription("Order ID — e.g. b08655ba-8d2b-4a0d-a704-f99f657f4281 or ORD-XXXX")
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Show recent store activity logs (staff only).")
    .addIntegerOption((opt) => opt
      .setName("limit")
      .setDescription("How many logs to show (1-50, default 15)")
      .setMinValue(1)
      .setMaxValue(50)
      .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON()
];

// ── /rules ──
function rulesEmbed() {
  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle(`📜 ${STORE_NAME} — Store Rules`)
    .setDescription("Please read and follow these rules when using our store and support.")
    .addFields(
      {
        name: "1. Be respectful",
        value: "Treat staff and other customers with respect. No insults, harassment, or hate speech."
      },
      {
        name: "2. One ticket at a time",
        value: "Open one ticket per issue. Duplicate tickets will be closed without a transcript."
      },
      {
        name: "3. Provide accurate info",
        value: "Always include your **Order ID** and **Email** in support tickets. Wrong info delays your support."
      },
      {
        name: "4. Digital goods are final",
        value: "All sales are final once delivered. Replacements are only available for verified non-working items."
      },
      {
        name: "5. No chargebacks",
        value: "Chargebacks result in a permanent ban from the store, Discord, and all related services."
      },
      {
        name: "6. No sharing accounts",
        value: "Account credentials and license keys are single-use. Sharing voids replacement eligibility."
      },
      {
        name: "7. Payment confirmation",
        value: "Crypto payments are released after the required confirmations on-chain. Be patient — refunds for impatience are not provided."
      },
      {
        name: "8. Privacy",
        value: "Do not share other customers' details, support transcripts, or staff DMs publicly."
      }
    )
    .setFooter({ text: `${STORE_NAME} — by opening a ticket you agree to these rules` })
    .setTimestamp();
}

// ── /help ──
function helpEmbed() {
  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle(`❓ ${STORE_NAME} — Help`)
    .setDescription("Here's everything the bot can do and how to get support.")
    .addFields(
      {
        name: "Customer commands",
        value: [
          "`/rules` — view store rules and terms",
          "`/help` — show this help menu"
        ].join("\n")
      },
      {
        name: "Open a support ticket",
        value: "Use the ticket panel posted in the support channel. Choose the matching category, fill in your Order ID + Email, and a staff member will help you."
      },
      {
        name: "Staff commands",
        value: [
          "`/ticket-panel` — repost the ticket panel",
          "`/order id:<order_id>` — look up any order by its ID",
          "`/logs [limit]` — view recent store activity"
        ].join("\n")
      },
      {
        name: "Need more help?",
        value: SUPPORT_URL ? `Join our support server: ${SUPPORT_URL}` : "Open a ticket using the panel above."
      }
    )
    .setFooter({ text: `${STORE_NAME} Support` })
    .setTimestamp();
}

// ── /order <id> ──
function buildOrderInfoEmbed(data) {
  const order = data.order;
  const invoice = data.invoice;

  const orderId = order?.id || invoice?.id || "Unknown";
  const email = order?.customerEmail || invoice?.customerEmail || "Unknown";
  const status = order ? formatOrderStatus(order.status) : invoice ? formatOrderStatus(invoice.status) : "Unknown";
  const coin = invoice?.selectedCoin ? formatCoin(invoice.selectedCoin) : "Unknown";
  const totalUsd = order?.totalUsd || invoice?.totalUsd || 0;
  const createdAt = order?.createdAt || invoice?.createdAt;
  const invoiceId = invoice?.id || order?.invoiceId || "—";

  const items = order?.items || invoice?.items || [];
  const productLines = items.map((item) => {
    const name = item.name || item.productName || "Product";
    const qty = item.quantity || item.qty || 1;
    return `> 🔷 **${name}** × \`${qty}\``;
  }).join("\n") || "> No products found";

  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle("🔷 Order Lookup")
    .setDescription(`Order details from **${STORE_NAME}**.`)
    .addFields(
      { name: "Order ID", value: `\`${orderId}\``, inline: true },
      { name: "Invoice ID", value: `\`${invoiceId}\``, inline: true },
      { name: "Status", value: `\`${status}\``, inline: true },
      { name: "Email", value: `\`${email}\``, inline: true },
      { name: "Payment", value: `\`${coin}\``, inline: true },
      { name: "Amount", value: `\`${totalUsd} eur\``, inline: true },
      { name: "Completed", value: `\`${formatDate(createdAt)}\``, inline: false },
      { name: "Products", value: productLines, inline: false }
    )
    .setFooter({ text: `${STORE_NAME} — admin lookup` })
    .setTimestamp();
}

// ── /logs ──
function formatLogType(type) {
  const icons = {
    invoice_created: "🧾",
    payment_detected: "◎",
    payment_confirmed: "✓",
    order_delivered: "📦",
    refund_issued: "↩️",
    review_posted: "⭐",
    coupon_applied: "🎟️"
  };
  return `${icons[type] || "•"} \`${type}\``;
}

function logsEmbed(logs) {
  const lines = logs.map((log) => {
    const when = log.createdAt ? `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>` : "—";
    const ref = log.invoiceId ? ` · \`${log.invoiceId}\`` : "";
    const detail = log.details ? ` — ${String(log.details).slice(0, 80)}` : "";
    return `${formatLogType(log.type)}${ref}${detail} ${when}`;
  });

  const description = lines.length ? lines.join("\n") : "_No activity yet._";

  return new EmbedBuilder()
    .setColor(ACCENT_COLOR)
    .setTitle(`📊 ${STORE_NAME} — Recent Activity`)
    .setDescription(description.slice(0, 4000))
    .setFooter({ text: `Showing ${logs.length} entr${logs.length === 1 ? "y" : "ies"}` })
    .setTimestamp();
}

// ── Command dispatcher ──
export async function handleSlashCommand(interaction, { buildTicketPanelPayload }) {
  const name = interaction.commandName;

  if (name === "ticket-panel") {
    await interaction.channel.send(buildTicketPanelPayload());
    await interaction.reply(ephemeral({ content: "Ticket panel posted." }));
    return true;
  }

  if (name === "rules") {
    await interaction.reply({ embeds: [rulesEmbed()] });
    return true;
  }

  if (name === "help") {
    await interaction.reply({ embeds: [helpEmbed()] });
    return true;
  }

  if (name === "order") {
    if (!isStaff(interaction)) {
      await interaction.reply(ephemeral({ content: "Only staff can use this command." }));
      return true;
    }

    const orderId = interaction.options.getString("id", true).trim();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const data = await lookupOrder({ orderId });
    if (!data) {
      await interaction.editReply({
        content: `❌ No order found for ID \`${orderId}\`.\nMake sure \`STORE_API_URL\` and \`BOT_API_KEY\` are configured on the bot.`
      });
      return true;
    }

    await interaction.editReply({ embeds: [buildOrderInfoEmbed(data)] });
    return true;
  }

  if (name === "logs") {
    if (!isStaff(interaction)) {
      await interaction.reply(ephemeral({ content: "Only staff can use this command." }));
      return true;
    }

    const limit = interaction.options.getInteger("limit") || 15;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const logs = await fetchLogs(limit);
    if (logs === null) {
      await interaction.editReply({
        content: "❌ Could not fetch logs. Verify `STORE_API_URL` and `BOT_API_KEY` are set on the bot."
      });
      return true;
    }

    await interaction.editReply({ embeds: [logsEmbed(logs)] });
    return true;
  }

  return false;
}
