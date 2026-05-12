import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { ticketTypes } from "./ticketPanel.js";
import { buildTranscriptAttachment } from "./transcript.js";

const ticketTypeMap = new Map(ticketTypes.map((type) => [type.id, type]));

const deliveryCategories = [
  { label: "Robux", description: "Roblox / Robux delivery", emoji: "💎", value: "robux" },
  { label: "CS2 / Valo / Apex Delivery", description: "Delivery tickets", emoji: "🎮", value: "fps_delivery" },
  { label: "CS2 / Valo / Apex Support", description: "Support tickets", emoji: "🎮", value: "fps_support" },
  { label: "IG / TG / TikTok", description: "Social delivery", emoji: "📘", value: "social_delivery" },
  { label: "Rust / DayZ / Tarkov / FC26", description: "Game delivery", emoji: "🕹️", value: "game_delivery" }
];

const replacementCategories = [
  { label: "Replace", description: "Replace category", emoji: "🔄", value: "replace" },
  { label: "Product Issues", description: "Product issues", emoji: "🖥️", value: "product_issues" },
  { label: "Social Support", description: "Social support", emoji: "👤", value: "social_support" },
  { label: "VPN Support", description: "VPN support", emoji: "🔒", value: "vpn_support" },
  { label: "FiveM / Spoofer / Codes", description: "FiveM and codes", emoji: "🖥️", value: "fivem_spoofer_codes" }
];

function ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

function cleanName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function getTicketOwnerId(channel) {
  return channel?.topic?.match(/ticket-owner:(\d+)/)?.[1] || null;
}

function getTicketTypeId(channel) {
  return channel?.topic?.match(/ticket-type:([a-z0-9_]+)/)?.[1] || null;
}

function isTicketChannel(channel) {
  return Boolean(channel?.name?.startsWith("ticket-") && getTicketOwnerId(channel));
}

function isStaff(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    (process.env.STAFF_ROLE_ID && interaction.member?.roles?.cache?.has(process.env.STAFF_ROLE_ID))
  );
}

async function safeDm(user, payload) {
  try {
    await user.send(payload);
    return true;
  } catch {
    return false;
  }
}

async function resolveTicketParentId(guild) {
  if (!process.env.TICKET_CATEGORY_ID) return null;

  const parent = await guild.channels.fetch(process.env.TICKET_CATEGORY_ID).catch(() => null);
  if (!parent) {
    console.warn(`TICKET_CATEGORY_ID ${process.env.TICKET_CATEGORY_ID} was not found. Creating tickets without a category.`);
    return null;
  }

  if (parent.type !== ChannelType.GuildCategory) {
    console.warn(`TICKET_CATEGORY_ID ${process.env.TICKET_CATEGORY_ID} is not a category. Creating tickets without a category.`);
    return null;
  }

  return parent.id;
}

function ticketActionPanel(type, user, staffRoleId = "") {
  const staffLine = staffRoleId ? `\nStaff: <@&${staffRoleId}>` : "";
  const replacementHint = type.id === "replacement"
    ? "\n\nStaff can press **Send Replacement** after generating the replacement."
    : "";
  const container = new ContainerBuilder()
    .setAccentColor(0x22d3ee)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Zyvory Support\n**${type.emoji} ${type.label}** ticket opened for ${user}.${staffLine}\n\nPlease explain your issue clearly and include your order email, invoice ID, or product name when needed.${replacementHint}`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Send a replacement message to the customer after the replacement is ready.")
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId("ticket:replacement_modal")
            .setLabel("Send Replacement")
            .setEmoji("🔁")
            .setStyle(ButtonStyle.Primary)
        )
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Customer can confirm after receiving the replacement or order.")
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId("ticket:received")
            .setLabel("Order Received")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
        )
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Close this ticket and generate an HTML transcript.")
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId("ticket:close")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
        )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };
}

function ticketWelcomePanel(type, user, staffRoleId = "") {
  return ticketActionPanel(type, user, staffRoleId);
}

function replacementModal() {
  return new ModalBuilder()
    .setCustomId("ticket:replacement_submit")
    .setTitle("Send Zyvory Replacement")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("order")
          .setLabel("Order / invoice / product")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("Example: INV-1024 or ChatGPT Account")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Replacement message for customer")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Write the replacement info or instructions here.")
      )
    );
}

function questionsModal() {
  return new ModalBuilder()
    .setCustomId("ticket:questions_submit")
    .setTitle("Questions")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("question")
          .setLabel("Question")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Write your question...")
      )
    );
}

function generalSupportModal() {
  return new ModalBuilder()
    .setCustomId("ticket:general_submit")
    .setTitle("General Support")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("order")
          .setLabel("Order ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Enter your Order ID")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("email")
          .setLabel("Email")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Enter your email address")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Write your message...")
      )
    );
}

function productNotReceivedModal(queue) {
  const label = queue === "pending" ? "Pending Queue" : "Not Working / Replacements";
  return new ModalBuilder()
    .setCustomId(`ticket:not_received_submit:${queue}`)
    .setTitle("Product Not Received")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("order")
          .setLabel("Order ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Enter your Order ID")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("email")
          .setLabel("Email")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Enter your email address")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel(`${label} message`)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Tell us what product you did not receive...")
      )
    );
}

function productNotReceivedSelectPayload() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket:not_received_select")
    .setPlaceholder("Choose an option...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Not Working / Replacements")
        .setDescription("Open in replacements queue")
        .setEmoji("🔄")
        .setValue("replacements"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Pending")
        .setDescription("Open in pending queue")
        .setEmoji("⌛")
        .setValue("pending")
    );

  return {
    content: "**Product Not Received**\nChoose the exact product family to open the ticket in the correct category.\n**This menu expires in 2 minutes**",
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: MessageFlags.Ephemeral
  };
}

function categorySelectPayload(title, customId, categories) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Choose an option...")
    .addOptions(
      categories.map((category) => (
        new StringSelectMenuOptionBuilder()
          .setLabel(category.label)
          .setDescription(category.description)
          .setEmoji(category.emoji)
          .setValue(category.value)
      ))
    );

  return {
    content: `**${title}**\nChoose the exact product family to open the ticket in the correct category.\n**This menu expires in 2 minutes**`,
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: MessageFlags.Ephemeral
  };
}

function supportIssueModal(typeId, title, category = "") {
  const categoryPart = category ? `:${category}` : "";
  return new ModalBuilder()
    .setCustomId(`ticket:${typeId}_submit${categoryPart}`)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("order")
          .setLabel("Order ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Enter your Order ID")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("email")
          .setLabel("Email")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Enter your email address")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Describe your issue")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Please provide as much detail as possible...")
      )
    );
}

function findCategoryLabel(typeId, value) {
  const source = typeId === "manual_delivery" ? deliveryCategories : replacementCategories;
  return source.find((item) => item.value === value)?.label || value;
}

function replacementSentPanel(user, orderLabel = "") {
  const orderLine = orderLabel ? `\nOrder/Product: **${orderLabel}**` : "";
  const container = new ContainerBuilder()
    .setAccentColor(0x22d3ee)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Replacement Sent\n${user}, your replacement has been generated and sent to you.${orderLine}\n\nPlease check your DMs. If everything is good, press **Order Received**.`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("A staff member will reply as soon as possible.")
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId("ticket:received")
            .setLabel("Order Received")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
        )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };
}

function formatSubmittedDetails(details = {}) {
  const rows = Object.entries(details)
    .filter(([, value]) => value)
    .map(([label, value]) => `**${label}:**\n${value}`)
    .join("\n\n");

  return rows || "No extra details submitted.";
}

async function createTicket(interaction, type, details = {}) {
  const existing = interaction.guild.channels.cache.find((channel) => (
    channel.type === ChannelType.GuildText &&
    channel.topic?.includes(`ticket-owner:${interaction.user.id}`) &&
    channel.topic?.includes(`ticket-type:${type.id}`)
  ));

  if (existing) {
    await interaction.reply(ephemeral(`You already have this ticket open: ${existing}`));
    return null;
  }

  const overwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    }
  ];

  if (process.env.STAFF_ROLE_ID) {
    overwrites.push({
      id: process.env.STAFF_ROLE_ID,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const parentId = await resolveTicketParentId(interaction.guild);
  const channel = await interaction.guild.channels.create({
    name: `ticket-${cleanName(type.label)}-${cleanName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: parentId,
    topic: `ticket-owner:${interaction.user.id} | ticket-type:${type.id}`,
    permissionOverwrites: overwrites,
    reason: `Zyvory ${type.label} ticket opened by ${interaction.user.tag}`
  });

  await channel.send(ticketWelcomePanel(type, interaction.user, process.env.STAFF_ROLE_ID));
  await channel.send(`**Submitted by:** ${interaction.user}\n\n${formatSubmittedDetails(details)}\n\nYou can upload screenshots or files directly in this ticket if needed.`);

  if (process.env.LOG_CHANNEL_ID) {
    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    logChannel?.send(`🎫 Ticket opened: ${channel} by ${interaction.user.tag} (${type.label})`).catch(() => {});
  }

  return channel;
}

async function closeTicket(interaction, reason = "Ticket closed") {
  if (!isTicketChannel(interaction.channel)) {
    await interaction.reply(ephemeral("This button only works inside ticket channels."));
    return;
  }

  await interaction.reply(ephemeral("Creating transcript and closing this ticket in 8 seconds..."));

  const ownerId = getTicketOwnerId(interaction.channel);
  const typeId = getTicketTypeId(interaction.channel);
  const type = ticketTypeMap.get(typeId) || { label: "ticket" };
  const transcript = await buildTranscriptAttachment(interaction.channel, `${interaction.channel.name}`);
  const transcriptMessage = `Transcript for ✅・${interaction.channel.name}\nReason: ${reason}`;

  await interaction.channel.send({ content: transcriptMessage, files: [transcript] }).catch(() => {});

  if (process.env.LOG_CHANNEL_ID) {
    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    const logTranscript = await buildTranscriptAttachment(interaction.channel, `${interaction.channel.name}`);
    await logChannel?.send({
      content: `🎫 Ticket closed: #${interaction.channel.name} (${type.label}) by ${interaction.user.tag}`,
      files: [logTranscript]
    }).catch(() => {});
  }

  if (ownerId) {
    const owner = await interaction.client.users.fetch(ownerId).catch(() => null);
    if (owner) {
      const dmTranscript = await buildTranscriptAttachment(interaction.channel, `${interaction.channel.name}`);
      await safeDm(owner, {
        content: `Your Zyvory ticket **${interaction.channel.name}** was closed.\nReason: ${reason}`,
        files: [dmTranscript]
      });
    }
  }

  setTimeout(() => {
    interaction.channel?.delete(reason).catch(() => {});
  }, 8000);
}

export async function handleTicketButton(interaction) {
  const [, typeId] = interaction.customId.split(":");

  if (typeId === "close") {
    await closeTicket(interaction);
    return;
  }

  if (typeId === "replacement_modal") {
    if (!isTicketChannel(interaction.channel)) {
      await interaction.reply(ephemeral("Use this inside a ticket channel."));
      return;
    }

    if (!isStaff(interaction)) {
      await interaction.reply(ephemeral("Only staff can send replacement messages."));
      return;
    }

    await interaction.showModal(replacementModal());
    return;
  }

  if (typeId === "received") {
    if (!isTicketChannel(interaction.channel)) {
      await interaction.reply(ephemeral("Use this inside a ticket channel."));
      return;
    }

    const ownerId = getTicketOwnerId(interaction.channel);
    if (interaction.user.id !== ownerId && !isStaff(interaction)) {
      await interaction.reply(ephemeral("Only the ticket customer or staff can confirm this."));
      return;
    }

    await interaction.channel.send(`✅ Order received confirmed by ${interaction.user}. Thank you for shopping with Zyvory.`);
    await safeDm(interaction.user, "✅ Thanks for confirming. Your Zyvory order/replacement has been marked as received.");
    await closeTicket(interaction, "Order received by customer");
    return;
  }

  if (typeId === "questions") {
    await interaction.showModal(questionsModal());
    return;
  }

  if (typeId === "general") {
    await interaction.showModal(generalSupportModal());
    return;
  }

  if (typeId === "not_received") {
    await interaction.reply(productNotReceivedSelectPayload());
    return;
  }

  if (typeId === "manual_delivery") {
    await interaction.reply(categorySelectPayload("Manual Delivery", "ticket:manual_delivery_select", deliveryCategories));
    return;
  }

  if (typeId === "replacement") {
    await interaction.reply(categorySelectPayload("Replacement", "ticket:replacement_select", replacementCategories));
    return;
  }

  if (typeId === "fn_issues") {
    await interaction.showModal(supportIssueModal("fn_issues", "FN Issues"));
    return;
  }

  if (typeId === "vpn_issues") {
    await interaction.showModal(supportIssueModal("vpn_issues", "VPN Issues"));
    return;
  }

  if (typeId === "social_issues") {
    await interaction.showModal(supportIssueModal("social_issues", "Social Issues"));
    return;
  }

  const type = ticketTypeMap.get(typeId);
  if (!type) {
    await interaction.reply(ephemeral("Unknown ticket type."));
    return;
  }

  const channel = await createTicket(interaction, type);
  if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
}

export async function handleTicketSelect(interaction) {
  if (interaction.customId === "ticket:not_received_select") {
    const value = interaction.values?.[0] || "replacements";
    await interaction.showModal(productNotReceivedModal(value));
    return;
  }

  if (interaction.customId === "ticket:manual_delivery_select") {
    const value = interaction.values?.[0] || "robux";
    await interaction.showModal(supportIssueModal("manual_delivery", "Manual Delivery", value));
    return;
  }

  if (interaction.customId === "ticket:replacement_select") {
    const value = interaction.values?.[0] || "replace";
    await interaction.showModal(supportIssueModal("replacement", "Replacement", value));
  }
}

export async function handleTicketModal(interaction) {
  if (interaction.customId === "ticket:questions_submit") {
    const type = ticketTypeMap.get("questions");
    const channel = await createTicket(interaction, type, {
      Question: interaction.fields.getTextInputValue("question")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId === "ticket:general_submit") {
    const type = ticketTypeMap.get("general");
    const channel = await createTicket(interaction, type, {
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Message: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId.startsWith("ticket:not_received_submit:")) {
    const queue = interaction.customId.split(":")[2] || "replacements";
    const queueLabel = queue === "pending" ? "Pending" : "Not Working / Replacements";
    const type = ticketTypeMap.get("not_received");
    const channel = await createTicket(interaction, type, {
      Queue: queueLabel,
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Message: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId.startsWith("ticket:manual_delivery_submit:")) {
    const category = interaction.customId.split(":")[2] || "robux";
    const type = ticketTypeMap.get("manual_delivery");
    const channel = await createTicket(interaction, type, {
      Category: findCategoryLabel("manual_delivery", category),
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Message: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId.startsWith("ticket:replacement_submit:")) {
    const category = interaction.customId.split(":")[2] || "replace";
    const type = ticketTypeMap.get("replacement");
    const channel = await createTicket(interaction, type, {
      Category: findCategoryLabel("replacement", category),
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Message: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId === "ticket:fn_issues_submit") {
    const type = ticketTypeMap.get("fn_issues");
    const channel = await createTicket(interaction, type, {
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Issue: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId === "ticket:vpn_issues_submit") {
    const type = ticketTypeMap.get("vpn_issues");
    const channel = await createTicket(interaction, type, {
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Issue: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId === "ticket:social_issues_submit") {
    const type = ticketTypeMap.get("social_issues");
    const channel = await createTicket(interaction, type, {
      "Order ID": interaction.fields.getTextInputValue("order")?.trim(),
      Email: interaction.fields.getTextInputValue("email")?.trim(),
      Issue: interaction.fields.getTextInputValue("message")?.trim()
    });
    if (channel) await interaction.reply(ephemeral(`Ticket created: ${channel}`));
    return;
  }

  if (interaction.customId !== "ticket:replacement_submit") return;

  if (!isTicketChannel(interaction.channel)) {
    await interaction.reply(ephemeral("Use this inside a ticket channel."));
    return;
  }

  if (!isStaff(interaction)) {
    await interaction.reply(ephemeral("Only staff can send replacement messages."));
    return;
  }

  const ownerId = getTicketOwnerId(interaction.channel);
  const owner = ownerId ? await interaction.client.users.fetch(ownerId).catch(() => null) : null;
  const orderLabel = interaction.fields.getTextInputValue("order")?.trim();
  const message = interaction.fields.getTextInputValue("message")?.trim();

  if (!owner) {
    await interaction.reply(ephemeral("I could not find the ticket customer."));
    return;
  }

  const dmSent = await safeDm(owner, {
    content: `🔁 **Zyvory replacement sent**${orderLabel ? `\nOrder/Product: **${orderLabel}**` : ""}\n\n${message}\n\nPlease return to your ticket and press **Order Received** if everything works.`
  });

  await interaction.channel.send(replacementSentPanel(owner, orderLabel));

  if (!dmSent) {
    await interaction.channel.send(
      `⚠️ I could not DM ${owner}. Replacement message from ${interaction.user}:\n\n${message}`
    );
  }

  if (process.env.LOG_CHANNEL_ID) {
    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    await logChannel?.send(`🔁 Replacement sent in ${interaction.channel} by ${interaction.user.tag}${orderLabel ? ` for ${orderLabel}` : ""}.`).catch(() => {});
  }

  await interaction.reply(ephemeral(
    dmSent ? "Replacement message sent to the customer DM." : "Customer DM failed, so I posted the replacement in the ticket."
  ));
}
