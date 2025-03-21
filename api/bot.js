const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API_URL = 'https://api.gptgod.online';
const GPT_API_KEY = process.env.GPT_API_KEY; // Добавьте ключ в настройки Vercel

// Хранилище пользователей (временное)
const users = new Map();

// Инициализация пользователя
function initUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      requests: 0,
      paid: false
    });
  }
  return users.get(userId);
}

// Клавиатура
const menuKeyboard = Markup.keyboard([
  ['💬 Задать вопрос', '🔄 Сбросить счетчик'],
  ['ℹ️ Помощь', '💳 Купить подписку']
]).resize();

bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `👋 Привет! Я GPT-бот. Бесплатных запросов: ${15 - user.requests}`,
    menuKeyboard
  );
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  await ctx.reply('Напишите ваш вопрос:');
});

bot.hears('🔄 Сбросить счетчик', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.requests = 0;
  await ctx.reply('✅ Счетчик сброшен!');
});

bot.hears('💳 Купить подписку', async (ctx) => {
  await ctx.reply(
    'Оплатите подписку:',
    Markup.inlineKeyboard([
      Markup.button.url('💳 Купить (299₽/мес)', 'https://example.com/pay'),
      Markup.button.callback('✅ Я оплатил', 'check_payment')
    ])
  );
});

bot.action('check_payment', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.paid = true;
  await ctx.answerCbQuery('✅ Оплата подтверждена!');
  await ctx.reply('🎉 Теперь у вас безлимитный доступ!');
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  
  if (!user.paid && user.requests >= 15) {
    return ctx.reply('🚫 Лимит исчерпан! Купите подписку.');
  }

  try {
    const response = await axios.get(`${GPT_API_URL}/chat`, {
      params: {
        query: ctx.message.text
      },
      headers: {
        'Authorization': `Bearer ${GPT_API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    user.requests++;
    await ctx.reply(response.data.response || '❌ Не удалось получить ответ');
    
    if (!user.paid) {
      await ctx.reply(`📊 Осталось запросов: ${15 - user.requests}`);
    }

  } catch (error) {
    console.error('API Error:', error);
    await ctx.reply('😞 Сервис временно недоступен, попробуйте позже');
  }
});

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};