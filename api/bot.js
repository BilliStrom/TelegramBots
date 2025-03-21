const { Telegraf, Markup } = require('telegraf');
const tf = require('@tensorflow/tfjs-node');
const qna = require('@tensorflow-models/qna');
const fs = require('fs').promises;

// Хранилище пользователей (временное, для демо)
const users = new Map();

// Инициализация модели и контекста
let model, context;
async function initialize() {
  if (!model) {
    await tf.setBackend('tensorflow');
    await tf.ready();
    model = await qna.load();
    context = await fs.readFile('./public/context.txt', 'utf-8');
  }
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Клавиатура
const menuKeyboard = Markup.keyboard([
  ['📝 Задать вопрос', '🔄 Мои запросы'],
  ['💳 Купить подписку', 'ℹ️ Помощь']
]).resize();

// Инициализация пользователя
function initUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      requests: 0,
      isPremium: false
    });
  }
  return users.get(userId);
}

// Команда /start
bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `👋 Привет! Ты можешь задать ${15 - user.requests} бесплатных вопросов.`,
    menuKeyboard
  );
});

// Обработка кнопки "Мои запросы"
bot.hears('🔄 Мои запросы', async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `📊 Ваша статистика:
    • Использовано запросов: ${user.requests}
    • Премиум статус: ${user.isPremium ? 'активен' : 'не активен'}`
  );
});

// Обработка кнопки "Купить подписку"
bot.hears('💳 Купить подписку', async (ctx) => {
  const paymentKeyboard = Markup.inlineKeyboard([
    Markup.button.url('💳 Оплатить (500₽/мес)', 'https://example.com/pay'),
    Markup.button.callback('✅ Я оплатил', 'check_payment')
  ]);
  
  await ctx.reply(
    '🎟 Премиум подписка:\n' +
    '• Безлимитные запросы\n' +
    '• Приоритетная поддержка',
    paymentKeyboard
  );
});

// Проверка оплаты (заглушка)
bot.action('check_payment', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.isPremium = true;
  await ctx.answerCbQuery('✅ Оплата подтверждена!');
  await ctx.reply('🎉 Теперь у вас активен премиум доступ!');
});

// Обработка вопросов
bot.on('text', async (ctx) => {
  await initialize();
  const user = initUser(ctx.from.id);
  
  // Проверка лимита
  if (!user.isPremium && user.requests >= 15) {
    return ctx.reply(
      '🚫 Лимит исчерпан! Купите подписку для продолжения.',
      Markup.keyboard(['💳 Купить подписку']).resize()
    );
  }

  try {
    const answers = await model.findAnswers(ctx.message.text, context);
    user.requests++;
    
    const replyText = answers[0]?.text 
      ? `📝 Ответ: ${answers[0].text}`
      : '❌ Не могу найти ответ в базе знаний';
    
    await ctx.reply(replyText);

    // Уведомление о лимите
    if (!user.isPremium && 15 - user.requests <= 3) {
      await ctx.reply(
        `⚠️ Осталось ${15 - user.requests} бесплатных запросов!`
      );
    }

  } catch (error) {
    console.error(error);
    await ctx.reply('⏳ Произошла ошибка, попробуйте позже');
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