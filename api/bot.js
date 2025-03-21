const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API_URL = 'https://free-unoficial-gpt4o-mini-api-g70n.onrender.com/chat';

// Временное хранилище (для демо)
const users = new Map();

function initUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      requests: 0,
      isPremium: false
    });
  }
  return users.get(userId);
}

// Клавиатура
const menuKeyboard = Markup.keyboard([
  ['💬 Задать вопрос', '📊 Статистика'],
  ['💎 Купить подписку', 'ℹ️ Помощь']
]).resize();

bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `👋 Привет! Бесплатных запросов: ${5 - user.requests}`,
    menuKeyboard
  );
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  await ctx.reply('Напишите ваш вопрос:');
});

bot.hears('📊 Статистика', async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `📈 Ваша статистика:
    Использовано: ${user.requests} запр.
    Статус: ${user.isPremium ? 'Премиум 🚀' : 'Базовый ⚠️'}`
  );
});

bot.hears('💎 Купить подписку', async (ctx) => {
  const paymentMenu = Markup.inlineKeyboard([
    Markup.button.url('💳 Оплатить 299₽', 'https://example.com/payment'),
    Markup.button.callback('✅ Проверить оплату', 'check_payment')
  ]);
  
  await ctx.reply(
    '🎁 Премиум подписка:\n' +
    '• Безлимитные запросы\n' +
    '• Приоритетная генерация',
    paymentMenu
  );
});

bot.action('check_payment', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.isPremium = true; // Заглушка для демо
  await ctx.answerCbQuery('✅ Оплата подтверждена!');
  await ctx.reply('🎉 Теперь у вас премиум доступ!');
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  
  if (!user.isPremium && user.requests >= 5) {
    return ctx.reply('🚫 Лимит исчерпан! Купите подписку.');
  }

  try {
    const response = await fetch(`${GPT_API_URL}/?query=${encodeURIComponent(ctx.message.text)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 15000
    });
    
    if (!response.ok) throw new Error('API Error');
    
    const data = await response.json();
    user.requests++;
    
    await ctx.reply(data.response || '🤷 Не удалось получить ответ');
    
    if (!user.isPremium && 5 - user.requests <= 2) {
      await ctx.reply(`⚠️ Осталось ${5 - user.requests} бесплатных запросов!`);
    }

  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('⏳ Сервис временно недоступен');
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