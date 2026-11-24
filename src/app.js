import { runBenchmark } from './benchmark.js';
import { SIZES, ITERATIONS, METHODS } from './methods.js';
import { findFastest, formatMilliseconds, intervalsDoNotOverlap } from './stats.js';
import { buildCsv, buildReport } from './report.js';

const host = document.querySelector('#benchmark-host');
const startButton = document.querySelector('#start-test');
const progressWrap = document.querySelector('#progress-wrap');
const progressLabel = document.querySelector('#progress-label');
const progressCount = document.querySelector('#progress-count');
const progressBar = document.querySelector('#progress');
const emptyResult = document.querySelector('#empty-result');
const resultContent = document.querySelector('#result-content');
const resultsBody = document.querySelector('#results-body');
const charts = document.querySelector('#charts');
const conclusion = document.querySelector('#conclusion');
const runStatus = document.querySelector('#run-status');
let latestData = null;

function setProgress({ completed, total, method, count }) {
  progressLabel.textContent = `Проверка: ${method.label} · ${count.toLocaleString('ru-RU')} элементов`;
  progressCount.textContent = `${completed} / ${total}`;
  progressBar.value = completed;
}

function createCell(text, className = '') {
  const cell = document.createElement('td');
  cell.textContent = String(text);
  if (className) { cell.className = className; }
  return cell;
}

function displayTable(data) {
  const fragment = document.createDocumentFragment();
  for (const row of data.results) {
    const element = document.createElement('tr');
    const sameGroup = data.results.filter(other => other.operation === row.operation && other.elements === row.elements);
    const best = findFastest(sameGroup).id === row.id;
    element.append(
      createCell(row.operation),
      createCell(row.method, best ? 'fastest' : ''),
      createCell(row.elements.toLocaleString('ru-RU'), 'numeric'),
      createCell(row.count, 'numeric'),
      createCell(formatMilliseconds(row.mean), 'numeric'),
      createCell(formatMilliseconds(row.standardDeviation), 'numeric'),
      createCell(`[${formatMilliseconds(row.confidenceLow)}; ${formatMilliseconds(row.confidenceHigh)}]`, 'numeric')
    );
    fragment.appendChild(element);
  }
  resultsBody.replaceChildren(fragment);
}

function displayCharts(data) {
  const fragment = document.createDocumentFragment();
  for (const operation of ['Добавление', 'Удаление']) {
    for (const elements of SIZES) {
      const rows = data.results.filter(row => row.operation === operation && row.elements === elements);
      const max = Math.max(...rows.map(row => row.mean));
      const best = findFastest(rows);
      const card = document.createElement('div');
      card.className = 'chart-card';
      const title = document.createElement('h4');
      title.textContent = `${operation} · ${elements.toLocaleString('ru-RU')} элементов`;
      card.appendChild(title);
      for (const row of rows) {
        const line = document.createElement('div');
        line.className = 'chart-row';
        const name = document.createElement('span');
        name.className = 'chart-name';
        name.textContent = row.method;
        name.title = row.method;
        const rail = document.createElement('div');
        rail.className = 'bar-rail';
        const fill = document.createElement('div');
        fill.className = row.id === best.id ? 'bar-fill best' : 'bar-fill';
        fill.style.width = `${Math.max(1, row.mean / max * 100)}%`;
        rail.appendChild(fill);
        const time = document.createElement('span');
        time.className = 'chart-time';
        time.textContent = `${formatMilliseconds(row.mean)} мс`;
        line.append(name, rail, time);
        card.appendChild(line);
      }
      fragment.appendChild(card);
    }
  }
  charts.replaceChildren(fragment);
}

function displayConclusion(data) {
  const heading = document.createElement('h3');
  heading.textContent = 'Краткие выводы';
  const fragment = document.createDocumentFragment();
  fragment.appendChild(heading);
  for (const operation of ['Добавление', 'Удаление']) {
    for (const elements of SIZES) {
      const rows = data.results.filter(row => row.operation === operation && row.elements === elements);
      const fastest = findFastest(rows);
      const slowest = [...rows].sort((a, b) => b.mean - a.mean)[0];
      const significant = intervalsDoNotOverlap(fastest, slowest);
      const line = document.createElement('p');
      line.textContent = `${operation} (${elements.toLocaleString('ru-RU')}): быстрее всего ${fastest.method} — ${formatMilliseconds(fastest.mean)} мс. Интервалы самого быстрого и самого медленного метода ${significant ? 'не пересекаются' : 'пересекаются'}.`;
      fragment.appendChild(line);
    }
  }
  conclusion.replaceChildren(fragment);
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function onDownloadCsv() {
  if (latestData) { downloadText('lab7_results.csv', '\uFEFF' + buildCsv(latestData), 'text/csv;charset=utf-8'); }
}
function onDownloadJson() {
  if (latestData) { downloadText('lab7_results.json', JSON.stringify(latestData, null, 2), 'application/json;charset=utf-8'); }
}
function onDownloadReport() {
  if (latestData) { downloadText('REPORT.md', buildReport(latestData), 'text/markdown;charset=utf-8'); }
}

async function onStartClick() {
  startButton.disabled = true;
  progressWrap.hidden = false;
  resultContent.hidden = true;
  emptyResult.hidden = false;
  runStatus.textContent = 'Идут измерения';
  const total = METHODS.length * SIZES.length * ITERATIONS;
  progressBar.max = total;
  progressBar.value = 0;
  try {
    latestData = await runBenchmark(host, setProgress);
    displayTable(latestData);
    displayCharts(latestData);
    displayConclusion(latestData);
    emptyResult.hidden = true;
    resultContent.hidden = false;
    runStatus.textContent = 'Измерения завершены';
    progressLabel.textContent = 'Готово. Все 16 серий выполнены.';
    progressCount.textContent = `${total} / ${total}`;
  } catch (error) {
    runStatus.textContent = 'Ошибка измерений';
    progressLabel.textContent = `Не удалось провести эксперимент: ${error.message}`;
    latestData = null;
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Повторить измерения';
  }
}

startButton.addEventListener('click', onStartClick);
document.querySelector('#download-csv').addEventListener('click', onDownloadCsv);
document.querySelector('#download-json').addEventListener('click', onDownloadJson);
document.querySelector('#download-report').addEventListener('click', onDownloadReport);
