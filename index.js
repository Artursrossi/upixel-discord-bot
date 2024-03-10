const axios = require("axios");
const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
require("dotenv").config();

const discordChannelWebhook = process.env.DISCORD_WEBHOOK;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

async function getDiscordDB() {
  try {
    const discordDBresponse = await axios.get(
      "https://www.upixel.store/api/discord/getDiscordDB",
      {
        headers: {
          Authorization: `${process.env.UPIXEL_API_AUTHORIZATION}`,
        },
      }
    );
    return discordDBresponse.data;
  } catch (error) {
    await axios.post(discordChannelWebhook, {
      content: ` 🟥 [upixel-discord-bot] getDiscordDB (${error})  🟥`,
    });
    return [];
  }
}

client.once(Events.ClientReady, async (client) => {
  if (
    !process.env.DISCORD_BOT_TOKEN ||
    !process.env.DISCORD_WEBHOOK ||
    !process.env.UPIXEL_API_AUTHORIZATION
  )
    throw new Error("Env File Error");

  await axios.post(discordChannelWebhook, {
    content: `🟦 [upixel-discord-bot] Inicialização Discord Bot (${client.user.tag}) 🟦`,
  });
  console.log(
    `🟦 [upixel-discord-bot] Inicialização Discord Bot (${client.user.tag}) 🟦`
  ); // Square Cloud Console
});

client.login(process.env.DISCORD_BOT_TOKEN);

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldStatus = oldMember.premiumSince;
  const newStatus = newMember.premiumSince;

  // New Booster
  if (!oldStatus && newStatus) {
    const discordDB = await getDiscordDB();
    for (const item of discordDB) {
      if (item.metadata.discordServerid === newMember.guild.id) {
        const embed = new EmbedBuilder()
          .setColor("#893cfc")
          .setTitle(`${newMember.guild.name}`)
          .setURL(`https://${item.server}.upixel.store`)
          .setDescription(
            `> **${newMember.user} Obrigado utilizar seu boost em nosso servidor! Resgate o seu benefício pelo nosso site**`
          )
          .setThumbnail(`${newMember.guild.iconURL()}`)
          .setFooter({
            text: `${newMember.user.username}`,
            iconURL: `${newMember.displayAvatarURL()}`,
          });

        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Resgatar")
            .setURL(`https://${item.server}.upixel.store`)
            .setStyle(ButtonStyle.Link)
        );

        newMember.send({ embeds: [embed], components: [button] });
      }
    }
  }

  // Booster Removed
  if (oldStatus && !newStatus) {
    const discordDB = await getDiscordDB();
    for (const item of discordDB) {
      if (item.metadata.discordServerid === newMember.guild.id) {
        try {
          await axios.post(
            "https://www.upixel.store/api/discord/removeDiscordBooster",
            {
              server: item.server,
              discordUserid: newMember.user.id,
            },
            {
              headers: {
                Authorization: `${process.env.UPIXEL_API_AUTHORIZATION}`,
              },
            }
          );

          await axios.post(discordChannelWebhook, {
            content: `🟩 [upixel-discord-bot] Booster Successful Removed (server: ${item.server}) (discordUserID: ${newMember.user.id}) 🟩`,
          });
        } catch (error) {
          await axios.post(discordChannelWebhook, {
            content: ` 🟥 [upixel-discord-bot] RemoveBooster Error (server: ${item.server}) (discordUserID: ${newMember.user.id}) (${error}) 🟥`,
          });
        }
      }
    }
  }
});
