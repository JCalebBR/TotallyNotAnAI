const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with BOT latency and API latency!"),
    async execute(interaction) {
        const now = Date.now();
        const sent = await interaction.reply({ content: `🏓 API latency is \`${Math.round(interaction.client.ws.ping)}ms\`\n👀 Time to Receive \`000ms\`\n🤖 Time to Respond \`000ms\``, ephemeral: true, fetchReply: true });
        interaction.editReply({
            content: `🏓 API latency is \`${Math.round(interaction.client.ws.ping)}ms\`\n👀 Time to Receive \`${now - sent.createdTimestamp}ms\`\n🤖 Time to Respond \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``, ephemeral: true
        });
    },
};