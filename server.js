const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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

// Функция для получения времени до целевой даты
function getTimeRemaining() {
    const now = Date.now();
    const remaining = TARGET_DATE - now;
    return Math.max(0, remaining); // Не показываем отрицательное время
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

// Функция для создания SVG с обратным отсчетом
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
        font-family: 'Courier New', 'DejaVu Sans Mono', monospace; 
        font-weight: bold;
      }
      .title-font { 
        font-family: 'Arial', 'Helvetica', sans-serif; 
        font-weight: bold;
      }
      .info-font { 
        font-family: 'Arial', 'Helvetica', sans-serif; 
        font-weight: normal;
      }
    ]]></style>
  </defs>
  
  <!-- Фон -->
  <rect width="800" height="400" fill="url(#bgGradient)"/>
  
  <!-- Полупрозрачный контейнер -->
  <rect x="50" y="50" width="700" height="300" fill="rgba(255,255,255,0.1)" rx="20"/>
  
  <!-- Заголовок -->
  <text x="400" y="100" text-anchor="middle" fill="white" class="title-font"
        font-size="26" filter="url(#shadow)">
    До 11 сентября 2025 осталось:
  </text>
  
  <!-- Время -->
  <text x="400" y="180" text-anchor="middle" fill="white" class="timer-font"
        font-size="64" filter="url(#shadow)">
    ${safeFormattedTime}
  </text>
  
  <!-- Подпись -->
  <text x="400" y="250" text-anchor="middle" fill="rgba(255,255,255,0.8)" 
        class="info-font" font-size="18">
    Целевая дата: ${safeTargetDate}
  </text>
  
  <!-- Время обновления -->
  <text x="400" y="280" text-anchor="middle" fill="rgba(255,255,255,0.6)" 
        class="info-font" font-size="16">
    Обновлено: ${safeCurrentTime}
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
        const svgString = createTimerSVG();
        
        // Конвертируем SVG в PNG с помощью Sharp с явной настройкой плотности
        const pngBuffer = await sharp(Buffer.from(svgString, 'utf8'), {
            density: 300  // Высокая плотность для четкого текста
        })
            .png({
                quality: 100,
                compressionLevel: 6
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
    const timestamp = Date.now();
    const imageUrl = `${fullUrl}/timer-image?t=${timestamp}`;
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    
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
    <meta property="og:url" content="${fullUrl}/preview?t=${timestamp}">
    
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
    const imageUrl = `${fullUrl}/timer-image`;
    const remaining = getTimeRemaining();
    const formattedTime = formatTime(remaining);
    
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
    const timestamp = Date.now();
    const imageUrl = `${fullUrl}/timer-image?t=${timestamp}`;
    const remaining = getTimeRemaining();
    const currentTime = formatTime(remaining);
    
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
        
        // Создаем PNG с помощью Sharp с улучшенными настройками
        const pngBuffer = await sharp(Buffer.from(svgString, 'utf8'), {
            density: 300
        })
            .png({
                quality: 100,
                compressionLevel: 6
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
});

module.exports = app;