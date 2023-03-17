const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");
const { oaiAPIKey, oaiOrgID } = require("../config.json");
const configuration = new Configuration({
    organization: oaiOrgID,
    apiKey: oaiAPIKey,
});
const log = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask ChatGPT a question!")
        .addStringOption(option =>
            option.setName("question")
                .setDescription("The question to ask")
                .setRequired(true)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName("model")
                .setDescription("The model to use")
                .addChoices(
                    // { name: "GPT-4", value: "gpt-4" },
                    // { name: "GPT-4 (March 14th)", value: "gpt-4-0314" },
                    { name: "GPT-3.5 Turbo (March 1st)", value: "gpt-3.5-turbo-0301" },
                    { name: "GPT-3.5 Turbo (Latest)", value: "gpt-3.5-turbo" },
                ))
        .addBooleanOption(option =>
            option.setName("private")
                .setDescription("Whether or not the response should be private")),
    async execute(interaction) {
        //generate id for this interaction
        const id = interaction.id;
        const input = interaction.options.getString("question");
        const category = interaction.options.getString("model") ?? "gpt-3.5-turbo";
        const ephemeral = interaction.options.getBoolean("private") ?? false;
        const pCategory = {
            // "gpt-4": "GPT-4",
            // "gpt-4-0314": "GPT-4 (March 14th)",
            "gpt-3.5-turbo-0301": "GPT-3.5 Turbo (March 1st)",
            "gpt-3.5-turbo": "GPT-3.5 Turbo",
        };

        await interaction.deferReply({ ephemeral: ephemeral });

        log.info(`ID #${id} | ${interaction.user} asked ${category}: ${input} in ${interaction.channel}`);

        const openai = new OpenAIApi(configuration);
        await openai.createChatCompletion({
            model: category,
            messages: [{ "role": "user", "content": input }]
        }).then(response => {
            log.info(`ID #${id} | ${response.data.choices[0].message?.content}`);
            const embed = new EmbedBuilder()
                .setColor(0x9C1218)
                .setTitle(`> ${input}`)
                .setAuthor({ name: `${pCategory[category]}` })
                .setDescription(`${response.data.choices[0].message?.content.slice(0, 2048)}`)
                .setTimestamp()
                .setFooter({ text: `${Date.now() - interaction.createdTimestamp}ms | #${id}` });
            interaction.followUp({ embeds: [embed] });
        }).catch(error => {
            log.error(`ID #${id} | ${error}`);
            interaction.followUp({ content: `An error occurred: \`${error}\``, ephemeral: ephemeral });
        });
    },
};