const { Telegraf } = require('telegraf');
const express = require('express');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();

// Проверка токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ Токен бота не найден!');
  process.exit(1);
}

// Вебхук
app.use(bot.webhookCallback('/api'));
bot.telegram.setWebhook(`https://${process.env.VERCEL_URL}/api`);

// Обработчик /start
bot.start((ctx) => {
  ctx.reply('🤖 Бот работает!');
});

// Эхо-ответ
bot.on('text', (ctx) => {
  ctx.reply(`Вы написали: ${ctx.message.text}`);
});

// Запуск сервера
app.listen(3000, () => {
  console.log('Сервер запущен');
});

module.exports = app;
