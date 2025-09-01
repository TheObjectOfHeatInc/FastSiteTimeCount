const { createCanvas } = require('canvas');
const fs = require('fs');

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

function generateTimerImage() {
    // Создаем canvas размером для Telegram превью
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    const now = new Date();
    const timeString = formatTime(now);
    const dateString = formatDate(now);
    
    // Создаем градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    // Заливаем фон
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // Добавляем декоративные элементы (звездочки)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * 1200;
        const y = Math.random() * 630;
        const radius = Math.random() * 4 + 1;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Настройки тени
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    // Рисуем заголовок
    ctx.fillStyle = 'white';
    ctx.font = 'bold 100px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏰ Таймер', 600, 150);
    
    // Рисуем время
    ctx.font = 'bold 160px "Courier New", monospace';
    ctx.fillText(timeString, 600, 300);
    
    // Рисуем дату
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(dateString, 600, 420);
    
    // Добавляем подпись
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Обновляется в реальном времени', 600, 520);
    
    // Убираем тени
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    return canvas;
}

function saveImage() {
    try {
        console.log('🎨 Генерируем изображение таймера...');
        
        const canvas = generateTimerImage();
        const buffer = canvas.toBuffer('image/png');
        
        // Сохраняем файл
        fs.writeFileSync('timer-preview.png', buffer);
        
        const now = new Date();
        const timeString = formatTime(now);
        const dateString = formatDate(now);
        
        console.log('✅ Изображение сохранено как timer-preview.png');
        console.log(`🕐 Время: ${timeString}`);
        console.log(`📅 Дата: ${dateString}`);
        console.log('📏 Размер: 1200x630 пикселей');
        console.log('');
        console.log('Теперь можете загрузить файл в git:');
        console.log('git add timer-preview.png');
        console.log('git commit -m "Update timer preview image"');
        console.log('git push');
        
    } catch (error) {
        console.error('❌ Ошибка при генерации изображения:', error.message);
        console.log('');
        console.log('Попробуйте установить зависимости:');
        console.log('npm install');
    }
}

// Если скрипт запущен напрямую
if (require.main === module) {
    saveImage();
}

module.exports = { generateTimerImage, saveImage };
