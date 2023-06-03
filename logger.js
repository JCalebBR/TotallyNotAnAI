// @ts-ignore
const pino = require('pino')({
    level: process.env.PINO_LOG_LEVEL || "info",
});
module.exports = pino;