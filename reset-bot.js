const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.log('❌ BOT_TOKEN не найден!');
    console.log('Используйте: BOT_TOKEN="ваш_токен" node reset-bot.js');
    process.exit(1);
}

async function resetBot() {
    try {
        console.log('🔄 Сброс Telegram бота...');
        
        const bot = new TelegramBot(BOT_TOKEN);
        
        // Удаляем webhook если он был установлен
        console.log('📡 Удаляю webhook...');
        await bot.deleteWebHook();
        
        // Очищаем pending updates
        console.log('🧹 Очищаю pending updates...');
        await bot.getUpdates({ offset: -1, limit: 1 });
        
        // Получаем информацию о боте
        console.log('ℹ️ Информация о боте...');
        const me = await bot.getMe();
        console.log(`✅ Бот: @${me.username} (${me.first_name})`);
        
        // Проверяем webhook статус
        console.log('🔍 Проверяю webhook статус...');
        const webhookInfo = await bot.getWebHookInfo();
        console.log('📋 Webhook info:', {
            url: webhookInfo.url || 'не установлен',
            pending_updates: webhookInfo.pending_update_count
        });
        
        console.log('✅ Сброс завершён! Теперь можно запускать бота.');
        
    } catch (error) {
        console.log('❌ Ошибка при сбросе:', error.message);
    }
}

resetBot();
