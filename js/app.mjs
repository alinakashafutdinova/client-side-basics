import { VersionManager } from './version-manager.mjs';
import { Rectangle, Square } from './geometry.mjs';
import { Temperature } from './temperature.mjs';
import { createSignal, effect } from './signals.mjs';
import { MOVES, readRound, summarizeRounds } from './game.mjs';
import { LOCAL_SSE_URL, TEACHER_SSE_URL } from './config.mjs';

function getElement(id) {
  return document.getElementById(id);
}

function displayNumber(value) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

// Первое задание — все кнопки работают с одной текущей версией.
let versionManager = null;

function showVersionError(message) {
  const error = getElement('version-error');
  error.textContent = message;
  error.hidden = !message;
}

function updateVersion() {
  getElement('version-value').textContent = versionManager.release();
}

function handleCreateVersion(event) {
  event.preventDefault();
  try {
    versionManager = new VersionManager(getElement('version-input').value.trim() || '0.0.1');
    getElement('version-output').hidden = false;
    updateVersion();
    showVersionError('');
  } catch (error) {
    showVersionError(error.message);
    getElement('version-output').hidden = true;
  }
}

function changeVersion(action) {
  try {
    versionManager[action]();
    updateVersion();
    showVersionError('');
  } catch (error) {
    showVersionError(error.message);
  }
}

function handleMajorClick() { changeVersion('major'); }
function handleMinorClick() { changeVersion('minor'); }
function handlePatchClick() { changeVersion('patch'); }
function handleRollbackClick() { changeVersion('rollback'); }

getElement('version-form').addEventListener('submit', handleCreateVersion);
getElement('version-major').addEventListener('click', handleMajorClick);
getElement('version-minor').addEventListener('click', handleMinorClick);
getElement('version-patch').addEventListener('click', handlePatchClick);
getElement('version-rollback').addEventListener('click', handleRollbackClick);

// Второе задание — обычный класс и наследующийся от него квадрат.
function showGeometry(action) {
  const widthField = getElement('shape-width');
  const heightField = getElement('shape-height');
  const width = Number(widthField.value);
  const height = Number(heightField.value);
  const result = getElement('shape-result');
  const output = getElement('shape-value');
  const label = getElement('shape-kind');
  const description = getElement('shape-measure');
  const sketch = result.querySelector('.shape-sketch');
  try {
    if (!widthField.value || !heightField.value) {
      throw new RangeError('Заполните оба размера фигуры');
    }
    const square = width === height;
    const shape = square ? new Square(width) : new Rectangle(width, height);
    const value = action === 'area' ? shape.getArea() : shape.getPerimeter();
    label.textContent = square ? 'Квадрат' : 'Прямоугольник';
    output.textContent = displayNumber(value);
    description.textContent = action === 'area' ? 'Площадь фигуры' : 'Периметр фигуры';
    sketch.style.aspectRatio = `${Math.max(1, width)} / ${Math.max(1, height)}`;
    sketch.style.maxWidth = square ? '52px' : '74px';
    result.classList.remove('has-error');
  } catch (error) {
    label.textContent = 'Не получилось рассчитать';
    output.textContent = '—';
    description.textContent = error.message;
    result.classList.add('has-error');
  }
}

function handleAreaClick() { showGeometry('area'); }
function handlePerimeterClick() { showGeometry('perimeter'); }
getElement('shape-area').addEventListener('click', handleAreaClick);
getElement('shape-perimeter').addEventListener('click', handlePerimeterClick);

// Третье задание — одновременно показываю конвертацию двух температур.
function selectedUnit() {
  return document.querySelector('input[name="temperature-unit"]:checked').value;
}

function formatTemperature(temperature, unit) {
  if (unit === 'F') {
    return `${displayNumber(temperature.fahrenheit)} °F`;
  }
  if (unit === 'K') {
    return `${displayNumber(temperature.kelvin)} K`;
  }
  return `${displayNumber(temperature.celsius)} °C`;
}

function readTemperature(fieldId, errorId) {
  const field = getElement(fieldId);
  const errorText = getElement(errorId);
  try {
    if (!field.value.trim()) {
      throw new Error('Введите температуру');
    }
    const temperature = new Temperature(Number(field.value));
    errorText.hidden = true;
    errorText.textContent = '';
    return temperature;
  } catch (error) {
    errorText.textContent = error.message;
    errorText.hidden = false;
    return null;
  }
}

function refreshTemperatureDisplays() {
  const first = readTemperature('temperature-first', 'temperature-first-error');
  const second = readTemperature('temperature-second', 'temperature-second-error');
  getElement('temperature-first-display').textContent = first ? formatTemperature(first, selectedUnit()) : '—';
  getElement('temperature-second-display').textContent = second ? formatTemperature(second, selectedUnit()) : '—';
}

function showTemperatureOperation(operation) {
  const first = readTemperature('temperature-first', 'temperature-first-error');
  const second = readTemperature('temperature-second', 'temperature-second-error');
  const output = getElement('temperature-value');
  const note = getElement('temperature-note');
  if (!first || !second) {
    output.textContent = '—';
    note.textContent = 'Проверьте введённые значения';
    return;
  }
  try {
    const result = operation === 'add' ? Temperature.add(first, second) : Temperature.subtract(first, second);
    output.textContent = formatTemperature(result, selectedUnit());
    note.textContent = operation === 'add' ? 'Сумма температур' : 'Разность температур';
  } catch (error) {
    output.textContent = '—';
    note.textContent = error.message;
  }
}

function handleTemperatureInput() { refreshTemperatureDisplays(); }
function handleTemperatureAdd() { showTemperatureOperation('add'); }
function handleTemperatureSubtract() { showTemperatureOperation('subtract'); }
getElement('temperature-first').addEventListener('input', handleTemperatureInput);
getElement('temperature-second').addEventListener('input', handleTemperatureInput);
for (const button of document.querySelectorAll('input[name="temperature-unit"]')) {
  button.addEventListener('change', handleTemperatureInput);
}
getElement('temperature-add').addEventListener('click', handleTemperatureAdd);
getElement('temperature-subtract').addEventListener('click', handleTemperatureSubtract);
refreshTemperatureDisplays();

// Четвёртое задание — события сервера записываю в сигнал, интерфейс обновляют эффекты.
const [rounds, setRounds] = createSignal([]);
const [connection, setConnection] = createSignal('Трансляция не запущена');
let eventSource = null;

effect(function renderScores() {
  const allRounds = rounds();
  const stats = summarizeRounds(allRounds);
  getElement('round-count').textContent = String(allRounds.length);
  getElement('player1-wins').textContent = String(stats.wins1);
  getElement('player2-wins').textContent = String(stats.wins2);
  getElement('draw-count').textContent = String(stats.draws);
});

effect(function renderMoveStatistics() {
  const stats = summarizeRounds(rounds());
  for (const [move] of Object.entries(MOVES)) {
    getElement(`p1-${move}`).textContent = String(stats.player1[move]);
    getElement(`p2-${move}`).textContent = String(stats.player2[move]);
  }
});

effect(function renderLastRound() {
  const allRounds = rounds();
  const last = allRounds[allRounds.length - 1];
  if (!last) {
    getElement('last-round').textContent = 'Пока нет сыгранных раундов.';
    return;
  }
  const result = last.winner === 'draw' ? 'Ничья' : last.winner === 'player1' ? 'Победил игрок 1' : 'Победил игрок 2';
  getElement('last-round').textContent = `Игрок 1: ${MOVES[last.player1]}; игрок 2: ${MOVES[last.player2]}. ${result}.`;
});

effect(function renderHistory() {
  const allRounds = rounds();
  getElement('history-empty').hidden = allRounds.length !== 0;
  const fragment = document.createDocumentFragment();
  const recentRounds = allRounds.slice(-25).reverse();
  recentRounds.forEach(function addRoundItem(round, index) {
    const item = document.createElement('li');
    const number = allRounds.length - index;
    const result = round.winner === 'draw' ? 'ничья' : round.winner === 'player1' ? 'победил игрок 1' : 'победил игрок 2';
    item.textContent = `Раунд ${number}: ${MOVES[round.player1]} — ${MOVES[round.player2]}, ${result}`;
    fragment.appendChild(item);
  });
  getElement('round-history').replaceChildren(fragment);
});

effect(function renderConnection() {
  const status = connection();
  getElement('connection-status').textContent = status;
  getElement('connection-dot').classList.toggle('is-connected', status === 'Подключено. Ожидаем новые раунды…');
});

function handleRoundEvent(event) {
  try {
    const round = readRound(JSON.parse(event.data));
    setRounds([...rounds(), round]);
    setConnection('Подключено. Ожидаем новые раунды…');
  } catch (error) {
    setConnection(`Не удалось прочитать раунд: ${error.message}`);
  }
}

function handleStreamOpen() {
  setConnection('Подключено. Ожидаем новые раунды…');
}

function stopStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  getElement('stream-start').disabled = false;
  getElement('stream-stop').disabled = true;
}

function handleStreamError() {
  stopStream();
  setConnection('Ошибка подключения. Проверьте сервер и попробуйте снова.');
}

function handleStreamStart() {
  stopStream();
  const source = getElement('stream-source').value;
  const url = source === 'teacher' ? TEACHER_SSE_URL : LOCAL_SSE_URL;
  if (!url) {
    setConnection('Укажите адрес сервера преподавателя в js/config.mjs.');
    return;
  }
  setRounds([]);
  setConnection('Подключаемся…');
  eventSource = new EventSource(url);
  eventSource.addEventListener('open', handleStreamOpen);
  eventSource.addEventListener('round', handleRoundEvent);
  eventSource.addEventListener('error', handleStreamError);
  getElement('stream-start').disabled = true;
  getElement('stream-stop').disabled = false;
}

function handleStreamStop() {
  stopStream();
  setConnection('Трансляция остановлена');
}

getElement('stream-start').addEventListener('click', handleStreamStart);
getElement('stream-stop').addEventListener('click', handleStreamStop);
window.addEventListener('pagehide', stopStream);
