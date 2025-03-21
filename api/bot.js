const { Telegraf, Markup } = require('telegraf');
const { OpenAI } = require('openai');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Хранилище пользователей (временное, для демо)
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
  ['📝 Задать вопрос', '🔄 Сбросить контекст'],
  ['ℹ️ Помощь', '💳 Купить подписку']
]).resize();

bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `Привет! Я ChatGPT-бот. У тебя ${15 - user.requests} бесплатных запросов.\n` +
    'Выбери действие:',
    menuKeyboard
  );
});

bot.hears('📝 Задать вопрос', async (ctx) => {
  await ctx.reply('Введите ваш вопрос:');
});

bot.hears('🔄 Сбросить контекст', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.requests = 0;
  await ctx.reply('Контекст сброшен! Доступно 15 новых запросов.');
});

bot.hears('ℹ️ Помощь', async (ctx) => {
  await ctx.reply('Бот использует GPT-3.5. Лимит - 15 запросов/день. Для сброса лимита купите подписку.');
});

bot.hears('💳 Купить подписку', async (ctx) => {
  await ctx.reply(
    'Оплатите подписку:',
    Markup.inlineKeyboard([
      Markup.button.url('💳 Купить (500р/мес)', 'https://example.com/pay'),
      Markup.button.callback('✅ Я оплатил', 'check_payment')
    ])
  );
});

bot.action('check_payment', async (ctx) => {
  // Здесь должна быть проверка оплаты
  const user = initUser(ctx.from.id);
  user.paid = true;
  user.requests = 0;
  await ctx.answerCbQuery('Оплата подтверждена!');
  await ctx.reply('Теперь у вас безлимитный доступ!');
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  
  if (!user.paid && user.requests >= 15) {
    await ctx.reply('Лимит исчерпан! Купите подписку.');
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: ctx.message.text }]
    });

    user.requests++;
    await ctx.reply(response.choices[0].message.content);
    
    if (!user.paid) {
      await ctx.reply(`Осталось ${15 - user.requests} бесплатных запросов`);
    }
  } catch (error) {
    console.error(error);
    await ctx.reply('Ошибка обработки запроса');
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