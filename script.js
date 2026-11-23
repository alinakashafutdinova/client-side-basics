'use strict';

// 1. Треугольник
function calculateTriangle(a, b, c) {
  const sides = [a, b, c];
  const validSides = sides.every(side => Number.isFinite(side) && side > 0);

  // Треугольник существует, если сумма любых двух сторон больше третьей.
  if (!validSides || a + b <= c || a + c <= b || b + c <= a) {
    return null;
  }

  const perimeter = a + b + c;
  const halfPerimeter = perimeter / 2;
  const area = Math.sqrt(
    halfPerimeter *
    (halfPerimeter - a) *
    (halfPerimeter - b) *
    (halfPerimeter - c)
  );

  return {
    perimeter: perimeter,
    area: area,
    ratio: perimeter / area
  };
}

function printTriangle(a, b, c) {
  const triangle = calculateTriangle(a, b, c);

  if (triangle === null) {
    console.log('треугольника не существует');
    return;
  }

  // Округляю только вывод: сами вычисления остаются без округления.
  console.log(
    `треугольник существует\n` +
    `периметр = ${triangle.perimeter}\n` +
    `площадь = ${Number(triangle.area.toFixed(2))}\n` +
    `соотношение = ${Number(triangle.ratio.toFixed(2))}`
  );
}

// 2. Fizz-Buzz
function fizzBuzz(limit) {
  for (let number = 0; number <= limit; number++) {
    if (number !== 0 && number % 5 === 0) {
      console.log(`${number} fizz buzz`);
    } else if (number % 2 === 0) {
      // Для 0 по образцу из задания должно выводиться «buzz».
      console.log(`${number} buzz`);
    } else {
      console.log(`${number} fizz`);
    }
  }
}

// 3. Ёлка
function makeTree(height) {
  const rows = [];

  for (let row = 1; row <= height; row++) {
    const symbol = row % 2 === 1 ? '*' : '#';
    rows.push(symbol.repeat(row));
  }

  rows.push('||');
  return rows.join('\n');
}

// 4. Деление
function isDivisible(n, x, y) {
  return n % x === 0 && n % y === 0;
}

// 5. Сэндвичи с сыром
function countSandwiches(ingredients) {
  const { bread, cheese } = ingredients;
  return Math.min(Math.floor(bread / 2), Math.floor(cheese));
}

// 6. Абсолютное значение
function absValue(number) {
  return number < 0 ? -number : number;
}

// 7. Конвертация температуры
function convertTemperature(temperature, direction) {
  switch (direction) {
    case 'toC': {
      const celsius = (temperature - 32) * 5 / 9;
      return `${Number(celsius.toFixed(2))} C`;
    }
    case 'toF': {
      const fahrenheit = temperature * 9 / 5 + 32;
      return `${Number(fahrenheit.toFixed(2))} F`;
    }
    default:
      throw new Error('Неизвестное направление преобразования температуры');
  }
}

// 8. Случайные числа
function randomNumber(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError('Нужно указать целые числа, причём min не больше max');
  }

  // Прибавляю 1, чтобы верхняя граница тоже могла выпасть.
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 9. Значения из массива
function sampleArray(array, count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Количество элементов должно быть целым неотрицательным числом');
  }
  if (count > 0 && array.length === 0) {
    throw new RangeError('Нельзя выбрать элементы из пустого массива');
  }

  const result = [];

  for (let i = 0; i < count; i++) {
    const index = randomNumber(0, array.length - 1);
    // Один и тот же элемент может встретиться несколько раз — как в примере.
    result.push(array[index]);
  }

  return result;
}

// 10. Фильтрация массива
function myFilterArray(array, predicate) {
  const result = [];

  for (const element of array) {
    if (predicate(element)) {
      result.push(element);
    }
  }

  return result;
}

// 11. Равенство чисел с плавающей запятой
function toBeCloseTo(num1, num2) {
  if (num1 === num2) {
    return true;
  }
  if (!Number.isFinite(num1) || !Number.isFinite(num2)) {
    return false;
  }

  // Учитываю погрешность хранения дробных чисел в JavaScript.
  const difference = Math.abs(num1 - num2);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(num1), Math.abs(num2));
  return difference <= tolerance;
}

// Проверочные примеры для всех заданий. Результаты видно в консоли браузера.
console.group('Лабораторная работа №1. JavaScript: синтаксис');

console.group('1. Треугольник');
printTriangle(3, 4, 5);
printTriangle(1, 2, 3);
console.groupEnd();

console.group('2. Fizz-Buzz (от 0 до 10)');
fizzBuzz(10);
console.groupEnd();

console.group('3. Ёлка высотой 12 строк');
console.log(makeTree(12));
console.groupEnd();

console.group('4. Деление');
for (const [n, x, y] of [[3, 1, 3], [12, 2, 6], [100, 5, 3], [12, 7, 5]]) {
  console.log(`n = ${n}, x = ${x}, y = ${y} => ${isDivisible(n, x, y)}`);
}
console.groupEnd();

console.group('5. Сэндвичи с сыром');
console.log('countSandwiches({bread: 5, cheese: 6}) ->', countSandwiches({ bread: 5, cheese: 6 }));
console.groupEnd();

console.group('6. Абсолютное значение');
for (const value of [-2, 100, 0]) {
  console.log(`absValue(${value}) -> ${absValue(value)}`);
}
console.groupEnd();

console.group('7. Конвертация температуры');
console.log("convertTemperature(32, 'toC') ->", convertTemperature(32, 'toC'));
console.log("convertTemperature(10, 'toF') ->", convertTemperature(10, 'toF'));
console.groupEnd();

console.group('8. Случайные числа');
console.log('randomNumber(0, 10) ->', randomNumber(0, 10));
console.log('randomNumber(-10, 10) ->', randomNumber(-10, 10));
console.groupEnd();

console.group('9. Значения из массива');
console.log('sampleArray([1, 2, 3, 4], 2) ->', sampleArray([1, 2, 3, 4], 2));
console.log('sampleArray([1, 2, 3, 4], 3) ->', sampleArray([1, 2, 3, 4], 3));
console.groupEnd();

console.group('10. Фильтрация массива');
function isFirstV(name) {
  return name.startsWith('V');
}
console.log("myFilterArray(['Short', 'VeryLong'], isFirstV) ->", myFilterArray(['Short', 'VeryLong'], isFirstV));
console.groupEnd();

console.group('11. Равенство чисел с плавающей запятой');
console.log('toBeCloseTo(0.1 + 0.2, 0.3) ->', toBeCloseTo(0.1 + 0.2, 0.3));
console.log('toBeCloseTo(0.3, 0.31) ->', toBeCloseTo(0.3, 0.31));
console.groupEnd();

console.groupEnd();
