import {
  ActionRowBuilder,
  AttachmentBuilder,
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
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { ticketTypes } from "./ticketPanel.js";
import { buildTranscriptAttachment } from "./transcript.js";

const ticketTypeMap = new Map(ticketTypes.map((type) => [type.id, type]));

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

async function closeTicket(interaction, reason = "Ticket closed") {
  if (!isTicketChannel(interaction.channel)) {
    await interaction.reply({ content: "This button only works inside ticket channels.", ephemeral: true });
    return;
  }

  await interaction.reply({ content: "Creating transcript and closing this ticket in 8 seconds...", ephemeral: true });

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
      await interaction.reply({ content: "Use this inside a ticket channel.", ephemeral: true });
      return;
    }

    if (!isStaff(interaction)) {
      await interaction.reply({ content: "Only staff can send replacement messages.", ephemeral: true });
      return;
    }

    await interaction.showModal(replacementModal());
    return;
  }

  if (typeId === "received") {
    if (!isTicketChannel(interaction.channel)) {
      await interaction.reply({ content: "Use this inside a ticket channel.", ephemeral: true });
      return;
    }

    const ownerId = getTicketOwnerId(interaction.channel);
    if (interaction.user.id !== ownerId && !isStaff(interaction)) {
      await interaction.reply({ content: "Only the ticket customer or staff can confirm this.", ephemeral: true });
      return;
    }

    await interaction.channel.send(`✅ Order received confirmed by ${interaction.user}. Thank you for shopping with Zyvory.`);
    await safeDm(interaction.user, "✅ Thanks for confirming. Your Zyvory order/replacement has been marked as received.");
    await closeTicket(interaction, "Order received by customer");
    return;
  }

  const type = ticketTypeMap.get(typeId);
  if (!type) {
    await interaction.reply({ content: "Unknown ticket type.", ephemeral: true });
    return;
  }

  const existing = interaction.guild.channels.cache.find((channel) => (
    channel.type === ChannelType.GuildText &&
    channel.topic?.includes(`ticket-owner:${interaction.user.id}`) &&
    channel.topic?.includes(`ticket-type:${type.id}`)
  ));

  if (existing) {
    await interaction.reply({ content: `You already have this ticket open: ${existing}`, ephemeral: true });
    return;
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

  const channel = await interaction.guild.channels.create({
    name: `ticket-${cleanName(type.label)}-${cleanName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: process.env.TICKET_CATEGORY_ID || null,
    topic: `ticket-owner:${interaction.user.id} | ticket-type:${type.id}`,
    permissionOverwrites: overwrites,
    reason: `Zyvory ${type.label} ticket opened by ${interaction.user.tag}`
  });

  await channel.send(ticketWelcomePanel(type, interaction.user, process.env.STAFF_ROLE_ID));

  if (process.env.LOG_CHANNEL_ID) {
    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    logChannel?.send(`🎫 Ticket opened: ${channel} by ${interaction.user.tag} (${type.label})`).catch(() => {});
  }

  await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
}

export async function handleTicketModal(interaction) {
  if (interaction.customId !== "ticket:replacement_submit") return;

  if (!isTicketChannel(interaction.channel)) {
    await interaction.reply({ content: "Use this inside a ticket channel.", ephemeral: true });
    return;
  }

  if (!isStaff(interaction)) {
    await interaction.reply({ content: "Only staff can send replacement messages.", ephemeral: true });
    return;
  }

  const ownerId = getTicketOwnerId(interaction.channel);
  const owner = ownerId ? await interaction.client.users.fetch(ownerId).catch(() => null) : null;
  const orderLabel = interaction.fields.getTextInputValue("order")?.trim();
  const message = interaction.fields.getTextInputValue("message")?.trim();

  if (!owner) {
    await interaction.reply({ content: "I could not find the ticket customer.", ephemeral: true });
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

  await interaction.reply({
    content: dmSent ? "Replacement message sent to the customer DM." : "Customer DM failed, so I posted the replacement in the ticket.",
    ephemeral: true
  });
}
