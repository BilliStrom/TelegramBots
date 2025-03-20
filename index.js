const { Telegraf, Markup } = require('telegraf');
const { OpenAI } = require('openai');
const admin = require('firebase-admin');
const Stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Инициализация Firebase
const serviceAccount = require('./serviceAccountKey.json'); // Файл из Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Клавиатура с кнопками
const mainKeyboard = Markup.keyboard([
  ['/help', '/buy'],
  ['Мой статус']
]).resize();

// Команда старт
bot.start((ctx) => {
  ctx.reply(
    `👋 Привет! Я ChatGPT-бот. Тебе доступно 15 бесплатных запросов.\n` +
    `Используй кнопки для навигации:`,
    mainKeyboard
  );
});

// Команда помощи
bot.command('help', (ctx) => {
  ctx.reply(
    '❓ Доступные команды:\n' +
    '/start - Перезапустить бота\n' +
    '/buy - Купить премиум доступ\n' +
    'Просто напиши сообщение для получения ответа от ИИ',
    mainKeyboard
  );
});

// Обработчик сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  
  if (text === 'Мой статус') {
    const userRef = db.collection('users').doc(String(userId));
    const userData = (await userRef.get()).data() || { requests: 0, paid: false };
    return ctx.reply(
      `📊 Ваш статус:\n` +
      `Запросов сегодня: ${userData.requests}/15\n` +
      `Премиум доступ: ${userData.paid ? '✅ Активирован' : '❌ Не активирован'}`,
      mainKeyboard
    );
  }

  const userRef = db.collection('users').doc(String(userId));
  const userData = (await userRef.get()).data() || { requests: 0, paid: false };

  if (userData.requests >= 15 && !userData.paid) {
    return ctx.reply(
      '🚫 Лимит исчерпан! Для продолжения:',
      Markup.inlineKeyboard([
        Markup.button.url('💳 Купить доступ', 'https://your-stripe-link.com') // Замените на реальную ссылку
      ])
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: text }],
    });

    await ctx.reply(response.choices[0].message.content);
    
    await userRef.set({
      requests: userData.requests + 1,
      paid: userData.paid,
    }, { merge: true });
  } catch (error) {
    console.error(error);
    ctx.reply('⚠️ Произошла ошибка при обработке запроса');
  }
});

// Команда оплаты с инлайн-кнопкой
bot.command('buy', async (ctx) => {
  const userId = ctx.from.id;
  const session = await Stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { 
          name: 'Премиум доступ',
          description: 'Неограниченные запросы на 30 дней'
        },
        unit_amount: 500,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: 'https://your-domain.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://your-domain.com/cancel',
    metadata: { telegram_id: userId }
  });

  ctx.reply(
    '💳 Для оплаты премиум доступа нажмите кнопку:',
    Markup.inlineKeyboard([
      Markup.button.url('Оплатить сейчас', session.url)
    ])
  );
});

// Вебхук для обработки успешной оплаты (нужно добавить в Stripe Dashboard)
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.telegram_id;

    await db.collection('users').doc(String(userId)).set({
      paid: true,
      premium_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 дней
    }, { merge: true });
  }

  res.json({ received: true });
});

bot.launch();

// Для Vercel
module.exports = bot.webhookCallback('/api');
