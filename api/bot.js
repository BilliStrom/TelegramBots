const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API_URL = 'https://free-unoficial-gpt4o-mini-api-g70n.onrender.com/chat';

// Конфигурация
const config = {
  free_requests: 5,
  premium_price: 299,
  api_timeout: 20000,
  backup_api: 'https://api.example.com/backup' // Добавьте резервный API
};

// Хранилище пользователей (временное)
const users = new Map();

const initUser = (userId) => {
  if (!users.has(userId)) {
    users.set(userId, {
      requests: 0,
      isPremium: false,
      lastRequest: null
    });
  }
  return users.get(userId);
};

// Клавиатура
const menuKeyboard = Markup.keyboard([
  ['💬 Задать вопрос', '📊 Статистика'],
  ['💎 Премиум', 'ℹ️ Помощь']
]).resize();

// Логирование ошибок
const logError = (error, ctx) => {
  console.error(`[ERROR] ${new Date().toISOString()} User: ${ctx.from.id}`, error);
};

// Проверка доступности API
const checkAPIHealth = async () => {
  try {
    const response = await fetch(GPT_API_URL, { timeout: 5000 });
    return response.ok;
  } catch (e) {
    return false;
  }
};

bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `🚀 Добро пожаловать! Бесплатных запросов: ${config.free_requests - user.requests}`,
    menuKeyboard
  );
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  await ctx.reply('✍️ Напишите ваш вопрос:');
});

bot.hears('📊 Статистика', async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `📈 Ваша статистика:\n` +
    `• Использовано запросов: ${user.requests}\n` +
    `• Статус: ${user.isPremium ? 'Премиум ✅' : 'Базовый ⚠️'}\n` +
    `• Последний запрос: ${user.lastRequest || 'еще не было'}`
  );
});

bot.hears('💎 Премиум', async (ctx) => {
  const paymentMenu = Markup.inlineKeyboard([
    Markup.button.url(`💳 Купить (${config.premium_price}₽)`, 'https://example.com/payment'),
    Markup.button.callback('🔄 Проверить оплату', 'check_payment')
  ]);
  
  await ctx.reply(
    `🎁 Премиум подписка включает:\n` +
    `• Безлимитные запросы\n` +
    `• Высший приоритет\n` +
    `• Эксклюзивные функции`,
    paymentMenu
  );
});

bot.action('check_payment', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.isPremium = true;
  await ctx.answerCbQuery('✅ Оплата подтверждена!');
  await ctx.reply('🎉 Теперь у вас активирован премиум доступ!');
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  const now = Date.now();
  
  // Проверка лимитов
  if (!user.isPremium && user.requests >= config.free_requests) {
    return ctx.reply('🚫 Лимит исчерпан! Для продолжения оформите подписку.');
  }

  // Антифлуд
  if (user.lastRequest && (now - user.lastRequest) < 2000) {
    return ctx.reply('⏳ Слишком много запросов! Подождите 2 секунды.');
  }

  try {
    // Проверка доступности API
    const isHealthy = await checkAPIHealth();
    const apiUrl = isHealthy ? GPT_API_URL : config.backup_api;

    const response = await fetch(`${apiUrl}/?query=${encodeURIComponent(ctx.message.text)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: config.api_timeout
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data?.response) {
      throw new Error('Invalid API Response');
    }

    user.requests++;
    user.lastRequest = now;
    
    await ctx.reply(data.response);
    
    // Уведомление о лимите
    if (!user.isPremium && (config.free_requests - user.requests) <= 2) {
      await ctx.reply(`⚠️ Осталось ${config.free_requests - user.requests} бесплатных запросов!`);
    }

  } catch (error) {
    logError(error, ctx);
    await ctx.reply('😞 Сервис временно недоступен. Пожалуйста, попробуйте позже.');
  }
});

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error('Fatal Error:', err);
    res.status(500).send('Internal Server Error');
  }
};