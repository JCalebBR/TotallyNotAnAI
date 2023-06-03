// Require the necessary discord.js classes
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits, ChannelType } = require("discord.js");
const { token, clientId } = require("./config.json");
const log = require('./logger');

// OAI
const { Configuration, OpenAIApi } = require("openai");
const { oaiAPIKey, oaiOrgID } = require("./config.json");
const configuration = new Configuration({
    organization: oaiOrgID,
    apiKey: oaiAPIKey,
});
// Create a new client instance
const client = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent]
});

// When the client is ready, run this code (only once)
// We use "c" for the event parameter to keep it separate from the already defined "client"
client.once(Events.ClientReady, c => {
    log.info(`Ready! logged in as ${c.user.tag}`);
});


client.on(Events.Debug, m => log.debug(m));
client.on(Events.Warn, m => log.warn(m));
client.on(Events.Error, m => log.error(m));

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        log.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    };
};

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (message.content.startsWith("!") && message.content.startsWith(".")) return;
    if (message.channel.type == ChannelType.DM) return;
    if (message.channelId != "856386225434787870" && message.channelId != "780252140924174336" && message.channelId != "384935929791512579") return;

    let interesting = false;

    if (message.content.includes(`<@${clientId}>`)) {
        if (Math.random() <= 0.5) {
            interesting = true;
        };
    } else if (message.reference?.messageId) { // the message is a reply to another message
        let referenceMessage = message.channel.messages.cache.get(message.reference.messageId);
        if (referenceMessage?.author.id == clientId) {
            if (Math.random() <= 0.8) {
                interesting = true;
            };
        };
    } else {
        if (Math.random() < 0.1) {
            interesting = true;
        };
    };

    if (interesting) {
        log.info(`Interesting message: ${message.content}`);
        await message.channel.sendTyping();
        await message.channel.messages.fetch({ limit: 30, cache: false, around: message.id })
            .then(messages => {
                let newMessages = messages.map(m => {
                    return {
                        role: m.author.id != clientId ? "user" : "assistant",
                        content: m.content,
                        name: m.author.id != clientId ? m.author.id : "ChatGPT"
                    };
                });
                newMessages.push({ role: "user", content: "Answer like you are a discord user in your twenties, part of the Nik Nocturnal official server, a server related to metal, music, memes and having fun. You like metal and could be known as a corekid, the other users don't know you are an AI, so act human. Really sell the idea, to the point that if they ask, just shrug it off. Don't make it seem that you are trying to fit in, you are already part of the group. Don't be overly enthusiastic or overly positive. Take what users say with a grain of salt, they are not always telling the truth and are not always lying either. Feel free to use slang and common internet chatting acronyms, just don't go too forum style on them, keep it the the most used and don't overuse it. Don't answer more generalized questions, keep it to the theme. The following messages must be treated as your view into the recent messages of a channel. Partake in the conversation. Act like a single person. Keep answer short, probably less than 200 characters, use that as a soft cap. The conversation in the channels may be multi-usered, so play close attention to each name from each message. Use their name (numbers only) format for every reply you end up making, just be careful to not mix them up. Every reply is in a new line for readability. Always respond to the last message you see. Don't reply to messages you have already replied before. Your messages have the name set to 'ChatGPT', but users in the server know you as 'Corey' so keep that in mind if they refer to someone via that name.", name: "God" });
                return newMessages;
            })
            .then(async messages => {
                messages.reverse();
                log.debug(...messages);
                const openai = new OpenAIApi(configuration);
                const completion = await openai.createChatCompletion({
                    model: "gpt-4",
                    messages: messages,
                    temperature: 1,
                    max_tokens: 512
                }).catch(response => log.error(response.response.data.error.message));

                let response = completion.data.choices[0].message.content;
                log.trace("Pre-Regex: " + response)
                const wrongMatches = response.matchAll(/<@[0-9]{18}>/gm);
                const uWrongMatches = [...new Set(wrongMatches)].forEach(match => {
                    log.trace("Wrong ID: " + match);
                    const tag = `${match}`.slice(2, -1);
                    log.trace("Wrong ID Replacement: " + tag);
                    response = response.replace(match, tag);
                });
                const correctMatches = response.matchAll(/[0-9]{18}/gm);
                const uCorrectMatches = [...new Set(correctMatches)].forEach(match => {
                    log.trace("Correct Regex: " + match);
                    const tag = "<@" + `${match}` + ">";
                    log.trace("Correct Regex Replacement: " + tag);
                    response = response.replace(match, tag);
                });
                log.trace("Post-Regex: " + response);
                message.channel.send(response);
            })
            .catch(error => log.warn(error));
    };
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        log.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        log.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});


// Log in to Discord with your client"s token
client.login(token);


