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
        .setName("image")
        .setDescription("Ask DALL-E to generate (an) image(s)!")
        .addStringOption(option =>
            option.setName("prompt")
                .setDescription("The description of the image(s) to generate")
                .setRequired(true)
                .setMaxLength(1000))
        .addIntegerOption(option =>
            option.setName("quantity")
                .setDescription("The number of images to generate")
                .setMaxValue(10))
        .addStringOption(option =>
            option.setName("size")
                .setDescription("The size of the image(s) to generate. Smaller = Faster")
                .addChoices(
                    { name: "256px", value: "256x256" },
                    { name: "512px", value: "512x512" },
                    { name: "1024px", value: "1024x1024" },
                ))
        .addBooleanOption(option =>
            option.setName("private")
                .setDescription("Whether or not the response should be private")),
    async execute(interaction) {
        //generate id for this interaction
        const id = interaction.id;
        const input = interaction.options.getString("prompt");
        const quantity = interaction.options.getInteger("quantity") ?? 1;
        const size = interaction.options.getString("size") ?? "256x256";
        const ephemeral = interaction.options.getBoolean("private") ?? false;

        await interaction.deferReply({ ephemeral: ephemeral });

        log.info(`ID #${id} | ${interaction.user} asked DALL-E: ${input} in ${interaction.channel}`);

        const openai = new OpenAIApi(configuration);
        await openai.createImage({
            prompt: input,
            n: quantity,
            size: size,
        }).then(response => {
            log.info(`ID #${id} | ${JSON.stringify(response.data.data)}`);
            // for each url in response.data, create an embed and send it
            let embeds = [];
            for (let i = 0; i < quantity; i++) {
                embeds.push(
                    new EmbedBuilder()
                        .setColor(0x9C1218)
                        .setTitle(`> ${input.slice(0, 256)}`)
                        .setAuthor({ name: `DALL-E` })
                        .setDescription(quantity > 4 ? `Here are your images!\n PS: More than 4 images were requested. Only the first 4 are shown.\nTo view the rest, use the arrows on either side of your screen when previewing any image` : quantity > 1 ? `Here are your images!` : `Here is your image!`)
                        .setURL("https://openai.com/blog/dall-e/")
                        // @ts-ignore
                        .setImage(response.data.data[i].url)
                        .setTimestamp()
                        .setFooter({ text: `${Date.now() - interaction.createdTimestamp}ms | #${id}` }));
            };
            //follow up
            interaction.followUp({ embeds: embeds });
        }).catch(error => {
            log.error(`ID #${id} | ${error}`);
            console.error(error);
            interaction.followUp({ content: `An error occurred: \`${error}\``, ephemeral: ephemeral });
        });
    },
};