const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const HF_TOKEN = process.env.HF_API_KEY; // Ваш токен Hugging Face

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
  await ctx.reply('Счетчик сброшен! Доступно 15 запросов.');
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  
  if (!user.paid && user.requests >= 15) {
    await ctx.reply('Лимит исчерпан! Купите подписку.');
    return;
  }

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/gpt2'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: ctx.message.text,
          parameters: {
            max_length: 200,
            temperature: 0.9
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      await ctx.reply('Ошибка: ' + data.error);
      return;
    }

    user.requests++;
    await ctx.reply(data.generated_text || 'Не удалось получить ответ');
    
    if (!user.paid) {
      await ctx.reply(`Осталось запросов: ${15 - user.requests}`);
    }
  } catch (error) {
    console.error(error);
    await ctx.reply('Произошла ошибка обработки запроса');
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