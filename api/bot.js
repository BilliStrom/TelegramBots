const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API_URL = 'https://free-unoficial-gpt4o-mini-api-g70n.onrender.com/chat';

// Хранилище пользователей
const users = new Map();

const menuKeyboard = Markup.keyboard([
    ['💬 Задать вопрос', '📊 Статистика'],
    ['💎 Премиум', 'ℹ️ Помощь']
]).resize();

// Проверка работы API
async function checkAPI() {
    try {
        const response = await axios.get(`${GPT_API_URL}/?query=test`, {
            timeout: 5000
        });
        return response.data?.response ? true : false;
    } catch (e) {
        return false;
    }
}

bot.start(async (ctx) => {
    users.set(ctx.from.id, { requests: 0, isPremium: false });
    await ctx.reply('🚀 Бот активирован!', menuKeyboard);
});

bot.hears('💬 Задать вопрос', async (ctx) => {
    try {
        const user = users.get(ctx.from.id) || { requests: 0 };
        
        // Проверка лимита
        if (!user.isPremium && user.requests >= 5) {
            return ctx.reply('🚫 Лимит исчерпан! Купите премиум-подписку');
        }

        // Проверка доступности API
        const isAPIActive = await checkAPI();
        if (!isAPIActive) {
            return ctx.reply('🔧 API временно недоступен, попробуйте позже');
        }

        // Отправка запроса
        const response = await axios.get(`${GPT_API_URL}/?query=${
            encodeURIComponent(ctx.message.text)
        }`, {
            timeout: 15000
        });

        // Проверка ответа
        if (!response.data?.response) {
            throw new Error('Неверный формат ответа');
        }

        // Обновление статистики
        user.requests++;
        users.set(ctx.from.id, user);
        
        // Отправка ответа
        await ctx.reply(response.data.response);

    } catch (error) {
        console.error('Ошибка:', error.message);
        await ctx.reply('😞 Не удалось получить ответ. Попробуйте позже');
    }
});

module.exports = async (req, res) => {
    await bot.handleUpdate(req.body, res);
};