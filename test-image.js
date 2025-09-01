const sharp = require('sharp');
const fs = require('fs');

// Простой SVG для тестирования
const testSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="400" fill="#667eea"/>
  
  <!-- Тест разных шрифтов -->
  <text x="400" y="100" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="32" font-weight="bold">
    Тест кириллицы: Привет
  </text>
  
  <text x="400" y="150" text-anchor="middle" fill="white" 
        font-family="Courier New, monospace" font-size="48" font-weight="bold">
    Цифры: 123:45:67
  </text>
  
  <text x="400" y="200" text-anchor="middle" fill="white" 
        font-family="DejaVu Sans, sans-serif" font-size="32">
    DejaVu: 12:34:56
  </text>
  
  <text x="400" y="250" text-anchor="middle" fill="white" 
        font-family="serif" font-size="32">
    Serif: 98:76:54
  </text>
  
  <text x="400" y="300" text-anchor="middle" fill="white" 
        font-family="monospace" font-size="32">
    Monospace: 11:22:33
  </text>
</svg>`;

async function testImageGeneration() {
    try {
        console.log('🧪 Тестирование генерации изображения...');
        
        // Тест 1: Базовая генерация
        const pngBuffer1 = await sharp(Buffer.from(testSVG, 'utf8'))
            .png()
            .toBuffer();
        
        fs.writeFileSync('test-basic.png', pngBuffer1);
        console.log('✅ Базовое изображение создано: test-basic.png');
        
        // Тест 2: С высокой плотностью
        const pngBuffer2 = await sharp(Buffer.from(testSVG, 'utf8'), {
            density: 300
        })
            .png({
                quality: 100,
                compressionLevel: 6
            })
            .toBuffer();
        
        fs.writeFileSync('test-hd.png', pngBuffer2);
        console.log('✅ HD изображение создано: test-hd.png');
        
        // Тест 3: Проверка доступных шрифтов
        console.log('\n📋 Информация о системе:');
        console.log('Platform:', process.platform);
        console.log('Node version:', process.version);
        
        // Проверим, есть ли fontconfig
        const { execSync } = require('child_process');
        try {
            const fontList = execSync('fc-list', { encoding: 'utf8' });
            console.log('✅ Fontconfig доступен, найдено шрифтов:', fontList.split('\n').length);
            
            // Ищем конкретные шрифты
            const arialFonts = fontList.split('\n').filter(line => 
                line.toLowerCase().includes('arial') || 
                line.toLowerCase().includes('dejavu') ||
                line.toLowerCase().includes('courier')
            );
            
            if (arialFonts.length > 0) {
                console.log('🔤 Найденные шрифты:');
                arialFonts.slice(0, 5).forEach(font => console.log('  -', font));
            }
        } catch (e) {
            console.log('❌ Fontconfig не найден:', e.message);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

testImageGeneration();
