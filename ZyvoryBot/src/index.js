import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import { buildTicketPanelPayload } from "./ticketPanel.js";
import { handleTicketButton, handleTicketModal } from "./ticketHandler.js";

const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required env values: ${missing.join(", ")}`);
}

const commands = [
  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Post the Zyvory ticket panel in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON()
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    return;
  }

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", async () => {
  await registerCommands();
  console.log(`ZyvoryBot online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "ticket-panel") {
      await interaction.channel.send(buildTicketPanelPayload());
      await interaction.reply({ content: "Zyvory ticket panel posted.", ephemeral: true });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket:")) {
      await handleTicketButton(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket:")) {
      await handleTicketModal(interaction);
    }
  } catch (error) {
    console.error(error);
    const payload = { content: "Something went wrong while handling that ticket action.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
