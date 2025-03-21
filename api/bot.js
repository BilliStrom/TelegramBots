const { Telegraf, Markup } = require('telegraf');
const axios = require('axios'); // Используем axios вместо fetch

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GPT_API = 'https://free-unoficial-gpt4o-mini-api-g70n.onrender.com/chat';

// Хранилище пользователей
const users = new Map();

const menuKeyboard = Markup.keyboard([
    ['💬 Задать вопрос', '📊 Статистика'],
    ['💎 Премиум', 'ℹ️ Помощь']
]).resize();

// Проверка работы API
async function checkAPI() {
    try {
        const response = await axios.get(`${GPT_API}/?query=test`, {
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
        // Проверка доступности API
        const isAPIActive = await checkAPI();
        if (!isAPIActive) {
            return ctx.reply('🔧 API временно недоступен, попробуйте позже');
        }

        const user = users.get(ctx.from.id) || { requests: 0 };
        
        // Лимит запросов
        if (!user.isPremium && user.requests >= 5) {
            return ctx.reply('🚫 Лимит исчерпан! Купите премиум-подписку');
        }

        // Отправка запроса
        const response = await axios.get(`${GPT_API}/?query=${
            encodeURIComponent(ctx.message.text)
        }`, {
            timeout: 15000 // 15 секунд таймаут
        });

        // Проверка структуры ответа
        if (!response.data?.response) {
            throw new Error('Неверный формат ответа API');
        }

        // Обновление статистики
        user.requests++;
        users.set(ctx.from.id, user);
        
        // Отправка ответа
        await ctx.reply(response.data.response);

    } catch (error) {
        console.error('Ошибка:', error.message);
        await ctx.reply('😞 Не удалось получить ответ. Попробуйте задать вопрос иначе');
    }
});

module.exports = async (req, res) => {
    await bot.handleUpdate(req.body, res);
};