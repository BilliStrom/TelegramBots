const { Telegraf } = require('telegraf')
const axios = require('axios')
const express = require('express')

const app = express()
const bot = new Telegraf(process.env.BOT_TOKEN)

// Обработчики
bot.start(ctx => ctx.reply('Отправьте ссылку на видео TikTok или VK'))
bot.on('text', async ctx => {
  try {
    const url = ctx.message.text
    let videoUrl
    
    if(url.includes('tiktok')) {
      const api = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`
      videoUrl = (await axios.get(api)).data.video.url
    } 
    else if(url.includes('vk.com')) {
      const api = `https://vk-api.ml/download?url=${encodeURIComponent(url)}`
      videoUrl = (await axios.get(api)).data.url
    }
    
    await ctx.replyWithVideo(videoUrl)
  } catch(e) {
    ctx.reply('Ошибка загрузки')
  }
})

// Для Vercel
app.use(express.json())
app.post('/api/bot', (req, res) => bot.handleUpdate(req.body, res))
app.get('/', (req, res) => res.send('Бот работает!')) // Добавлен GET-обработчик

module.exports = app