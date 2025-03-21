const { Telegraf } = require('telegraf');
const tf = require('@tensorflow/tfjs-node');
const qna = require('@tensorflow-models/qna');
const fs = require('fs').promises;

let model;
let context;

async function initialize() {
  if (!model) {
    // Инициализация нативного бэкенда
    await tf.setBackend('tensorflow');
    await tf.ready();
    
    model = await qna.load();
    context = await fs.readFile('./public/context.txt', 'utf-8');
    console.log('TF.js Node backend initialized!');
  }
}

module.exports = async (req, res) => {
  try {
    await initialize();
    
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
    
    bot.on('text', async (ctx) => {
      const answers = await model.findAnswers(ctx.message.text, context);
      ctx.reply(answers[0]?.text || 'Ответ не найден');
    });

    await bot.handleUpdate(req.body, res);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
};