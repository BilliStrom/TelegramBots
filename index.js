const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();

// Настройка вебхука
app.use(bot.webhookCallback('/api'));
bot.telegram.setWebhook('https://telegram-bots-eight-rouge.vercel.app/');

// Обработчик команды /start
bot.start((ctx) => {
  ctx.reply('🚀 Бот запущен!');
});

// Запуск сервера
app.listen(3000, () => {
  console.log('Сервер работает на порту 3000');
});

// Экспорт для Vercel
module.exports = app;