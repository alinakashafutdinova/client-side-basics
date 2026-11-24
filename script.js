'use strict';

// Лабораторная №5: получение данных, отправка формы и работа с localStorage.
const config = window.LAB5_CONFIG;
const galleryContent = document.querySelector('#gallery-content');
const galleryGrid = document.querySelector('#gallery-grid');
const galleryLoading = document.querySelector('#gallery-loading');
const galleryEmpty = document.querySelector('#gallery-empty');
const galleryError = document.querySelector('#gallery-error');
const refreshButton = document.querySelector('#refresh-gallery');
const temperatureForm = document.querySelector('#temperature-form');
const submitButton = document.querySelector('#send-temperature');
const submitButtonText = document.querySelector('#send-button-text');
const formStatus = document.querySelector('#form-status');
const themeButton = document.querySelector('#theme-toggle');
const themeText = document.querySelector('#theme-text');
const toast = document.querySelector('#toast');
const toastMessage = document.querySelector('#toast-message');
const toastIcon = document.querySelector('#toast-icon');
const toastClose = document.querySelector('#toast-close');

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 7000;
let galleryIsLoading = false;
let temperatureIsSending = false;

// Универсальное уведомление: зелёное при успехе и красное при ошибке.
function showToast(message, type = 'success') {
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');
  toast.inert = false;
  toast.setAttribute('aria-hidden', 'false');
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toastMessage.textContent = message;
  toastIcon.textContent = type === 'error' ? '!' : '✓';
}

function closeToast() {
  toast.classList.remove('show');
  toast.inert = true;
  toast.setAttribute('aria-hidden', 'true');
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// Если сервер прислал HTTP-ошибку, fetch всё равно выполняется успешно.
// Поэтому отдельно проверяю response.ok и сообщение от сервера.
async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json();

    if (!response.ok) {
      const serverMessage = payload && (payload.error || payload.message);
      throw new Error(serverMessage || `Ошибка сервера: ${response.status}`);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Сервер слишком долго не отвечает.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Начальная попытка + максимум три повторных запроса с небольшой паузой.
async function fetchGalleryWithRetries() {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetchJson(config.galleryUrl, { cache: 'no-store' });
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await wait(550 * (attempt + 1));
    }
  }
  throw new Error('Не удалось получить изображения.');
}

function setGalleryState(state) {
  galleryLoading.hidden = state !== 'loading';
  galleryGrid.hidden = state !== 'ready';
  galleryEmpty.hidden = state !== 'empty';
  galleryError.hidden = state !== 'error';
  galleryContent.setAttribute('aria-busy', String(state === 'loading'));
}

// Данные для галереи ожидаются в виде массива объектов с адресом изображения.
// Поддерживаю и формат { images: [...] }, чтобы ответ было проще подключить.
function normalizeImages(payload) {
  const items = Array.isArray(payload) ? payload : (payload && (payload.images || payload.data));
  if (!Array.isArray(items)) {
    throw new Error('Сервер вернул данные в неподходящем формате.');
  }

  return items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error('В ответе сервера найдено неверное изображение.');
    }

    const source = item.url || item.image || item.src || item.image_url;
    if (typeof source !== 'string' || !source.trim()) {
      throw new Error('Сервер не указал адрес одного из изображений.');
    }

    const url = new URL(source, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Сервер указал неподдерживаемый адрес изображения.');
    }

    return {
      url: url.href,
      title: String(item.title || item.name || `Изображение №${index + 1}`),
      description: String(item.description || item.caption || 'Изображение из галереи')
    };
  });
}

function renderGallery(items) {
  const fragment = document.createDocumentFragment();

  for (const image of items) {
    const card = document.createElement('article');
    const photo = document.createElement('img');
    const body = document.createElement('div');
    const title = document.createElement('h3');
    const description = document.createElement('p');

    card.className = 'gallery-card';
    body.className = 'gallery-card-body';
    photo.src = image.url;
    photo.alt = image.title;
    photo.loading = 'lazy';
    photo.width = 600;
    photo.height = 400;
    title.textContent = image.title;
    description.textContent = image.description;

    body.append(title, description);
    card.append(photo, body);
    fragment.append(card);
  }

  galleryGrid.replaceChildren(fragment);
}

async function loadGallery(showSuccessMessage = false) {
  if (galleryIsLoading) {
    return;
  }

  galleryIsLoading = true;
  refreshButton.disabled = true;
  setGalleryState('loading');

  try {
    const payload = await fetchGalleryWithRetries();
    const images = normalizeImages(payload);

    if (images.length === 0) {
      galleryGrid.replaceChildren();
      setGalleryState('empty');
    } else {
      renderGallery(images);
      setGalleryState('ready');
    }

    if (showSuccessMessage) {
      showToast(images.length === 0 ? 'Галерея обновлена. Изображений пока нет.' : 'Галерея успешно обновлена.');
    }
  } catch (error) {
    galleryGrid.replaceChildren();
    setGalleryState('error');
    showToast(`Не удалось загрузить изображения. ${error.message}`, 'error');
  } finally {
    galleryIsLoading = false;
    refreshButton.disabled = false;
  }
}

function handleRefreshGallery() {
  loadGallery(true);
}

function setTemperaturePending(isPending) {
  temperatureIsSending = isPending;
  submitButton.disabled = isPending;
  temperatureForm.setAttribute('aria-busy', String(isPending));
  submitButtonText.textContent = isPending ? 'Отправка…' : 'Отправить данные';
  formStatus.textContent = isPending ? 'Дождитесь ответа сервера.' : '';
}

// Из формы получаю строку для аудитории и число для температуры.
async function handleTemperatureSubmit(event) {
  event.preventDefault();

  if (temperatureIsSending || !temperatureForm.reportValidity()) {
    return;
  }

  const room = String(temperatureForm.elements.room.value).trim();
  const temperature = Number(temperatureForm.elements.temperature.value);
  if (!room || !Number.isFinite(temperature)) {
    showToast('Проверьте номер аудитории и температуру.', 'error');
    return;
  }

  const values = {
    [config.roomField]: room,
    [config.temperatureField]: temperature
  };

  setTemperaturePending(true);
  try {
    const result = await fetchJson(config.temperatureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    showToast(result.message || 'Данные успешно отправлены.');
    temperatureForm.reset();
  } catch (error) {
    // При ошибке оставляю введённые значения, чтобы их не пришлось набирать снова.
    showToast(error.message || 'Не удалось отправить данные.', 'error');
  } finally {
    setTemperaturePending(false);
  }
}

function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
  themeText.textContent = dark ? 'Светлая тема' : 'Тёмная тема';
}

function handleThemeToggle() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const nextTheme = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem('lab5-theme', nextTheme);
  } catch {
    // Если хранилище недоступно, тема всё равно переключается до обновления.
  }
  updateThemeButton();
}

refreshButton.addEventListener('click', handleRefreshGallery);
temperatureForm.addEventListener('submit', handleTemperatureSubmit);
themeButton.addEventListener('click', handleThemeToggle);
toastClose.addEventListener('click', closeToast);

updateThemeButton();
loadGallery();
