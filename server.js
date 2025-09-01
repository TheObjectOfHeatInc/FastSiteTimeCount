const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Базовый URL для генерации ссылок
const BASE_URL = process.env.BASE_URL || 'http://lehagigachad.ru';

// Middleware для перенаправления на HTTPS (временно отключен для HTTP)
app.use((req, res, next) => {
    // Отключаем HTTPS редирект для работы на HTTP
    // if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    //     res.redirect(`https://${req.header('host')}${req.url}`);
    // } else {
        next();
    // }
});

// Целевая дата - 11 сентября 2025 года
const TARGET_DATE = new Date('2025-09-11T00:00:00.000Z').getTime();

// Настройки Telegram бота
const BOT_TOKEN = process.env.BOT_TOKEN; // Получим от @BotFather
let bot = null;
const activeChats = new Set(); // Чаты где бот активен
let timerInterval = null;

// Функция для получения времени до целевой даты
function getTimeRemaining() {
    const now = Date.now();
    const remaining = TARGET_DATE - now;
    return Math.max(0, remaining); // Не показываем отрицательное время
}

// Инициализация Telegram бота
function initTelegramBot() {
    if (!BOT_TOKEN) {
        console.log('⚠️ BOT_TOKEN не найден. Бот отключен.');
        return;
    }

    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('🤖 Telegram бот инициализирован');

    // Команда /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `🎯 Привет! Я бот таймера до 11.09.2025!
        
Команды:
🚀 /timer - начать отправку обновлений каждую минуту
⏹️ /stop - остановить обновления
📊 /status - текущий статус
⏰ /time - показать текущее время

Напиши "СТАРТУЕМ!" для быстрого запуска`);
    });

    // Команда /timer
    bot.onText(/\/timer/, (msg) => {
        const chatId = msg.chat.id;
        startTimerForChat(chatId);
    });

    // Команда /stop
    bot.onText(/\/stop/, (msg) => {
        const chatId = msg.chat.id;
        stopTimerForChat(chatId);
    });

    // Команда /status
    bot.onText(/\/status/, (msg) => {
        const chatId = msg.chat.id;
        const isActive = activeChats.has(chatId);
        const remaining = getTimeRemaining();
        const currentTime = formatTime(remaining);
        
        bot.sendMessage(chatId, `📊 Статус:
${isActive ? '✅ Таймер активен' : '❌ Таймер остановлен'}
⏰ До 11.09.2025 осталось: ${currentTime}
👥 Активных чатов: ${activeChats.size}`);
    });

    // Команда /time
    bot.onText(/\/time/, (msg) => {
        const chatId = msg.chat.id;
        sendCurrentTimer(chatId);
    });

    // Быстрая команда "СТАРТУЕМ!"
    bot.onText(/СТАРТУЕМ!/i, (msg) => {
        const chatId = msg.chat.id;
        startTimerForChat(chatId);
    });

    // Быстрая команда "стоп!"
    bot.onText(/стоп!/i, (msg) => {
        const chatId = msg.chat.id;
        stopTimerForChat(chatId);
    });
}

// Запуск таймера для чата
function startTimerForChat(chatId) {
    activeChats.add(chatId);
    
    bot.sendMessage(chatId, `🚀 Таймер запущен! Буду отправлять обновления каждую минуту.
    
⏰ Первая ссылка сейчас:`);
    
    // Отправляем первую ссылку сразу
    sendCurrentTimer(chatId);
    
    // Запускаем глобальный таймер если его нет
    if (!timerInterval && activeChats.size > 0) {
        startGlobalTimer();
    }
}

// Остановка таймера для чата
function stopTimerForChat(chatId) {
    activeChats.delete(chatId);
    
    bot.sendMessage(chatId, `⏹️ Таймер остановлен для этого чата.
    
Чтобы возобновить, напиши "СТАРТУЕМ!" или /timer`);
    
    // Останавливаем глобальный таймер если нет активных чатов
    if (activeChats.size === 0 && timerInterval) {
        stopGlobalTimer();
    }
}

// Отправка текущего таймера
function sendCurrentTimer(chatId) {
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    const timestamp = Date.now();
    const timerUrl = `${BASE_URL}/timer/${timestamp}`;
    
    bot.sendMessage(chatId, `⏰ До 11 сентября 2025 осталось: **${currentTime}**
    
🔗 Актуальная ссылка:
${timerUrl}`, { parse_mode: 'Markdown' });
}

// Запуск глобального таймера
function startGlobalTimer() {
    console.log('🕐 Запущен глобальный таймер обновлений');
    
    timerInterval = setInterval(() => {
        if (activeChats.size > 0) {
            console.log(`📢 Отправка обновлений в ${activeChats.size} чатов`);
            
            activeChats.forEach(chatId => {
                sendCurrentTimer(chatId);
            });
        }
    }, 60000); // Каждую минуту
}

// Остановка глобального таймера
function stopGlobalTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log('🛑 Глобальный таймер остановлен');
    }
}

// Настройка статических файлов
app.use(express.static('.'));

// Парсер для JSON запросов
app.use(express.json());

// Функция для форматирования времени
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Функция для создания изображения с Canvas (новый метод)
function createTimerCanvas() {
    const remaining = getTimeRemaining();
    const formattedTime = formatTime(remaining);
    const currentTime = new Date().toLocaleString('ru-RU');
    const targetDate = new Date(TARGET_DATE).toLocaleDateString('ru-RU');

    // Создаем canvas
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Создаем градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Полупрозрачный контейнер
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.roundRect(50, 50, 700, 300, 20);
    ctx.fill();

    // Настройка текста
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Заголовок
    ctx.font = 'bold 26px "DejaVu Sans", Arial, sans-serif';
    ctx.fillText('До 11 сентября 2025 осталось:', width / 2, 100);

    // Время (большими цифрами)
    ctx.font = 'bold 64px "DejaVu Sans Mono", "Courier New", monospace';
    ctx.fillText(formattedTime, width / 2, 180);

    // Целевая дата
    ctx.font = '18px "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Целевая дата: ${targetDate}`, width / 2, 250);

    // Время обновления
    ctx.font = '16px "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Обновлено: ${currentTime}`, width / 2, 280);

    // Декоративные точки
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(150, 330, 4, 0, 2 * Math.PI);
    ctx.arc(650, 330, 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(200, 80, 3, 0, 2 * Math.PI);
    ctx.arc(600, 80, 3, 0, 2 * Math.PI);
    ctx.fill();

    return canvas.toBuffer('image/png');
}

// Функция для создания SVG с обратным отсчетом (старый метод)
function createTimerSVG() {
    const currentTime = new Date().toLocaleString('ru-RU');
    const remaining = getTimeRemaining();
    const formattedTime = formatTime(remaining);
    const targetDate = new Date(TARGET_DATE).toLocaleDateString('ru-RU');
    
    // Экранируем специальные символы для SVG
    const safeFormattedTime = formattedTime.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCurrentTime = currentTime.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeTargetDate = targetDate.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
    <!-- Встроенный шрифт для цифр -->
    <style type="text/css"><![CDATA[
      .timer-font { 
        font-family: 'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace; 
        font-weight: bold;
      }
      .title-font { 
        font-family: 'DejaVu Sans', 'Liberation Sans', 'Open Sans', sans-serif; 
        font-weight: bold;
      }
      .info-font { 
        font-family: 'DejaVu Sans', 'Liberation Sans', 'Open Sans', sans-serif; 
        font-weight: normal;
      }
    ]]></style>
  </defs>
  
  <!-- Фон -->
  <rect width="800" height="400" fill="url(#bgGradient)"/>
  
  <!-- Полупрозрачный контейнер -->
  <rect x="50" y="50" width="700" height="300" fill="rgba(255,255,255,0.1)" rx="20"/>
  
  <!-- Заголовок -->
  <text x="400" y="100" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="26" font-weight="bold">
    TIME LEFT: 11.09.2025
  </text>
  
  <!-- Время -->
  <text x="400" y="180" text-anchor="middle" fill="white" 
        font-family="monospace" font-size="72" font-weight="bold">
    ${safeFormattedTime}
  </text>
  
  <!-- Подпись -->
  <text x="400" y="250" text-anchor="middle" fill="rgba(255,255,255,0.8)" 
        font-family="Arial, sans-serif" font-size="18">
    TARGET: ${safeTargetDate}
  </text>
  
  <!-- Время обновления -->
  <text x="400" y="280" text-anchor="middle" fill="rgba(255,255,255,0.6)" 
        font-family="Arial, sans-serif" font-size="16">
    UPDATED: ${new Date().toLocaleTimeString()}
  </text>
  
  <!-- Декоративные элементы -->
  <circle cx="150" cy="330" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="650" cy="330" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="200" cy="80" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="600" cy="80" r="3" fill="rgba(255,255,255,0.4)"/>
</svg>`;
}

// Маршрут для получения изображения таймера
app.get('/timer-image', async (req, res) => {
    try {
        // Используем SVG без кириллицы для лучшей совместимости
        const svgString = createTimerSVG();
        
        const pngBuffer = await sharp(Buffer.from(svgString, 'utf8'), {
            density: 150
        })
            .png({
                quality: 95
            })
            .toBuffer();
        
        // Устанавливаем заголовки для изображения
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Отправляем изображение
        res.send(pngBuffer);
    } catch (error) {
        console.error('Ошибка создания изображения:', error);
        res.status(500).send('Ошибка создания изображения');
    }
});

// Маршрут для получения SVG
app.get('/timer-svg', (req, res) => {
    try {
        const svgString = createTimerSVG();
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(svgString);
    } catch (error) {
        console.error('Ошибка создания SVG:', error);
        res.status(500).send('Ошибка создания SVG');
    }
});

// Маршрут для получения времени в JSON
app.get('/api/time', (req, res) => {
    const remaining = getTimeRemaining();
    const now = Date.now();
    res.json({
        remaining: remaining,
        formatted: formatTime(remaining),
        targetDate: TARGET_DATE,
        currentTime: now,
        targetDateFormatted: new Date(TARGET_DATE).toLocaleString('ru-RU')
    });
});

// Информационный маршрут о целевой дате
app.get('/api/target', (req, res) => {
    res.json({
        targetDate: TARGET_DATE,
        targetDateFormatted: new Date(TARGET_DATE).toLocaleString('ru-RU'),
        description: 'Обратный отсчет до 11 сентября 2025 года'
    });
});

// Тестовый маршрут для проверки Canvas
app.get('/test-canvas', async (req, res) => {
    try {
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Фон
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, 800, 400);

        // Тест текста
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '32px Arial';
        ctx.fillText('Тест кириллицы: Привет мир!', 400, 100);

        ctx.font = 'bold 48px monospace';
        ctx.fillText('Цифры: 123:45:67', 400, 180);

        ctx.font = '24px serif';
        ctx.fillText('Время: ' + new Date().toLocaleTimeString('ru-RU'), 400, 260);

        ctx.font = '20px sans-serif';
        ctx.fillText('Canvas работает!', 400, 320);

        const buffer = canvas.toBuffer('image/png');
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (error) {
        console.error('Ошибка Canvas:', error);
        res.status(500).send('Ошибка Canvas: ' + error.message);
    }
});

// Тестовый маршрут для проверки шрифтов (SVG)
app.get('/test-fonts', async (req, res) => {
    try {
        const testSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="400" fill="#667eea"/>
  
  <text x="400" y="80" text-anchor="middle" fill="white" 
        font-family="DejaVu Sans, sans-serif" font-size="24" font-weight="bold">
    Тест шрифтов в Docker
  </text>
  
  <text x="400" y="150" text-anchor="middle" fill="white" 
        font-family="DejaVu Sans Mono, monospace" font-size="48" font-weight="bold">
    123:45:67
  </text>
  
  <text x="400" y="220" text-anchor="middle" fill="white" 
        font-family="Liberation Sans, sans-serif" font-size="32">
    Liberation: 12:34:56
  </text>
  
  <text x="400" y="280" text-anchor="middle" fill="white" 
        font-family="Open Sans, sans-serif" font-size="32">
    Open Sans: 98:76:54
  </text>
  
  <text x="400" y="340" text-anchor="middle" fill="white" 
        font-family="serif" font-size="32">
    Fallback serif: 11:22:33
  </text>
</svg>`;

        const pngBuffer = await sharp(Buffer.from(testSVG, 'utf8'), {
            density: 300
        })
            .png({
                quality: 100,
                compressionLevel: 6
            })
            .toBuffer();

        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
    } catch (error) {
        console.error('Ошибка тестового изображения:', error);
        res.status(500).send('Ошибка создания тестового изображения');
    }
});

// Специальный маршрут для принудительного обновления кэша Telegram
app.get('/force-update', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    const timestamp = Date.now();
    
    res.json({
        currentTime,
        remaining,
        liveUrl: `${fullUrl}/live`,
        instructions: [
            "🔴 ЛУЧШИЙ СПОСОБ - используйте LIVE ссылку:",
            `${fullUrl}/live`,
            "",
            "✅ Отправьте эту ссылку боту @WebpageBot ОДИН раз:",
            `${fullUrl}/live`,
            "",
            "🎯 После этого превью будет обновляться АВТОМАТИЧЕСКИ каждые 30 секунд!",
            "",
            "📝 Одноразовая ссылка (если LIVE не работает):",
            `${fullUrl}/timer/${timestamp}`
        ],
        imageUrl: `${fullUrl}/timer-image?v=${timestamp}`,
        tip: "LIVE ссылка обновляется сама - настройте её один раз!"
    });
});

// Постоянная ссылка которая обновляется каждую минуту
app.get('/live', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    // Обновляется каждые 30 секунд (30000 мс)
    const minuteTimestamp = Math.floor(Date.now() / 30000);
    const imageUrl = `${fullUrl}/timer-image?live=${minuteTimestamp}&time=${currentTime.replace(/:/g, '-')}`;
    
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⏰ ${currentTime} до 11.09.2025</title>
    
    <!-- Open Graph теги -->
    <meta property="og:title" content="⏰ Осталось: ${currentTime}">
    <meta property="og:description" content="До 11 сентября 2025 года осталось ${currentTime}. Автообновление каждую минуту!">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="800">
    <meta property="og:image:height" content="400">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${fullUrl}/live?v=${minuteTimestamp}">
    
    <!-- Twitter теги -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="⏰ Осталось: ${currentTime}">
    <meta name="twitter:description" content="До 11 сентября 2025: ${currentTime} (автообновление)">
    <meta name="twitter:image" content="${imageUrl}">
    
    <!-- Принудительное обновление каждые 30 секунд -->
    <meta http-equiv="refresh" content="30">
    
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .timer { 
            font-size: 4em; 
            margin: 20px 0; 
            font-family: monospace;
            font-weight: bold;
        }
        .info { 
            font-size: 1.5em; 
            opacity: 0.9; 
            margin: 10px 0;
        }
        .live { 
            color: #00ff00; 
            font-size: 1.2em;
            animation: blink 2s infinite;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <h1>⏰ До 11 сентября 2025 осталось:</h1>
    <div class="timer">${currentTime}</div>
    <div class="info">Цель: 11.09.2025</div>
    <div class="live">🔴 LIVE - обновляется каждые 30 секунд</div>
    <div class="info">Minute ID: ${minuteTimestamp}</div>
</body>
</html>`;

    // Очень агрессивные анти-кэш заголовки
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"live-${minuteTimestamp}"`);
    res.setHeader('Vary', '*');
    res.send(html);
});

// Динамический таймер для разовых ссылок
app.get('/timer/:timestamp', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    const timestamp = req.params.timestamp || Date.now();
    const imageUrl = `${fullUrl}/timer-image?id=${timestamp}&v=${Math.floor(Date.now() / 10000)}`;
    
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⏰ ${currentTime} до 11.09.2025</title>
    
    <!-- Open Graph теги -->
    <meta property="og:title" content="⏰ Осталось: ${currentTime}">
    <meta property="og:description" content="До 11 сентября 2025 года осталось ${currentTime}. Обновляется каждую секунду!">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="800">
    <meta property="og:image:height" content="400">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${fullUrl}/timer/${timestamp}">
    
    <!-- Twitter теги -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="⏰ Осталось: ${currentTime}">
    <meta name="twitter:description" content="До 11 сентября 2025: ${currentTime}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .timer { 
            font-size: 4em; 
            margin: 20px 0; 
            font-family: monospace;
            font-weight: bold;
        }
        .info { 
            font-size: 1.5em; 
            opacity: 0.9; 
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>⏰ До 11 сентября 2025 осталось:</h1>
    <div class="timer">${currentTime}</div>
    <div class="info">Цель: 11.09.2025</div>
    <div class="info">ID: ${timestamp}</div>
    <script>
        setTimeout(() => window.location.reload(), 60000);
    </script>
</body>
</html>`;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.send(html);
});

// Функция для получения базового URL
function getBaseUrl(req) {
    // В продакшене всегда используем домен
    if (process.env.NODE_ENV === 'production') {
        return BASE_URL;
    }
    // В разработке используем заголовки запроса
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}`;
}

// Маршрут для проверки meta тегов
app.get('/debug/meta', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const timestamp = Date.now();
    const imageUrl = `${fullUrl}/timer-image?t=${timestamp}`;
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    
    const metaTags = {
        'og:title': `⏰ До 11.09.2025: ${currentTime}`,
        'og:description': `До 11 сентября 2025 осталось: ${currentTime} | ${new Date().toLocaleString('ru-RU')}`,
        'og:image': imageUrl,
        'og:url': `${fullUrl}?t=${timestamp}`,
        'twitter:title': `⏰ До 11.09.2025: ${currentTime}`,
        'twitter:description': `До 11 сентября 2025 осталось: ${currentTime} | ${new Date().toLocaleString('ru-RU')}`,
        'twitter:image': imageUrl
    };
    
    res.json({
        currentTime,
        metaTags,
        imageUrl,
        fullUrl,
        timestamp,
        baseUrl: BASE_URL,
        isProduction: process.env.NODE_ENV === 'production'
    });
});

// Специальная страница для принудительного обновления превью
app.get('/preview', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    const timestamp = Date.now();
    // Уникальный URL для каждой минуты + случайный параметр
    const imageUrl = `${fullUrl}/timer-image?v=${Math.floor(timestamp / 60000)}&r=${Math.random().toString(36).substr(2, 9)}&time=${currentTime.replace(/:/g, '-')}`;
    
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⏰ До 11.09.2025: ${currentTime}</title>
    
    <!-- Open Graph теги для превью -->
    <meta property="og:title" content="⏰ До 11.09.2025: ${currentTime}">
    <meta property="og:description" content="До 11 сентября 2025 осталось: ${currentTime} | ${new Date().toLocaleString('ru-RU')}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="800">
    <meta property="og:image:height" content="400">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${fullUrl}/preview?v=${Math.floor(timestamp / 60000)}&r=${Math.random().toString(36).substr(2, 5)}">
    
    <!-- Twitter теги -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="⏰ До 11.09.2025: ${currentTime}">
    <meta name="twitter:description" content="До 11 сентября 2025 осталось: ${currentTime} | ${new Date().toLocaleString('ru-RU')}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .timer { font-size: 3em; margin: 20px 0; }
        .info { font-size: 1.2em; opacity: 0.8; }
    </style>
</head>
<body>
    <h1>⏰ До 11 сентября 2025 осталось:</h1>
    <div class="timer">${currentTime}</div>
    <div class="info">Обновлено: ${new Date().toLocaleString('ru-RU')}</div>
    <div class="info">Ссылка создана специально для превью в Telegram</div>
    <script>
        // Автоматическое обновление каждую секунду
        setTimeout(() => window.location.reload(), 60000);
    </script>
</body>
</html>`;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.send(html);
});

// Специальный эндпоинт для обновления Telegram превью
app.get('/refresh', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const remaining = getTimeRemaining();
    const formattedTime = formatTime(remaining);
    const timestamp = Date.now();
    const imageUrl = `${fullUrl}/timer-image?v=${Math.floor(timestamp / 60000)}&r=${Math.random().toString(36).substr(2, 9)}&time=${formattedTime.replace(/:/g, '-')}`;
    
    // Читаем HTML файл
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Заменяем все meta теги с абсолютными URL и уникальными значениями
    html = html.replace('<meta property="og:url" content="">', `<meta property="og:url" content="${fullUrl}/refresh?t=${Date.now()}">`);
    html = html.replace(/content="\/timer-image"/g, `content="${imageUrl}?t=${Date.now()}"`);
    html = html.replace('<meta name="twitter:image" content="/timer-image">', `<meta name="twitter:image" content="${imageUrl}?t=${Date.now()}">`);
    
    // Добавляем текущее время в заголовок и описание (используем точные совпадения)
    html = html.replace('<meta property="og:title" content="🕐 Живой таймер">', 
                       `<meta property="og:title" content="⏰ До 11.09.2025: ${formattedTime}">`);
    html = html.replace('<meta property="og:description" content="Таймер, который обновляется в реальном времени каждую минуту">', 
                       `<meta property="og:description" content="До 11 сентября 2025 осталось: ${formattedTime} | ${new Date().toLocaleTimeString('ru-RU')}"`);
    html = html.replace('<meta name="twitter:title" content="🕐 Живой таймер">', 
                       `<meta name="twitter:title" content="⏰ До 11.09.2025: ${formattedTime}">`);
    html = html.replace('<meta name="twitter:description" content="Таймер, который обновляется в реальном времени каждую минуту">', 
                       `<meta name="twitter:description" content="До 11 сентября 2025 осталось: ${formattedTime} | ${new Date().toLocaleTimeString('ru-RU')}"`);
    
    // Заголовки для предотвращения кэширования
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    res.send(html);
});

// Главная страница с динамическими meta тегами
app.get('/', (req, res) => {
    const fullUrl = getBaseUrl(req);
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    // Генерируем уникальный timestamp каждую минуту
    const minuteTimestamp = Math.floor(Date.now() / 60000) * 60000;
    const imageUrl = `${fullUrl}/timer-image?v=${minuteTimestamp}&time=${currentTime.replace(/:/g, '-')}`;
    
    // Читаем HTML файл
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Обновляем meta теги с актуальной информацией
    html = html.replace('<meta property="og:url" content="">', `<meta property="og:url" content="${fullUrl}?t=${timestamp}">`);
    html = html.replace(/content="\/timer-image"/g, `content="${imageUrl}"`);
    html = html.replace('<meta name="twitter:image" content="/timer-image">', `<meta name="twitter:image" content="${imageUrl}">`);
    
    // Обновляем заголовки с актуальным временем обратного отсчета (используем точные совпадения)
    html = html.replace('<meta property="og:title" content="🕐 Живой таймер">', 
                       `<meta property="og:title" content="⏰ До 11.09.2025: ${currentTime}">`);
    html = html.replace('<meta property="og:description" content="Таймер, который обновляется в реальном времени каждую минуту">', 
                       `<meta property="og:description" content="До 11 сентября 2025 осталось: ${currentTime} | ${new Date().toLocaleString('ru-RU')}">`);
    html = html.replace('<meta name="twitter:title" content="🕐 Живой таймер">', 
                       `<meta name="twitter:title" content="⏰ До 11.09.2025: ${currentTime}">`);
    html = html.replace('<meta name="twitter:description" content="Таймер, который обновляется в реальном времени каждую минуту">', 
                       `<meta name="twitter:description" content="До 11 сентября 2025 осталось: ${currentTime} | ${new Date().toLocaleString('ru-RU')}">`);
    
    // Добавляем дополнительные заголовки для предотвращения кэширования
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${timestamp}"`);
    
    res.send(html);
});

// Функция для сохранения изображения каждую минуту
async function saveTimerImage() {
    try {
        const remaining = getTimeRemaining();
        const svgString = createTimerSVG();
        
        const pngBuffer = await sharp(Buffer.from(svgString, 'utf8'), {
            density: 150
        })
            .png({
                quality: 95
            })
            .toBuffer();
        
        // Сохраняем в файл
        fs.writeFileSync('timer-preview.png', pngBuffer);
        console.log(`📸 Изображение обновлено. До 11.09.2025 осталось: ${formatTime(remaining)}`);
    } catch (error) {
        console.error('❌ Ошибка сохранения изображения:', error);
    }
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Основной URL: ${BASE_URL}`);
    console.log(`🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📸 Изображение таймера: ${BASE_URL}/timer-image`);
    console.log(`🎯 Целевая дата: ${new Date(TARGET_DATE).toLocaleString('ru-RU')}`);
    console.log(`⏰ До 11 сентября 2025 осталось: ${formatTime(getTimeRemaining())}`);
    console.log(`📱 Превью страница: ${BASE_URL}/preview`);
    console.log(`🔍 Отладка meta тегов: ${BASE_URL}/debug/meta`);
    
    // Создаем первое изображение
    saveTimerImage();
    
    // Устанавливаем интервал обновления каждую минуту (60000 мс)
    setInterval(saveTimerImage, 60000);
    
    // Запускаем Telegram бота
    initTelegramBot();
});

module.exports = app;