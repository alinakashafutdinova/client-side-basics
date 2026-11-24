import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStatistics, intervalsDoNotOverlap, findFastest, formatMilliseconds } from '../src/stats.js';
import { METHODS, SIZES, ITERATIONS, WARMUPS } from '../src/methods.js';
import { buildCsv, buildReport } from '../src/report.js';

test('в списке восемь методов и два размера', () => {
  assert.equal(METHODS.length, 8);
  assert.deepEqual(SIZES, [1000, 10000]);
  assert.equal(METHODS.filter(method => method.kind === 'add').length, 4);
  assert.equal(METHODS.filter(method => method.kind === 'remove').length, 4);
  assert.equal(ITERATIONS, 30);
  assert.equal(WARMUPS, 5);
});

test('среднее и выборочное отклонение рассчитываются правильно', () => {
  const result = calculateStatistics([1, 2, 3]);
  assert.equal(result.mean, 2);
  assert.equal(result.standardDeviation, 1);
  assert.ok(result.confidenceLow < 2);
  assert.ok(result.confidenceHigh > 2);
});

test('одинаковые замеры дают нулевое отклонение', () => {
  const result = calculateStatistics([3, 3, 3, 3]);
  assert.equal(result.standardDeviation, 0);
  assert.equal(result.margin, 0);
});

test('некорректные измерения не принимаются', () => {
  assert.throws(() => calculateStatistics([1]), RangeError);
  assert.throws(() => calculateStatistics([1, -2]), RangeError);
});

test('доверительные интервалы сравниваются по границам', () => {
  assert.equal(intervalsDoNotOverlap({ confidenceLow: 1, confidenceHigh: 2 }, { confidenceLow: 3, confidenceHigh: 4 }), true);
  assert.equal(intervalsDoNotOverlap({ confidenceLow: 1, confidenceHigh: 3 }, { confidenceLow: 2, confidenceHigh: 4 }), false);
});

test('выбирается метод с наименьшим средним', () => {
  assert.equal(findFastest([{ mean: 10, id: 'a' }, { mean: 2, id: 'b' }]).id, 'b');
  assert.equal(formatMilliseconds(0.12345), '0.123');
});

test('CSV и отчёт содержат данные измерений', () => {
  const samples = [1, 2, 3];
  const row = { id: 'appendChild', method: 'appendChild()', operation: 'Добавление', elements: 1000, samples, ...calculateStatistics(samples) };
  const data = { timestamp: '2026-11-24T00:00:00.000Z', userAgent: 'Chromium test', sizes: [1000], warmups: 5, iterations: 3, results: [row] };
  assert.match(buildCsv(data), /appendChild/);
  assert.match(buildReport(data), /Стандартное отклонение/);
});
