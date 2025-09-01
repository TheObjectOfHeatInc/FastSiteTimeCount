#!/bin/bash

echo "🚀 Запуск Telegram Timer"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"  
    exit 1
fi

# Создание директорий
mkdir -p images

case "$1" in
    "start")
        echo "🔨 Сборка и запуск..."
        docker-compose down
        docker-compose build
        # Устанавливаем переменные окружения для продакшена
        export NODE_ENV=production
        export BASE_URL=https://lehagigachad.ru
        docker-compose up -d
        echo "✅ Запущено на https://lehagigachad.ru"
        ;;
    "stop")
        echo "🛑 Остановка..."
        docker-compose down
        echo "✅ Остановлено"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    *)
        echo "Использование: $0 {start|stop|logs}"
        echo "  start - Запуск приложения"
        echo "  stop  - Остановка"
        echo "  logs  - Показать логи"
        ;;
esac