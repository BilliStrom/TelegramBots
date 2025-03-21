// api/bot.js
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.command('start', (ctx) => {
  ctx.reply('Привет! Я работаю на Vercel!');
});

// Для обработки вебхука от Vercel
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};
