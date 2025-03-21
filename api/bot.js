const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const HF_TOKEN = process.env.HF_API_KEY;

// Хранилище пользователей
const users = new Map();

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
  ['ℹ️ Помощь', '💳 Подписка']
]).resize();

bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `Привет! Я AI-бот. Бесплатных запросов: ${15 - user.requests}`,
    menuKeyboard
  );
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  await ctx.reply('Напишите ваш вопрос:');
});

bot.hears('🔄 Сбросить счетчик', async (ctx) => {
  const user = initUser(ctx.from.id);
  user.requests = 0;
  await ctx.reply('✅ Счетчик сброшен! Доступно 15 новых запросов.');
});

bot.hears('ℹ️ Помощь', async (ctx) => {
  await ctx.reply('🤖 Бот использует нейросеть для ответов. Лимит - 15 запросов/день.');
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  
  if (!user.paid && user.requests >= 15) {
    await ctx.reply('🚫 Лимит исчерпан! Для продолжения купите подписку.');
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(
'https://api-inference.huggingface.com/models/EleutherAI/gpt-neo-125M',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: ctx.message.text,
          parameters: {
            max_length: 20, // Уменьшенная длина ответа
            temperature: 0.7,
            repetition_penalty: 1.5
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json();
      return await ctx.reply(`❌ Ошибка API: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    user.requests++;
    
    await ctx.reply(data.generated_text || '🤷 Не удалось сгенерировать ответ');
    
    if (!user.paid) {
      await ctx.reply(`📊 Осталось бесплатных запросов: ${15 - user.requests}`);
    }

  } catch (error) {
    console.error(error);
    await ctx.reply('⏳ Сервис перегружен. Пожалуйста, попробуйте позже.');
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