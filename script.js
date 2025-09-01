// Функция для форматирования времени
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Функция для форматирования даты
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Функция для обновления времени на странице
function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('time');
    const dateElement = document.getElementById('date');
    
    if (timeElement) {
        timeElement.textContent = formatTime(now);
    }
    
    if (dateElement) {
        dateElement.textContent = formatDate(now);
    }
    
    // Обновляем мета-теги для превью в Telegram
    updateMetaTags(now);
}

// Функция для обновления мета-тегов
function updateMetaTags(date) {
    const timeString = formatTime(date);
    const dateString = formatDate(date);
    const description = `Текущее время: ${timeString} | ${dateString}`;
    
    // Обновляем Open Graph теги
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    
    // Обновляем Twitter теги
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    
    if (ogTitle) ogTitle.setAttribute('content', `⏰ Таймер - ${timeString}`);
    if (ogDescription) ogDescription.setAttribute('content', description);
    if (ogImage) ogImage.setAttribute('content', `https://theobjectofheatinc.github.io/FastSiteTimeCount/timer-preview.png?t=${Date.now()}`);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    
    if (twitterTitle) twitterTitle.setAttribute('content', `⏰ Таймер - ${timeString}`);
    if (twitterDescription) twitterDescription.setAttribute('content', description);
    if (twitterImage) twitterImage.setAttribute('content', `https://theobjectofheatinc.github.io/FastSiteTimeCount/timer-preview.png?t=${Date.now()}`);
}

// Функция для получения параметров из URL
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Проверяем, находимся ли мы на странице генерации картинки
const isPreviewPage = window.location.pathname.includes('timer-image.html');

if (isPreviewPage) {
    // Если это страница для превью, показываем только картинку
    document.body.innerHTML = `
        <div class="preview-page">
            <div class="preview-content">
                <div class="preview-title">Таймер</div>
                <div class="preview-time" id="preview-time">00:00:00</div>
                <div class="preview-date" id="preview-date">01.01.2024</div>
            </div>
        </div>
    `;
    
    // Обновляем время на странице превью
    function updatePreviewTime() {
        const now = new Date();
        const timeElement = document.getElementById('preview-time');
        const dateElement = document.getElementById('preview-date');
        
        if (timeElement) {
            timeElement.textContent = formatTime(now);
        }
        
        if (dateElement) {
            dateElement.textContent = formatDate(now);
        }
    }
    
    updatePreviewTime();
    setInterval(updatePreviewTime, 1000);
} else {
    // Основная страница
    // Обновляем время сразу при загрузке
    updateTime();
    
    // Обновляем время каждую секунду
    setInterval(updateTime, 1000);
    
    // Обновляем мета-теги каждую минуту для превью в Telegram
    setInterval(() => {
        updateMetaTags(new Date());
    }, 60000);
}
