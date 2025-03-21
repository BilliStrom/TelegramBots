const { Telegraf, Markup } = require('telegraf');
const tf = require('@tensorflow/tfjs-node');
const qna = require('@tensorflow-models/qna');
const fs = require('fs').promises;

// Хранилище пользователей
const users = new Map();

// Инициализация модели
let model, context;
async function initialize() {
  if (!model) {
    await tf.setBackend('tensorflow');
    await tf.ready();
    model = await qna.load();
    context = await fs.readFile('./public/context.txt', 'utf-8');
    console.log('Model initialized!');
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

bot.start(async (ctx) => {
  try {
    await initialize();
    const user = initUser(ctx.from.id);
    await ctx.reply(
      `👋 Привет! Бесплатных вопросов осталось: ${15 - user.requests}`,
      menuKeyboard
    );
  } catch (error) {
    console.error('Start error:', error);
    await ctx.reply('🚨 Произошла ошибка при запуске');
  }
});

bot.hears('📝 Задать вопрос', async (ctx) => {
  await ctx.reply('Напишите ваш вопрос:');
});

bot.hears('🔄 Мои запросы', async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `📊 Статистика:
    Запросов: ${user.requests}
    Статус: ${user.isPremium ? 'Премиум ✅' : 'Базовый ⚠️'}`
  );
});

bot.hears('💳 Купить подписку', async (ctx) => {
  const paymentMenu = Markup.inlineKeyboard([
    Markup.button.url('Оплатить', 'https://example.com/payment'),
    Markup.button.callback('Проверить оплату', 'check_payment')
  ]);
  
  await ctx.reply(
    '🎁 Премиум подписка:\n' +
    '- Безлимитные запросы\n' +
    '- Приоритетная поддержка',
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
  try {
    await initialize();
    const user = initUser(ctx.from.id);
    
    if (!user.isPremium && user.requests >= 15) {
      return ctx.reply('🚫 Лимит исчерпан! Купите подписку.');
    }

    const answers = await model.findAnswers(ctx.message.text, context);
    user.requests++;
    
    const reply = answers[0]?.text 
      ? `📝 Ответ: ${answers[0].text}`
      : '❌ Ответ не найден';
    
    await ctx.reply(reply);

    if (!user.isPremium && 15 - user.requests <= 3) {
      await ctx.reply(`⚠️ Осталось ${15 - user.requests} бесплатных запросов!`);
    }

  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('⏳ Произошла ошибка обработки');
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