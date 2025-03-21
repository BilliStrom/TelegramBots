const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');  // Теперь работает с версией 2.x

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API = 'https://free-unoficial-gpt4o-mini-api-g70n.onrender.com/chat';

// Хранилище пользователей
const users = new Map();

const menuKeyboard = Markup.keyboard([
  ['💬 Задать вопрос', '📊 Статистика'],
  ['💎 Премиум', 'ℹ️ Помощь']
]).resize();

bot.start(async (ctx) => {
  users.set(ctx.from.id, { requests: 0, isPremium: false });
  await ctx.reply('🚀 Бот активирован!', menuKeyboard);
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  try {
    const response = await fetch(`${GPT_API}/?query=${encodeURIComponent(ctx.message.text)}`);
    const data = await response.json();
    ctx.reply(data.response || '⚠️ Ответ не получен');
  } catch (error) {
    console.error('API Error:', error);
    ctx.reply('😞 Сервис временно недоступен');
  }
});

module.exports = async (req, res) => {
  await bot.handleUpdate(req.body, res);
};