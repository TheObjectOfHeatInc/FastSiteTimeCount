const express = require('express');
const path = require('path');
const fs = require('fs');

// Пытаемся импортировать puppeteer, если установлен
let generateTimerImage = null;
try {
    const puppeteer = require('puppeteer');
    
    generateTimerImage = async function() {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Устанавливаем размер viewport для превью Telegram
        await page.setViewport({
            width: 1200,
            height: 630,
            deviceScaleFactor: 1
        });
        
        // Создаем HTML с текущим временем
        const now = new Date();
        const timeString = formatTime(now);
        const dateString = formatDate(now);
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    width: 1200px;
                    height: 630px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: Arial, sans-serif;
                    position: relative;
                    overflow: hidden;
                }
                
                .content {
                    text-align: center;
                    z-index: 10;
                }
                
                .title {
                    font-size: 100px;
                    font-weight: bold;
                    margin-bottom: 40px;
                    text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.4);
                }
                
                .time {
                    font-size: 160px;
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.4);
                    margin-bottom: 20px;
                }
                
                .date {
                    font-size: 60px;
                    font-weight: bold;
                    opacity: 0.9;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
                    margin-bottom: 30px;
                }
                
                .subtitle {
                    font-size: 36px;
                    font-weight: bold;
                    opacity: 0.8;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
                }
                
                .decorations {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                
                .star {
                    position: absolute;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                }
            </style>
        </head>
        <body>
            <div class="decorations">
                ${Array.from({ length: 150 }, (_, i) => {
                    const x = Math.random() * 1200;
                    const y = Math.random() * 630;
                    const size = Math.random() * 8 + 2;
                    return `<div class="star" style="left: ${x}px; top: ${y}px; width: ${size}px; height: ${size}px;"></div>`;
                }).join('')}
            </div>
            
            <div class="content">
                <div class="title">⏰ Таймер</div>
                <div class="time">${timeString}</div>
                <div class="date">${dateString}</div>
                <div class="subtitle">Обновляется каждую минуту</div>
            </div>
        </body>
        </html>
        `;
        
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        
        // Делаем скриншот
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false
        });
        
        await browser.close();
        return screenshot;
    };
    
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    
    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
    
    console.log('✅ Puppeteer подключен - изображения будут генерироваться динамически');
} catch (error) {
    console.log('⚠️  Puppeteer не установлен - используется статическое изображение');
    console.log('Для динамической генерации установите: npm install puppeteer');
}

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

// Маршрут для генерации PNG изображения таймера
app.get('/timer-preview.png', async (req, res) => {
    try {
        if (generateTimerImage) {
            // Генерируем изображение динамически
            const imageBuffer = await generateTimerImage();
            
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(imageBuffer);
            
            console.log(`🖼️  Изображение таймера сгенерировано: ${new Date().toLocaleTimeString('ru-RU')}`);
        } else {
            // Отправляем статическое изображение
            res.sendFile(path.join(__dirname, 'timer-preview.png'));
        }
    } catch (error) {
        console.error('Ошибка генерации изображения:', error);
        res.status(500).send('Ошибка генерации изображения');
    }
});

// Маршрут для старого формата
app.get('/timer-image.png', (req, res) => {
    res.redirect('/timer-preview.png');
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
