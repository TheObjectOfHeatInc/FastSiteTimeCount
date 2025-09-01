const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Время старта сервера
const startTime = Date.now();

// Настройка статических файлов
app.use(express.static('.'));

// Функция для форматирования времени
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Функция для создания SVG с таймером
function createTimerSVG(elapsedTime) {
    const currentTime = new Date().toLocaleString('ru-RU');
    const formattedTime = formatTime(elapsedTime);
    
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
  <text x="400" y="120" text-anchor="middle" fill="white" font-family="Arial, sans-serif" 
        font-size="32" font-weight="bold" filter="url(#shadow)">
    🕐 Таймер работает уже:
  </text>
  
  <!-- Время -->
  <text x="400" y="190" text-anchor="middle" fill="white" font-family="Arial, sans-serif" 
        font-size="64" font-weight="bold" filter="url(#shadow)">
    ${formattedTime}
  </text>
  
  <!-- Подпись -->
  <text x="400" y="280" text-anchor="middle" fill="rgba(255,255,255,0.8)" 
        font-family="Arial, sans-serif" font-size="24">
    Обновлено: ${currentTime}
  </text>
  
  <!-- Декоративные элементы -->
  <circle cx="150" cy="320" r="5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="650" cy="320" r="5" fill="rgba(255,255,255,0.3)"/>
  <circle cx="200" cy="80" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="600" cy="80" r="3" fill="rgba(255,255,255,0.4)"/>
</svg>`;
}

// Маршрут для получения изображения таймера
app.get('/timer-image', async (req, res) => {
    try {
        const elapsedTime = Date.now() - startTime;
        const svgString = createTimerSVG(elapsedTime);
        
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
        const elapsedTime = Date.now() - startTime;
        const svgString = createTimerSVG(elapsedTime);
        
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
    const elapsedTime = Date.now() - startTime;
    res.json({
        elapsed: elapsedTime,
        formatted: formatTime(elapsedTime),
        startTime: startTime,
        currentTime: Date.now()
    });
});

// Главная страница с динамическими meta тегами
app.get('/', (req, res) => {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}`;
    const imageUrl = `${fullUrl}/timer-image`;
    
    // Читаем HTML файл
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Заменяем пустой og:url на реальный URL
    html = html.replace('<meta property="og:url" content="">', `<meta property="og:url" content="${fullUrl}">`);
    
    // Заменяем относительные пути на абсолютные для всех вхождений
    html = html.replace(/content="\/timer-image"/g, `content="${imageUrl}"`);
    
    res.send(html);
});

// Функция для сохранения изображения каждую минуту
async function saveTimerImage() {
    try {
        const elapsedTime = Date.now() - startTime;
        const svgString = createTimerSVG(elapsedTime);
        
        // Создаем PNG с помощью Sharp
        const pngBuffer = await sharp(Buffer.from(svgString))
            .png()
            .toBuffer();
        
        // Сохраняем в файл
        fs.writeFileSync('timer-preview.png', pngBuffer);
        console.log(`Изображение обновлено: ${formatTime(elapsedTime)}`);
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
    
    // Создаем первое изображение
    saveTimerImage();
    
    // Устанавливаем интервал обновления каждую минуту (60000 мс)
    setInterval(saveTimerImage, 60000);
});

module.exports = app;