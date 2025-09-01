const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для обработки ngrok
app.use((req, res, next) => {
    // Разрешаем все хосты для ngrok
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Статические файлы
app.use(express.static('.'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Маршрут для генерации изображения таймера
app.get('/timer-image.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'timer-image.html'));
});

// Маршрут для SVG изображения
app.get('/timer-image.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'timer-image.svg'));
});

// Маршрут для обработки ngrok
app.get('/ngrok', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ngrok tunnel is working',
        timestamp: new Date().toISOString()
    });
});

// API для получения текущего времени
app.get('/api/time', (req, res) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('ru-RU');
    
    res.json({
        time: timeString,
        date: dateString,
        timestamp: now.getTime()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Открой: http://localhost:${PORT}`);
    console.log(`🌐 Для ngrok используй: ngrok http ${PORT}`);
});
