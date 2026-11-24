import { METHODS, SIZES, ITERATIONS, WARMUPS, prepareContainer, getMarkup, checkResult } from './methods.js';
import { calculateStatistics } from './stats.js';

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function measureOnce(container, method, count, markup) {
  prepareContainer(container, method, count, markup);
  const started = performance.now();
  method.execute(container, count);
  const duration = performance.now() - started;
  // Проверка результата идёт ПОСЛЕ измерения, чтобы не искажать время.
  checkResult(container, method, count);
  container.replaceChildren();
  return duration;
}

export async function runBenchmark(container, progressCallback) {
  const results = [];
  const total = METHODS.length * SIZES.length * ITERATIONS;
  let completed = 0;

  try {
    for (const count of SIZES) {
      const markup = getMarkup(count);
      // Меняю очередность методов для разных размеров, чтобы снизить влияние порядка.
      const methods = count === SIZES[0] ? METHODS : [...METHODS].reverse();

      for (const method of methods) {
        progressCallback({ completed, total, method, count });
        for (let index = 0; index < WARMUPS; index += 1) {
          measureOnce(container, method, count, markup);
        }
        await pause(15);

        const samples = [];
        for (let index = 0; index < ITERATIONS; index += 1) {
          samples.push(measureOnce(container, method, count, markup));
          completed += 1;
          if (completed % 5 === 0) {
            progressCallback({ completed, total, method, count });
            // Делаю небольшую паузу, чтобы интерфейс не зависал на всё время теста.
            await pause(5);
          }
        }
        results.push({ id: method.id, method: method.label, operation: method.operation, elements: count, samples, ...calculateStatistics(samples) });
        await pause(35);
      }
    }
  } finally {
    container.replaceChildren();
  }

  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    warmups: WARMUPS,
    iterations: ITERATIONS,
    sizes: [...SIZES],
    results
  };
}
