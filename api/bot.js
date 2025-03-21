const { Telegraf, Markup } = require('telegraf')
const axios = require('axios')
const express = require('express')

const app = express()
const bot = new Telegraf(process.env.BOT_TOKEN)

// Инициализация сессий
bot.use((ctx, next) => {
  ctx.session = ctx.session || {}
  return next()
})

// Главное меню
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('🎵 TikTok', 'platform_tiktok')],
  [Markup.button.callback('🔵 VK', 'platform_vk')]
])

// Обработчики
bot.start((ctx) => {
  return ctx.replyWithPhoto(
    'https://example.com/welcome.jpg', // Замените на реальную ссылку
    {
      caption: '📥 Выберите платформу для загрузки:',
      parse_mode: 'HTML',
      ...mainMenu
    }
  )
})

bot.action(/platform_(.+)/, async (ctx) => {
  ctx.session.platform = ctx.match[1]
  await ctx.editMessageText(
    `🔗 Отправьте ссылку на видео (${ctx.match[1].toUpperCase()}):\n\n` + 
    '<i>Пример: https://vk.com/video-123456_456239017</i>',
    { parse_mode: 'HTML' }
  )
})

bot.on('text', async (ctx) => {
  if (!ctx.session.platform) return

  try {
    const url = ctx.message.text
    let videoUrl

    switch(ctx.session.platform) {
      case 'tiktok':
        videoUrl = await getTikTokVideo(url)
        break
      case 'vk':
        videoUrl = await getVkVideo(url)
        break
    }

    await ctx.replyWithVideo(videoUrl, {
      caption: '✅ Видео успешно загружено!',
      parse_mode: 'HTML',
      ...mainMenu
    })
    
  } catch (error) {
    console.error(error)
    ctx.replyWithHTML('⚠️ Ошибка загрузки! Проверьте ссылку и попробуйте снова.', mainMenu)
  }
})

// Функции загрузки
async function getTikTokVideo(url) {
  const api = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`
  const { data } = await axios.get(api)
  return data.video.url
}

async function getVkVideo(url) {
  const api = `https://vk-video-api.vercel.app/?url=${encodeURIComponent(url)}`
  const { data } = await axios.get(api)
  return data.hd || data.sd
}

// Конфигурация для Vercel
app.use(express.json())
app.post('/api/webhook', (req, res) => {
  bot.handleUpdate(req.body, res)
})

app.get('/', (req, res) => res.send('Bot is running'))

module.exports = app