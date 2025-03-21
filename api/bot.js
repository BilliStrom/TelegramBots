const { Telegraf } = require('telegraf');
const { OpenAI } = require('openai');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// История диалогов для каждого пользователя
const conversations = new Map();

bot.start((ctx) => {
  ctx.reply('🤖 Я ChatGPT-бот! Задайте любой вопрос:');
});

bot.help((ctx) => {
  ctx.reply([
    'Команды:',
    '/new - Начать новый диалог',
    '/mode [creative/balanced/precise] - Выбрать режим',
    '/help - Справка'
  ].join('\n'));
});

bot.command('new', (ctx) => {
  conversations.delete(ctx.from.id);
  ctx.reply('🆕 Новый диалог начат!');
});

bot.command('mode', (ctx) => {
  const mode = ctx.message.text.split(' ')[1];
  const validModes = ['creative', 'balanced', 'precise'];
  
  if (validModes.includes(mode)) {
    const user = conversations.get(ctx.from.id) || {};
    user.mode = mode;
    conversations.set(ctx.from.id, user);
    ctx.reply(`✅ Режим изменен на: ${mode}`);
  } else {
    ctx.reply('❌ Неверный режим. Доступные варианты: creative, balanced, precise');
  }
});

bot.on('text', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    // Получаем историю диалога
    const conversation = conversations.get(userId) || {
      messages: [],
      mode: 'balanced'
    };

    // Добавляем сообщение пользователя
    conversation.messages.push({
      role: 'user',
      content: userMessage
    });

    // Настройки генерации по режиму
    const params = {
      model: 'gpt-3.5-turbo',
      messages: conversation.messages,
      temperature: 0.7, // creative: 1.0, precise: 0.3
      max_tokens: 1000
    };

    if (conversation.mode === 'creative') {
      params.temperature = 1.0;
      params.top_p = 0.9;
    } else if (conversation.mode === 'precise') {
      params.temperature = 0.3;
      params.top_p = 0.5;
    }

    // Отправка запроса в OpenAI
    const response = await openai.chat.completions.create(params);
    const aiResponse = response.choices[0].message.content;

    // Сохраняем ответ и обрезаем историю
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    if (conversation.messages.length > 6) {
      conversation.messages = conversation.messages.slice(-4);
    }

    conversations.set(userId, conversation);

    // Отправляем ответ пользователю
    await ctx.reply(aiResponse, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('OpenAI Error:', error);
    ctx.reply('⚠️ Произошла ошибка. Попробуйте переформулировать вопрос');
  }
});

module.exports = async (req, res) => {
  await bot.handleUpdate(req.body, res);
};