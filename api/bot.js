const { Telegraf } = require('telegraf')
const axios = require('axios')
const express = require('express')

const app = express()
const bot = new Telegraf(process.env.BOT_TOKEN)

// Обработчики бота
bot.start((ctx) => ctx.replyWithMarkdown(`🎬 *Video Download Bot*\nОтправьте ссылку на видео:`))

bot.command('menu', (ctx) => {
  ctx.reply('Выберите платформу:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'TikTok', callback_data: 'tiktok' }, 
          { text: 'VK', callback_data: 'vk' }
        ]
      ]
    }
  })
})

bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery()
  ctx.reply(`Отправьте ссылку на видео (${ctx.callbackQuery.data.toUpperCase()}):`)
})

bot.on('text', async (ctx) => {
  try {
    const url = ctx.message.text
    let videoUrl
    
    if (url.includes('tiktok')) {
      videoUrl = await getTikTok(url)
    } else if (url.includes('vk.com')) {
      videoUrl = await getVK(url)
    } else {
      return ctx.reply('❌ Неподдерживаемая ссылка!')
    }

    await ctx.replyWithVideo(videoUrl)
  } catch (e) {
    console.error(e)
    ctx.reply('⚠️ Ошибка загрузки! Попробуйте другую ссылку.')
  }
})

// Сервисы загрузки
async function getTikTok(url) {
  const api = 'https://api.tiktokvideosaver.com/download'
  const { data } = await axios.post(api, { url })
  return data.video_url
}

async function getVK(url) {
  const { data } = await axios.get(`https://vk-video-downloader.p.rapidapi.com/?url=${url}`, {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY
    }
  })
  return data.hd || data.sd
}

// Конфиг для Vercel
app.use(express.json())
app.post('/api/bot', (req, res) => bot.handleUpdate(req.body, res))
module.exports = app
