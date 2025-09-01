const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
    
    return `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>
  
  <!-- Фон -->
  <rect width="800" height="400" fill="url(#bgGradient)"/>
  
  <!-- Полупрозрачный контейнер -->
  <rect x="50" y="50" width="700" height="300" fill="rgba(255,255,255,0.1)" rx="20"/>
  
  <!-- Заголовок -->
  <text x="400" y="100" text-anchor="middle" fill="white" font-family="Arial, sans-serif" 
        font-size="28" font-weight="bold" filter="url(#shadow)">
    ⏰ До 11 сентября 2025 осталось:
  </text>
  
  <!-- Время -->
  <text x="400" y="180" text-anchor="middle" fill="white" font-family="Arial, sans-serif" 
        font-size="58" font-weight="bold" filter="url(#shadow)">
    ${formattedTime}
  </text>
  
  <!-- Подпись -->
  <text x="400" y="250" text-anchor="middle" fill="rgba(255,255,255,0.8)" 
        font-family="Arial, sans-serif" font-size="20">
    Целевая дата: ${targetDate}
  </text>
  
  <!-- Время обновления -->
  <text x="400" y="310" text-anchor="middle" fill="rgba(255,255,255,0.6)" 
        font-family="Arial, sans-serif" font-size="18">
    Обновлено: ${currentTime}
  </text>
  
  <!-- Декоративные элементы -->
  <circle cx="150" cy="350" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="650" cy="350" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="200" cy="60" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="600" cy="60" r="3" fill="rgba(255,255,255,0.4)"/>
</svg>`;
}

// Маршрут для получения изображения таймера
app.get('/timer-image', async (req, res) => {
    try {
        const svgString = createTimerSVG();
        
        // Конвертируем SVG в PNG с помощью Sharp
        const pngBuffer = await sharp(Buffer.from(svgString))
            .png()
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

// Специальный эндпоинт для обновления Telegram превью
app.get('/refresh', (req, res) => {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}`;
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
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}`;
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
        
        // Создаем PNG с помощью Sharp
        const pngBuffer = await sharp(Buffer.from(svgString))
            .png()
            .toBuffer();
        
        // Сохраняем в файл
        fs.writeFileSync('timer-preview.png', pngBuffer);
        console.log(`Изображение обновлено. До 11.09.2025 осталось: ${formatTime(remaining)}`);
    } catch (error) {
        console.error('Ошибка сохранения изображения:', error);
    }
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Открыть в браузере: http://localhost:${PORT}`);
    console.log(`Изображение таймера: http://localhost:${PORT}/timer-image`);
    console.log(`SVG таймера: http://localhost:${PORT}/timer-svg`);
    console.log(`Целевая дата: ${new Date(TARGET_DATE).toLocaleString('ru-RU')}`);
    console.log(`До 11 сентября 2025 осталось: ${formatTime(getTimeRemaining())}`);
    
    // Создаем первое изображение
    saveTimerImage();
    
    // Устанавливаем интервал обновления каждую минуту (60000 мс)
    setInterval(saveTimerImage, 60000);
});

module.exports = app;