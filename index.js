const { Telegraf } = require('telegraf');
  const { OpenAI } = require('openai');
  const admin = require('firebase-admin');
  const Stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  // Инициализация Firebase
  admin.initializeApp({ /* var admin = require("firebase-admin");

var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
 */ });
  const db = admin.firestore();

  // Инициализация OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  // Обработчик сообщений
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userRef = db.collection('users').doc(String(userId));
    const userData = (await userRef.get()).data() || { requests: 0, paid: false };

    // Проверка лимита
    if (userData.requests >= 15 && !userData.paid) {
      await ctx.reply('Лимит исчерпан! Оплатите доступ: /buy');
      return;
    }

    // Генерация ответа через ChatGPT
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: ctx.message.text }],
    });

    await ctx.reply(response.choices[0].message.content);
    
    // Обновление счетчика
    await userRef.set({
      requests: userData.requests + 1,
      paid: userData.paid,
    }, { merge: true });
  });

  // Команда для оплаты
  bot.command('buy', async (ctx) => {
    const session = await Stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Премиум доступ' },
          unit_amount: 500, // $5.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://ваш-сайт/success',
      cancel_url: 'https://ваш-сайт/cancel',
    });

    await ctx.reply(`Оплатите доступ: ${session.url}`);
  });

  bot.launch();
