'use strict';

// Небольшие проверки логики без запуска браузера.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = {};
const storage = new Map();
let getResponses = [];
let postResponses = [];
let getCount = 0;
let postBodies = [];

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.attrs = {};
    this.hidden = false;
    this.disabled = false;
    this.className = '';
    this.textContent = '';
    this.handlers = {};
    this.tokens = new Set();
    this.classList = {
      add: name => this.tokens.add(name),
      remove: name => this.tokens.delete(name),
      contains: name => this.tokens.has(name),
      toggle: (name, force) => {
        if (force === true || (force === undefined && !this.tokens.has(name))) {
          this.tokens.add(name);
        } else {
          this.tokens.delete(name);
        }
      }
    };
  }

  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  addEventListener(eventName, callback) { this.handlers[eventName] = callback; }
  append(...items) {
    for (const item of items) {
      if (item.isFragment) {
        this.children.push(...item.children);
      } else {
        this.children.push(item);
      }
    }
  }
  replaceChildren(...items) { this.children = []; this.append(...items); }
  reportValidity() { return true; }
  reset() {
    this.elements.room.value = '';
    this.elements.temperature.value = '';
  }
}

for (const selector of [
  '#gallery-content', '#gallery-grid', '#gallery-loading', '#gallery-empty',
  '#gallery-error', '#refresh-gallery', '#temperature-form', '#send-temperature',
  '#send-button-text', '#form-status', '#theme-toggle', '#theme-text', '#toast',
  '#toast-message', '#toast-icon', '#toast-close'
]) {
  elements[selector] = new Element();
}
elements['#temperature-form'].elements = { room: { value: '' }, temperature: { value: '' } };

const root = new Element();
root.dataset.theme = 'light';
const document = {
  documentElement: root,
  querySelector: selector => elements[selector],
  createElement: () => new Element(),
  createDocumentFragment: () => Object.assign(new Element(), { isFragment: true })
};

function response(status, value) {
  return { ok: status >= 200 && status < 300, status, json: async () => value };
}

const fetch = async (url, options) => {
  if (options.method === 'POST') {
    const body = JSON.parse(options.body);
    postBodies.push(body);
    const answer = postResponses.shift() || response(200, { message: 'Данные сохранены' });
    return answer;
  }
  getCount += 1;
  return getResponses.shift() || response(200, []);
};

const context = {
  window: {
    LAB5_CONFIG: { galleryUrl: '/api/images', temperatureUrl: '/api/temperature', roomField: 'room', temperatureField: 'temperature' },
    location: { href: 'http://localhost:8000/' }
  },
  document,
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  fetch,
  URL,
  Promise,
  AbortController,
  Error,
  Number,
  String,
  setTimeout: (callback, delay) => setTimeout(callback, delay >= 7000 ? 1500 : 1),
  clearTimeout
};

const program = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
getResponses = [response(200, [
  { url: '/assets/gallery-01.svg', title: 'Тест 1', description: 'Описание' },
  { url: '/assets/gallery-02.svg', title: 'Тест 2', description: 'Описание' }
])];
vm.runInNewContext(program, context, { filename: 'script.js' });

function sleep(ms = 25) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function check() {
  await sleep();
  assert.equal(elements['#gallery-grid'].children.length, 2);
  assert.equal(elements['#gallery-content'].attrs['aria-busy'], 'false');
  console.log('✓ GET-запрос и вывод галереи');

  getResponses = [response(503, { error: 'Ошибка' }), response(503, { error: 'Ошибка' }), response(200, [])];
  elements['#refresh-gallery'].handlers.click();
  await sleep(50);
  assert.equal(getCount, 4);
  assert.equal(elements['#gallery-empty'].hidden, false);
  assert.equal(elements['#gallery-empty'].hidden, false);
  console.log('✓ Две неудачные попытки и успешный третий запрос, пустая галерея');

  getResponses = Array.from({ length: 4 }, () => response(503, { error: 'Сервер недоступен' }));
  elements['#refresh-gallery'].handlers.click();
  await sleep(50);
  assert.equal(getCount, 8);
  assert.equal(elements['#gallery-error'].hidden, false);
  assert.equal(elements['#toast'].classList.contains('error'), true);
  console.log('✓ Три повтора и красное уведомление при ошибке');

  const form = elements['#temperature-form'];
  form.elements.room.value = '310';
  form.elements.temperature.value = '22.5';
  postResponses = [response(200, { message: 'Температура записана' })];
  await form.handlers.submit({ preventDefault() {} });
  assert.equal(postBodies[0].room, '310');
  assert.equal(postBodies[0].temperature, 22.5);
  assert.equal(form.elements.room.value, '');
  assert.equal(form.elements.temperature.value, '');
  console.log('✓ POST отправляет строку и число, после успеха очищает форму');

  form.elements.room.value = '204';
  form.elements.temperature.value = '19.6';
  postResponses = [response(422, { error: 'Нельзя сохранить данные' })];
  await form.handlers.submit({ preventDefault() {} });
  assert.equal(form.elements.room.value, '204');
  assert.equal(form.elements.temperature.value, '19.6');
  assert.equal(elements['#toast'].classList.contains('error'), true);
  console.log('✓ При ошибке POST введённые данные не теряются');

  elements['#theme-toggle'].handlers.click();
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(storage.get('lab5-theme'), 'dark');
  elements['#theme-toggle'].handlers.click();
  assert.equal(root.dataset.theme, 'light');
  console.log('✓ Переключение темы и запись в localStorage');

  elements['#toast-close'].handlers.click();
  assert.equal(elements['#toast'].attrs['aria-hidden'], 'true');
  console.log('✓ Уведомление закрывается кнопкой');
}

check().catch(error => { console.error(error); process.exitCode = 1; });
