const { Telegraf } = require('telegraf');
const tf = require('@tensorflow/tfjs');
const qna = require('@tensorflow-models/qna');
const fs = require('fs').promises;

let model;
let context;

// Инициализация при первом запросе
async function initialize() {
  if (!model) {
    model = await qna.load();
    context = await fs.readFile('./public/context.txt', 'utf-8');
    console.log('Model and context loaded!');
  }
}

module.exports = async (req, res) => {
  try {
    await initialize();
    
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
    
    bot.on('text', async (ctx) => {
      const answers = await model.findAnswers(ctx.message.text, context);
      ctx.reply(answers[0]?.text || 'Не могу найти ответ 😞');
    });

    await bot.handleUpdate(req.body, res);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
};