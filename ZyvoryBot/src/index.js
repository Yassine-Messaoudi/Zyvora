import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes
} from "discord.js";
import { buildTicketPanelPayload } from "./ticketPanel.js";
import { handleTicketButton, handleTicketModal, handleTicketSelect } from "./ticketHandler.js";
import { slashCommands, handleSlashCommand } from "./commands.js";

const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required env values: ${missing.join(", ")}`);
}

const commands = slashCommands;

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages
];

if (process.env.ENABLE_MESSAGE_CONTENT_INTENT === "true") {
  intents.push(GatewayIntentBits.MessageContent);
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  if (process.env.SKIP_COMMAND_REGISTRATION === "true") {
    console.log("Skipping slash command registration because SKIP_COMMAND_REGISTRATION=true");
    return;
  }

  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`Registered guild slash commands for ${process.env.GUILD_ID}`);
      return;
    }

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Registered global slash commands");
  } catch (error) {
    console.warn("Slash command registration failed. The bot will stay online.");
    console.warn("Check that GUILD_ID is correct and the bot was invited with the applications.commands scope.");
    console.warn(error?.rawError?.message || error?.message || error);
  }
}

const client = new Client({
  intents
});

client.once("clientReady", async () => {
  await registerCommands();
  console.log(`ZyvoryBot online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const handled = await handleSlashCommand(interaction, { buildTicketPanelPayload });
      if (handled) return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("ticket:")) {
      await handleTicketButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("ticket:")) {
      await handleTicketSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket:")) {
      await handleTicketModal(interaction);
    }
  } catch (error) {
    console.error(error);
    const payload = { content: "Something went wrong while handling that interaction.", flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
