const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API_URL = 'https://api.gptgod.online/chat';
const GPT_API_KEY = process.env.GPT_API_KEY;

const users = new Map();

const menuKeyboard = Markup.keyboard([
  ['💬 Задать вопрос', '📊 Статистика'],
  ['💎 Подписка', 'ℹ️ Помощь']
]).resize();

// Проверка доступности API
async function checkAPI() {
  try {
    const response = await axios.get(GPT_API_URL, {
      headers: { Authorization: `Bearer ${GPT_API_KEY}` },
      timeout: 5000
    });
    return response.status === 200;
  } catch (e) {
    console.error('API Health Check Failed:', e.message);
    return false;
  }
}

bot.start(async (ctx) => {
  users.set(ctx.from.id, { requests: 0, isPremium: false });
  await ctx.reply('🚀 Бот активирован!', menuKeyboard);
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  try {
    const user = users.get(ctx.from.id) || { requests: 0 };

    if (!user.isPremium && user.requests >= 15) {
      return ctx.reply('🚫 Лимит исчерпан! Купите подписку: /premium');
    }

    // Проверка доступности API
    if (!(await checkAPI())) {
      return ctx.reply('🔧 Технические работы. Попробуйте через 5 минут.');
    }

    const response = await axios.post(
      GPT_API_URL,
      { query: ctx.message.text },
      {
        headers: { Authorization: `Bearer ${GPT_API_KEY}` },
        timeout: 20000 // 20 секунд
      }
    );

    if (!response.data?.response) {
      throw new Error('Пустой ответ от API');
    }

    user.requests++;
    users.set(ctx.from.id, user);

    await ctx.reply(response.data.response);
    await ctx.reply(`📊 Осталось запросов: ${15 - user.requests}`);

  } catch (error) {
    console.error('Ошибка:', error.message);
    await ctx.reply('😞 Не удалось обработать запрос. Попробуйте позже.');
  }
});

module.exports = async (req, res) => {
  await bot.handleUpdate(req.body, res);
};