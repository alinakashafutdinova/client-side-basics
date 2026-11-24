import { findFastest, formatMilliseconds, intervalsDoNotOverlap } from './stats.js';

const format = formatMilliseconds;

export function buildReport(data) {
  const lines = [
    '# Лабораторная работа №7. Сравнение методов работы с DOM',
    '',
    '**Дисциплина:** Основы веб-разработки на стороне клиента  ',
    '**Студентка:** Кашафутдинова Алина Тимуровна  ',
    '**Группа:** 257-321',
    '',
    '## Цель работы',
    '',
    'Сравнить скорость добавления и удаления элементов DOM разными способами с помощью Performance API и обработать результаты измерений.',
    '',
    '## Методика',
    '',
    `- Дата запуска: ${data.timestamp}.`,
    `- Браузер: ${data.userAgent}.`,
    `- Размеры выборки: ${data.sizes.map(value => value.toLocaleString('ru-RU')).join(' и ')} элементов.`,
    `- Прогрев: ${data.warmups} запусков перед каждой серией, без включения в статистику.`,
    `- Измерения: ${data.iterations} повторений каждого метода при каждом размере.`,
    '- Для времени использован `performance.now()`.',
    '- При добавлении измеряется вся операция, включая создание DOM-узлов или формирование строки HTML.',
    '- При удалении одинаковое содержимое заранее создаётся вне измеряемого участка.',
    '- Среднее: сумма измерений, делённая на количество повторений.',
    '- Стандартное отклонение: выборочное, с делителем `n - 1`.',
    '- 95% доверительный интервал: среднее ± `1,96 × s / √n` (нормальная аппроксимация).',
    '- Между сериями были короткие паузы. Контейнер тестирования находится вне видимой области страницы.',
    '',
    '## Результаты',
    '',
    '| Операция | Метод | Элементов | Повторов | Среднее, мс | Ст. отклонение, мс | 95% ДИ, мс |',
    '|---|---|---:|---:|---:|---:|---:|'
  ];
  for (const row of data.results) {
    lines.push(`| ${row.operation} | \`${row.method}\` | ${row.elements} | ${row.count} | ${format(row.mean)} | ${format(row.standardDeviation)} | [${format(row.confidenceLow)}; ${format(row.confidenceHigh)}] |`);
  }
  lines.push('', '## Выводы', '');
  for (const operation of ['Добавление', 'Удаление']) {
    for (const elements of data.sizes) {
      const rows = data.results.filter(row => row.operation === operation && row.elements === elements);
      if (rows.length === 0) { continue; }
      const fastest = findFastest(rows);
      const slowest = [...rows].sort((a, b) => b.mean - a.mean)[0];
      const difference = intervalsDoNotOverlap(fastest, slowest);
      const conclusion = difference
        ? 'По принятому в задании критерию интервалы не пересекаются — различие между этими методами можно считать значимым.'
        : '95% интервалы пересекаются — по упрощённому критерию задания значимость различия не подтверждается.';
      let significantPairs = 0;
      for (let first = 0; first < rows.length; first += 1) {
        for (let second = first + 1; second < rows.length; second += 1) {
          if (intervalsDoNotOverlap(rows[first], rows[second])) { significantPairs += 1; }
        }
      }
      lines.push(`- **${operation.toLowerCase()}, ${elements.toLocaleString('ru-RU')} элементов:** минимальное среднее время у \`${fastest.method}\` — ${format(fastest.mean)} мс; максимальное у \`${slowest.method}\` — ${format(slowest.mean)} мс. ${conclusion} Всего непересекающиеся интервалы обнаружены в ${significantPairs} из 6 попарных сравнений.`);
    }
  }
  lines.push('',
    'Эти результаты относятся к конкретному запуску. На другом устройстве или в другом браузере соотношение может измениться. Непересечение доверительных интервалов — упрощённый критерий из задания, а не полноценный статистический тест.',
    '',
    '## Как повторить эксперимент',
    '',
    '1. Запустите локальный сервер и откройте страницу в режиме инкогнито без расширений.',
    '2. Закройте лишние вкладки и нажмите «Запустить сравнение».',
    '3. Скачайте CSV и Markdown-отчёт; для другого компьютера проведите измерения заново.',
    ''
  );
  return lines.join('\n');
}

export function buildCsv(data) {
  const heading = ['Операция','Метод','Элементов','Повторов','Среднее, мс','Стандартное отклонение, мс','Нижняя граница ДИ, мс','Верхняя граница ДИ, мс'];
  const rows = data.results.map(row => [row.operation, row.method, row.elements, row.count, format(row.mean), format(row.standardDeviation), format(row.confidenceLow), format(row.confidenceHigh)]);
  return [heading, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(';')).join('\n');
}
