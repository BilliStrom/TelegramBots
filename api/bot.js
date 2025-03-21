const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API_URL = 'https://api.gptgod.online/chat';
const API_KEY = process.env.GPT4FREE_KEY;

// Настройки моделей
const MODELS = {
  GPT4: 'gpt-4-all',
  GPT3: 'gpt-3.5-turbo',
  CLAUDE: 'claude-1-100k',
  LLAMA: 'llama-2-70b'
};

// Хранилище пользователей
const users = new Map();

// Инициализация пользователя
function initUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      model: MODELS.GPT3,
      requests: 0,
      isPremium: false
    });
  }
  return users.get(userId);
}

// Клавиатура
const mainMenu = Markup.keyboard([
  ['💬 Задать вопрос', '🛠 Выбрать модель'],
  ['📊 Статистика', '💳 Премиум']
]).resize();

// Меню выбора модели
const modelMenu = Markup.inlineKeyboard([
  [Markup.button.callback('GPT-4', 'model_gpt4')],
  [Markup.button.callback('GPT-3.5', 'model_gpt3')],
  [Markup.button.callback('Claude', 'model_claude')],
  [Markup.button.callback('Llama', 'model_llama')]
]);

bot.start(async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `🚀 Добро пожаловать! Текущая модель: ${user.model}`,
    mainMenu
  );
});

bot.hears('💬 Задать вопрос', async (ctx) => {
  await ctx.reply('Введите ваш запрос:');
});

bot.hears('🛠 Выбрать модель', async (ctx) => {
  await ctx.reply('Выберите модель:', modelMenu);
});

bot.action(/model_(.+)/, async (ctx) => {
  const model = ctx.match[1];
  const user = initUser(ctx.from.id);
  user.model = MODELS[model.toUpperCase()];
  await ctx.answerCbQuery(`Модель изменена на: ${user.model}`);
  await ctx.reply(`✅ Текущая модель: ${user.model}`);
});

bot.hears('📊 Статистика', async (ctx) => {
  const user = initUser(ctx.from.id);
  await ctx.reply(
    `📈 Ваша статистика:
    Модель: ${user.model}
    Запросов: ${user.requests}
    Премиум: ${user.isPremium ? '✅' : '❌'}`
  );
});

bot.on('text', async (ctx) => {
  const user = initUser(ctx.from.id);
  
  try {
    const response = await axios.post(
      GPT_API_URL,
      {
    query: ctx.message.text,
    model: user.model,
    stream: false,
    temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    user.requests++;
    await ctx.reply(response.data.response || '❌ Ответ не получен');

  } catch (error) {
    console.error('API Error:', error);
    await ctx.reply('😞 Ошибка обработки запроса. Попробуйте позже');
  }
});

module.exports = async (req, res) => {
  await bot.handleUpdate(req.body, res);
};