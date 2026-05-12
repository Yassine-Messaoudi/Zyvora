import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ticketTypes = [
  {
    id: "questions",
    label: "Questions",
    emoji: "❔",
    title: "Have a quick question about our products?",
    description: "Press **Questions** to open the matching ticket flow."
  },
  {
    id: "general",
    label: "General Support",
    emoji: "🎧",
    title: "Need help with anything on our store?",
    description: "Press **General Support** to open the matching ticket flow."
  },
  {
    id: "not_received",
    label: "Product Not Received",
    emoji: "📦",
    title: "Did not receive your product after purchase?",
    description: "Press **Product Not Received** to open the ticket flow."
  },
  {
    id: "manual_delivery",
    label: "Manual Delivery",
    emoji: "🛵",
    title: "This ticket is for products delivered manually by us.",
    description: "Press **Manual Delivery** to open the matching ticket flow."
  },
  {
    id: "replacement",
    label: "Replacement",
    emoji: "🔁",
    title: "Something is not working? Request a replacement.",
    description: "Press **Replacement** to open the matching ticket flow."
  },
  {
    id: "fn_issues",
    label: "FN Issues",
    emoji: "⚙️",
    title: "Issues with Fortnite accounts or services?",
    description: "Press **FN Issues** to open the matching ticket flow."
  },
  {
    id: "vpn_issues",
    label: "VPN Issues",
    emoji: "🔒",
    title: "Having trouble with your VPN product?",
    description: "Press **VPN Issues** to open the matching ticket flow."
  },
  {
    id: "social_issues",
    label: "Social Issues",
    emoji: "👤",
    title: "Problems with social media accounts or services?",
    description: "Press **Social Issues** to open the matching ticket flow."
  }
];

function ticketSection(type) {
  return new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${type.title}**\n▸ ${type.description}`)
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId(`ticket:${type.id}`)
        .setLabel(type.label)
        .setEmoji(type.emoji)
        .setStyle(ButtonStyle.Primary)
    );
}

export function buildTicketPanelPayload() {
  const bannerPath = path.resolve(__dirname, "..", "assets", "zyvory_gif.gif");
  const banner = new AttachmentBuilder(bannerPath, { name: "zyvory_gif.gif" });

  const container = new ContainerBuilder()
    .setAccentColor(0x22d3ee)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL("attachment://zyvory_gif.gif")
          .setDescription("Zyvory support ticket banner")
      )
    );

  ticketTypes.forEach((type, index) => {
    container.addSectionComponents(ticketSection(type));
    if (index !== ticketTypes.length - 1) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );
    }
  });

  return {
    components: [container],
    files: [banner],
    flags: MessageFlags.IsComponentsV2
  };
}
