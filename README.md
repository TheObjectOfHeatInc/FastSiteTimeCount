# Telegram Timer Preview

Таймер с автоматическим превью для Telegram.

## Что это

- Веб-таймер, который начинается с 0 и идет непрерывно
- При отправке ссылки в Telegram показывает превью с актуальным временем
- Одно приложение - фронт + бэк вместе

## Установка на VPS

1. **Установите Docker:**
```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin -y
sudo systemctl start docker
sudo usermod -aG docker $USER
```

2. **Загрузите проект:**
```bash
git clone <репозиторий>
cd SiteTimeCount
chmod +x deploy.sh
```

3. **Запустите:**
```bash
./deploy.sh start
```

4. **Откройте порт:**
```bash
sudo ufw allow 3000
```

## Использование

### Для первого превью:
`http://ваш-сервер:3000`

### Для обновленного превью:
`http://ваш-сервер:3000/refresh`

### Принудительное обновление кэша:
Отправьте ссылку боту @WebpageBot в Telegram

**Важно**: Telegram кэширует превью, поэтому для нового превью используйте `/refresh` эндпоинт!

## Управление

- `./deploy.sh start` - запуск
- `./deploy.sh stop` - остановка  
- `./deploy.sh logs` - логи

## Что получаете

- **http://ваш-сервер:3000** - веб-страница с таймером
- **http://ваш-сервер:3000/timer-image** - PNG изображение
- Автоматическое превью в Telegram