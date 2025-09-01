# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости для Sharp, Canvas и шрифты
RUN apk add --no-cache \
    vips-dev \
    pkgconfig \
    build-base \
    python3 \
    make \
    g++ \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    ttf-opensans \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    pixman-dev

# Копируем package.json и package-lock.json
COPY package*.json ./

# Обновляем кэш шрифтов
RUN fc-cache -f -v

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем остальные файлы приложения
COPY . .

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Создаем директорию для изображений и даем права
RUN mkdir -p /app/images && chown -R nextjs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nextjs

# Открываем порт
EXPOSE 3000

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Команда запуска
CMD ["npm", "start"]
