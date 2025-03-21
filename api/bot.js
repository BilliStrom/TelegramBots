const { Telegraf } = require('telegraf')
const axios = require('axios')
const express = require('express')

const app = express()
const bot = new Telegraf(process.env.BOT_TOKEN)

// Меню
bot.command('start', (ctx) => {
  return ctx.reply('Выберите платформу:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'TikTok', callback_data: 'platform_tiktok' }],
        [{ text: 'VK', callback_data: 'platform_vk' }]
      ]
    }
  })
})

// Обработка выбора платформы
bot.action(/platform_(.+)/, async (ctx) => {
  ctx.session.platform = ctx.match[1]
  await ctx.deleteMessage()
  return ctx.reply(`Отправьте ссылку на видео (${ctx.match[1]}):`)
})

// Обработка ссылки
bot.on('text', async (ctx) => {
  if (!ctx.session.platform) return
  
  try {
    const url = ctx.message.text
    let videoUrl
    
    if (ctx.session.platform === 'tiktok') {
      videoUrl = await getTikTokVideo(url)
    } else if (ctx.session.platform === 'vk') {
      videoUrl = await getVkVideo(url)
    }

    await ctx.replyWithVideo(videoUrl)
  } catch (e) {
    console.error(e)
    ctx.reply('Ошибка загрузки. Проверьте ссылку!')
  }
})

// Функции загрузки (пример!)
async function getTikTokVideo(url) {
  const api = `https://api.tikdown.app/api/download?url=${encodeURIComponent(url)}`
  const response = await axios.get(api)
  return response.data.videoUrl
}

async function getVkVideo(url) {
  // Парсинг через неофициальный метод
  const response = await axios.get(`https://vk-video.vercel.app/api?url=${url}`)
  return response.data.url
}

// Для Vercel
app.use(express.json())
app.post('/api/webhook', (req, res) => {
  bot.handleUpdate(req.body, res)
})

module.exports = app