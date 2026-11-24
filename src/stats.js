// Среднее, выборочное стандартное отклонение и доверительный интервал.
// Для 95% интервала по заданию используется коэффициент 1,96.
export const CONFIDENCE_COEFFICIENT = 1.96;

export function calculateStatistics(samples) {
  if (!Array.isArray(samples) || samples.length < 2 || samples.some(value => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('Для расчёта нужны минимум два корректных замера');
  }
  const count = samples.length;
  const mean = samples.reduce((sum, value) => sum + value, 0) / count;
  const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1);
  const standardDeviation = Math.sqrt(variance);
  const margin = CONFIDENCE_COEFFICIENT * standardDeviation / Math.sqrt(count);
  return {
    count,
    mean,
    standardDeviation,
    confidenceLow: Math.max(0, mean - margin),
    confidenceHigh: mean + margin,
    margin
  };
}

export function intervalsDoNotOverlap(first, second) {
  return first.confidenceHigh < second.confidenceLow || second.confidenceHigh < first.confidenceLow;
}

export function formatMilliseconds(value) {
  return Number(value).toFixed(3);
}

export function findFastest(rows) {
  return rows.reduce((best, row) => (!best || row.mean < best.mean ? row : best), null);
}
